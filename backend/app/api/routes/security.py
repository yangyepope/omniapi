"""security-platform security console — routes the React frontend hits.

These routes are the operator-facing UI for the gitlab-scanner data.
Auth: same JWT + RBAC as the rest of security-platform.
Forwarding: every endpoint here delegates to `ScannerClient` (HTTP
REST call to gitlab-scanner's /api/admin/* surface).

Why this proxy layer instead of letting the React app call scanner
directly?

  - **End users never see the SCANNER_ADMIN_TOKEN**. security-platform backend
    holds it; React never sees it.
  - **RBAC + audit log live here**. We can refuse triage from users
    without the right permission, and log who did what.
  - **`by` field is forced to the authenticated user**. Even if a
    malicious frontend sends `by=admin`, we overwrite with `current_user`.
  - **Future**: we can cache stats, add custom views, or augment scanner
    data with security-platform-side business fields (JIRA ticket, owner team, ...)
    without scanner caring.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser
from app.services.scanner_client import ScannerClient, TriageAction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/security", tags=["security"])


# ── request / response models ────────────────────────────────────────


class TriageBody(BaseModel):
    action: TriageAction
    reason: str | None = Field(
        default=None,
        description="Free-text note. For 'fp', this is what AI sees next scan.",
    )


# ── helper: scanner client lifecycle ─────────────────────────────────


async def _call_scanner(coro):
    """Wrap a ScannerClient coroutine; convert httpx errors into
    HTTPException with sensible status codes for the frontend."""
    try:
        return await coro
    except httpx.HTTPStatusError as e:
        # Forward scanner's status code where useful (404 → 404, 401 → 502
        # because that means OUR config is wrong, not the user's fault).
        if e.response.status_code in (400, 404, 422):
            raise HTTPException(
                status_code=e.response.status_code,
                detail=e.response.text[:500],
            ) from e
        if e.response.status_code in (401, 403):
            logger.error(
                "scanner refused our admin token — check SCANNER_ADMIN_TOKEN: %s",
                e.response.text[:200],
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="downstream scanner refused security-platform credentials",
            ) from e
        if e.response.status_code == 503:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="scanner admin API not configured",
            ) from e
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"scanner returned {e.response.status_code}",
        ) from e
    except httpx.HTTPError as e:
        logger.exception("scanner network error")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"scanner unreachable: {type(e).__name__}",
        ) from e


# ── stats / dashboard ─────────────────────────────────────────────────


@router.get("/stats")
async def get_stats(current_user: CurrentUser) -> dict[str, Any]:
    """Dashboard totals (totals + by_severity + by_engine + by_status)."""
    async with ScannerClient() as client:
        return await _call_scanner(client.stats())


@router.get("/stats/trend")
async def get_stats_trend(
    current_user: CurrentUser,
    days: int = Query(default=7, ge=1, le=90),
) -> dict[str, Any]:
    """Per-day new/closed/open series for the trend chart."""
    async with ScannerClient() as client:
        return await _call_scanner(client.stats_trend(days=days))


@router.get("/categories")
async def get_categories(
    current_user: CurrentUser,
    dimension: Literal["owasp", "cwe", "engine", "rule_namespace"] = Query(
        default="owasp",
    ),
    service: str | None = Query(default=None),
    top: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    """Aggregate findings by OWASP / CWE / engine / rule_namespace."""
    async with ScannerClient() as client:
        return await _call_scanner(client.categories(
            dimension=dimension, service=service, top=top,
        ))


@router.get("/verifier-stats")
async def get_verifier_stats(
    current_user: CurrentUser,
    service: str | None = Query(default=None),
) -> dict[str, Any]:
    """AI verifier effectiveness — refute counts + FP-suppression rate."""
    async with ScannerClient() as client:
        return await _call_scanner(client.verifier_stats(service=service))


@router.get("/finding-review-stats")
async def get_finding_review_stats(
    current_user: CurrentUser,
    service: str | None = Query(default=None),
) -> dict[str, Any]:
    """AI post-process review effectiveness — FP rate / auto-closed / by-engine."""
    async with ScannerClient() as client:
        return await _call_scanner(client.finding_review_stats(service=service))


@router.get("/cost-stats")
async def get_cost_stats(
    current_user: CurrentUser,
    service: str | None = Query(default=None),
    days: int | None = Query(default=None, ge=1, le=365),
) -> dict[str, Any]:
    """Per-engine AI token usage + wall-clock timing (scanner FEAT-009)."""
    async with ScannerClient() as client:
        return await _call_scanner(client.cost_stats(service=service, days=days))


@router.get("/cost-runs")
async def get_cost_runs(
    current_user: CurrentUser,
    service: str | None = Query(default=None),
    days: int | None = Query(default=None, ge=1, le=365),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[dict[str, Any]]:
    """单次扫描成本明细(scanner FEAT-009 三级下钻·第三级)。

    透传 scanner /api/admin/cost-runs:返回最近 limit 次有成本记录的扫描,
    每条含该次逐引擎 token/耗时明细。
    """
    async with ScannerClient() as client:
        return await _call_scanner(
            client.cost_runs(service=service, days=days, limit=limit),
        )


# ── runtime config (scanner FEAT-008) ────────────────────────────────


class ConfigUpdateBody(BaseModel):
    updates: dict[str, Any] = Field(
        description="Settings field name → new value. Validated by scanner "
        "against each field's type/constraints (all-or-nothing).",
    )


@router.get("/config")
async def get_scanner_config(current_user: CurrentUser) -> dict[str, Any]:
    """Scanner runtime config — every configurable field with current value,
    category, is_overridden and requires_restart flags. Internal platform:
    values (including tokens) are returned in plaintext."""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_config())


@router.put("/config")
async def update_scanner_config(
    body: ConfigUpdateBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Persist + hot-apply scanner config overrides.

    `updated_by` is forced to the authenticated user (same audit rule as
    triage) — never taken from the request body. Scanner validates every
    key/value and 400s the whole batch on any bad entry.
    """
    if not body.updates:
        raise HTTPException(status_code=400, detail="updates 不能为空")
    async with ScannerClient() as client:
        return await _call_scanner(client.update_config(
            body.updates,
            updated_by=current_user.email or str(current_user.id),
        ))


@router.delete("/config/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scanner_config(
    key: str,
    current_user: CurrentUser,
) -> None:
    """Drop one config override so the field falls back to env/default.

    404 passes through when no override exists for the key.
    """
    async with ScannerClient() as client:
        await _call_scanner(client.delete_config(key))


# ── interfaces (#193) ────────────────────────────────────────────────


@router.get("/services/{name}/interfaces")
async def list_service_interfaces(
    name: str,
    current_user: CurrentUser,
    risk_level: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    """All discovered HTTP/Feign interfaces for one service."""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_service_interfaces(
            name, risk_level=risk_level,
        ))


@router.get("/interfaces/{interface_id}")
async def get_interface(
    interface_id: int,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Single interface + its related findings."""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_interface(interface_id))


# ── MCP server introspection (#193c) ────────────────────────────────


@router.get("/mcp/status")
async def mcp_status(current_user: CurrentUser) -> dict[str, Any]:
    """Tell the console whether MCP is mounted + list available tools.

    Used by the front-end's MCP integration panel to render server
    state and the Claude Desktop config snippet. Does NOT leak the
    bearer token — that's set by ops out-of-band.
    """
    from app.core.config import settings as _s
    has_token = bool(getattr(_s, "SECURITY_PLATFORM_MCP_TOKEN", None))
    mcp_pkg_available = True
    tools: list[dict[str, str]] = []
    error: str | None = None
    if has_token:
        try:
            from app.mcp.scanner_mcp_server import mcp as _mcp
            # FastMCP exposes registered tools via list_tools() — async.
            registered = await _mcp.list_tools()
            tools = [
                {"name": t.name, "description": (t.description or "").strip()}
                for t in registered
            ]
        except ModuleNotFoundError as e:
            mcp_pkg_available = False
            error = f"mcp package not installed: {e}"
        except Exception as e:
            error = f"{type(e).__name__}: {e}"
    return {
        "mounted": has_token and mcp_pkg_available and not error,
        "has_token": has_token,
        "mcp_package_installed": mcp_pkg_available,
        "endpoint": (
            "/mcp/sse" if (has_token and mcp_pkg_available and not error)
            else None
        ),
        "tool_count": len(tools),
        "tools": tools,
        "error": error,
    }


# ── services ──────────────────────────────────────────────────────────


@router.get("/services")
async def list_services(current_user: CurrentUser) -> list[dict[str, Any]]:
    """List services from scanner's manifest with open/closed counts."""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_services())


@router.get("/services/{name}/scan-runs")
async def list_scan_runs(
    name: str,
    current_user: CurrentUser,
    limit: int = Query(default=20, ge=1, le=200),
) -> list[dict[str, Any]]:
    """Scan history for one service."""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_scan_runs(name, limit=limit))


@router.get("/services/{name}/scan-runs/{run_id}")
async def get_scan_run(
    name: str,
    run_id: int,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """One scan run's full detail — current stage, phase timeline, heartbeat
    liveness, and per-engine breakdown. Console polls this (fast while the run
    is running) to show live scan progress (FEAT-011)."""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_scan_run(name, run_id))


@router.get("/services/{name}/source-cache")
async def list_source_cache(
    name: str,
    current_user: CurrentUser,
) -> list[dict[str, Any]]:
    """Cached pulled-code SHAs for a service (FEAT-012)."""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_source_cache(name))


@router.delete("/services/{name}/source-cache/{sha}")
async def evict_source_cache(
    name: str,
    sha: str,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Evict a cached checkout + clear that sha's resume state so the next
    scan re-pulls and re-scans from scratch (FEAT-012). Inactive users blocked
    (mutating action)."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="inactive user",
        )
    async with ScannerClient() as client:
        return await _call_scanner(client.evict_source_cache(name, sha))


@router.get("/scan-runs")
async def list_all_scan_runs(
    current_user: CurrentUser,
    limit_per_service: int = Query(default=20, ge=1, le=200),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="按状态过滤:running | completed | failed | aborted",
    ),
) -> list[dict[str, Any]]:
    """全局扫描任务总览:并发拉取所有服务的 scan-runs 后合并。

    外部 gitlab-scanner 只暴露 per-service 的 `/api/admin/services/{name}/scan-runs`,
    没有跨服务的任务列表接口。这里在服务端 fan-out(asyncio.gather),既避免前端
    N+1 请求,又不依赖 scanner 未验证的全局端点。单个服务拉取失败只跳过该服务,
    不拖垮整体(return_exceptions=True)。
    """
    # 先拿服务清单;这一跳失败(scanner 不可达/鉴权错)直接透传错误给前端
    async with ScannerClient() as client:
        services = await _call_scanner(client.list_services())
        # 只保留有 name 的服务,避免脏数据触发 KeyError
        names = [s["name"] for s in services if s.get("name")]
        # 并发拉取每个服务的扫描历史,个别失败不影响其余
        results = await asyncio.gather(
            *(
                client.list_scan_runs(n, limit=limit_per_service)
                for n in names
            ),
            return_exceptions=True,
        )

    runs: list[dict[str, Any]] = []
    for name, res in zip(names, results, strict=True):
        # 某个服务拉取失败:记日志跳过,不抛错(总览页要尽量多展示)
        if isinstance(res, Exception):
            logger.warning("拉取服务 %s 的 scan-runs 失败:%s", name, res)
            continue
        for run in res:
            # 防御性注入 service_name:前端表格按服务展示/筛选依赖此字段,
            # 即便 scanner 的 per-service 响应里没带上也不会缺列
            run.setdefault("service_name", name)
            runs.append(run)

    # 状态过滤放在合并后统一做,语义清晰
    if status_filter:
        runs = [r for r in runs if r.get("status") == status_filter]

    # 按开始时间倒序:最新的任务排最前(started_at 为 ISO 字符串,可字典序比较)
    runs.sort(key=lambda r: r.get("started_at") or "", reverse=True)
    return runs


@router.post("/services/{name}/scan")
async def trigger_scan(
    name: str,
    current_user: CurrentUser,
    ref: str = Query(default="main"),
    sha: str | None = Query(default=None),
) -> dict[str, Any]:
    """Trigger an on-demand scan for the given service.

    TODO: gate with a `security:scan` permission once RBAC matures.
    """
    if not current_user.is_active:
        raise HTTPException(403, "inactive user")
    async with ScannerClient() as client:
        return await _call_scanner(client.trigger_scan(
            service=name, ref=ref, sha=sha,
        ))


# ── findings ─────────────────────────────────────────────────────────


@router.get("/findings")
async def list_findings(
    current_user: CurrentUser,
    service: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None,
        description="open | closed"),
    engine: str | None = Query(default=None),
    rule_prefix: str | None = Query(default=None),
    recent_runs: int | None = Query(default=None,
        description="仅看最近 N 次扫描的 findings,需与 service 同时给出"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    sort: str = Query(default="-id"),
) -> dict[str, Any]:
    """List findings — main triage table view."""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_findings(
            service=service, severity=severity, status=status,
            engine=engine, rule_prefix=rule_prefix, recent_runs=recent_runs,
            limit=limit, offset=offset, sort=sort,
        ))


@router.get("/findings/{finding_id}")
async def get_finding(
    finding_id: int,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Full finding detail — includes verifier reasoning when present."""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_finding(finding_id))


@router.post("/findings/{finding_id}/triage")
async def triage_finding(
    finding_id: int,
    payload: TriageBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Mark a finding fp / fixed / wontfix / suppressed / duplicate / reopen.

    `by` is forced to current_user.email (or username if available) —
    we do NOT trust any field from the frontend for attribution.

    For 'fp', the operator's `reason` is what gitlab-scanner's AI
    sees next scan via the historical-FP feedback loop (#177). So
    reasons should be precise and actionable, e.g.
    "single-admin model — BOLA inapplicable" not "误报".
    """
    if not current_user.is_active:
        raise HTTPException(403, "inactive user")
    # TODO: real RBAC — e.g. require security:triage role
    by = getattr(current_user, "email", None) or str(current_user.id)
    logger.info(
        "security triage: user=%s finding=%d action=%s",
        by, finding_id, payload.action,
    )
    async with ScannerClient() as client:
        return await _call_scanner(client.triage_finding(
            finding_id=finding_id,
            action=payload.action,
            reason=payload.reason,
            by=by,
        ))

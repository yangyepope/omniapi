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
        # 409:重名冲突(新增自定义规则 / 手工知识文档),必须原样透传给前端做
        # 「重名」提示,否则会被下面的兜底吞成 502。
        if e.response.status_code in (400, 404, 409, 422):
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
async def get_stats(
    current_user: CurrentUser,
    project: str | None = Query(default=None,
        description="多项目隔离(scanner FEAT-025);不传=全部项目"),
) -> dict[str, Any]:
    """Dashboard totals (totals + by_severity + by_engine + by_status)."""
    async with ScannerClient() as client:
        return await _call_scanner(client.stats(project=project))


@router.get("/stats/trend")
async def get_stats_trend(
    current_user: CurrentUser,
    days: int = Query(default=7, ge=1, le=90),
    project: str | None = Query(default=None),
) -> dict[str, Any]:
    """Per-day new/closed/open series for the trend chart."""
    async with ScannerClient() as client:
        return await _call_scanner(client.stats_trend(days=days, project=project))


@router.get("/categories")
async def get_categories(
    current_user: CurrentUser,
    dimension: Literal["owasp", "cwe", "engine", "rule_namespace"] = Query(
        default="owasp",
    ),
    service: str | None = Query(default=None),
    top: int = Query(default=20, ge=1, le=100),
    project: str | None = Query(default=None),
) -> dict[str, Any]:
    """Aggregate findings by OWASP / CWE / engine / rule_namespace."""
    async with ScannerClient() as client:
        return await _call_scanner(client.categories(
            dimension=dimension, service=service, top=top, project=project,
        ))


@router.get("/verifier-stats")
async def get_verifier_stats(
    current_user: CurrentUser,
    service: str | None = Query(default=None),
    project: str | None = Query(default=None),
) -> dict[str, Any]:
    """AI verifier effectiveness — refute counts + FP-suppression rate."""
    async with ScannerClient() as client:
        return await _call_scanner(client.verifier_stats(
            service=service, project=project,
        ))


@router.get("/finding-review-stats")
async def get_finding_review_stats(
    current_user: CurrentUser,
    service: str | None = Query(default=None),
    project: str | None = Query(default=None),
) -> dict[str, Any]:
    """AI post-process review effectiveness — FP rate / auto-closed / by-engine."""
    async with ScannerClient() as client:
        return await _call_scanner(client.finding_review_stats(
            service=service, project=project,
        ))


@router.get("/cost-stats")
async def get_cost_stats(
    current_user: CurrentUser,
    service: str | None = Query(default=None),
    days: int | None = Query(default=None, ge=1, le=365),
    project: str | None = Query(default=None),
) -> dict[str, Any]:
    """Per-engine AI token usage + wall-clock timing (scanner FEAT-009)."""
    async with ScannerClient() as client:
        return await _call_scanner(client.cost_stats(
            service=service, days=days, project=project,
        ))


@router.get("/cost-runs")
async def get_cost_runs(
    current_user: CurrentUser,
    service: str | None = Query(default=None),
    days: int | None = Query(default=None, ge=1, le=365),
    limit: int = Query(default=50, ge=1, le=200),
    project: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    """单次扫描成本明细(scanner FEAT-009 三级下钻·第三级)。

    透传 scanner /api/admin/cost-runs:返回最近 limit 次有成本记录的扫描,
    每条含该次逐引擎 token/耗时明细。
    """
    async with ScannerClient() as client:
        return await _call_scanner(
            client.cost_runs(
                service=service, days=days, limit=limit, project=project,
            ),
        )


# ── runtime config (scanner FEAT-008) ────────────────────────────────


class ConfigUpdateBody(BaseModel):
    updates: dict[str, Any] = Field(
        description="Settings field name → new value. Validated by scanner "
        "against each field's type/constraints (all-or-nothing).",
    )


# ── AI hunt category / knowledge 请求体(镜像 scanner pydantic，去掉
# category 的 updated_by——由服务端从认证用户注入)────────────────────


class HuntCategoryCreateBody(BaseModel):
    """新增自定义 AI 扫描规则。name / system_prompt / user_prompt_template
    必填,其余可选(默认见字段)。updated_by 不在此——服务端注入。"""
    name: str = Field(min_length=1, max_length=128)
    system_prompt: str = Field(min_length=1)
    user_prompt_template: str = Field(min_length=1)
    prompt_version: str = "v1"
    enabled: bool = True
    is_llm_category: bool = False
    skill_subdomains: list[str] = []
    mitre_attack_techniques: list[str] = []
    nist_csf_subcategories: list[str] = []
    d3fend_techniques: list[str] = []
    skill_keywords: list[str] = []
    owasp_refs: list[str] = []
    cwes: list[str] = []
    asvs_chapters: list[str] = []


class HuntCategoryUpdateBody(BaseModel):
    """部分更新——只传要改的字段。name / source 不可改;builtin 可编辑/启停
    但不可改名删除。updated_by 服务端注入。"""
    enabled: bool | None = None
    system_prompt: str | None = Field(default=None, min_length=1)
    user_prompt_template: str | None = Field(default=None, min_length=1)
    prompt_version: str | None = None
    is_llm_category: bool | None = None
    skill_subdomains: list[str] | None = None
    mitre_attack_techniques: list[str] | None = None
    nist_csf_subcategories: list[str] | None = None
    d3fend_techniques: list[str] | None = None
    skill_keywords: list[str] | None = None
    owasp_refs: list[str] | None = None
    cwes: list[str] | None = None
    asvs_chapters: list[str] | None = None
    sort_order: int | None = None


class KnowledgeCreateBody(BaseModel):
    """手工新增知识文档。classification 默认 ai_context(即纳入 AI 扫描)。"""
    sha: str = Field(min_length=1)
    doc_path: str = Field(min_length=1)
    content: str
    classification: str = "ai_context"


class KnowledgeUpdateBody(BaseModel):
    """改 content / classification——只传要改的。"""
    content: str | None = None
    classification: str | None = None


class CustomRuleCreateBody(BaseModel):
    """新增自定义参考规则。rule_id / title / description 必填。updated_by
    不在此——服务端注入。填 cwes/owasp_refs/asvs_refs 才会被相应 category 采用。"""
    rule_id: str = Field(min_length=1, max_length=128)
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    license: str = ""
    enabled: bool = True
    cwes: list[str] = []
    owasp_refs: list[str] = []
    asvs_refs: list[str] = []
    languages: list[str] = []
    severity: str | None = None
    level: str | None = None
    source_url: str | None = None


class CustomRuleUpdateBody(BaseModel):
    """部分更新——只传要改的。rule_id 不可改(path)。updated_by 服务端注入。"""
    title: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, min_length=1)
    license: str | None = None
    enabled: bool | None = None
    cwes: list[str] | None = None
    owasp_refs: list[str] | None = None
    asvs_refs: list[str] | None = None
    languages: list[str] | None = None
    severity: str | None = None
    level: str | None = None
    source_url: str | None = None


class InterfaceProfileBody(BaseModel):
    """改接口业务画像——部分更新。编辑任一画像字段 scanner 会自动置
    human_locked=True;想交还 AI 显式传 human_locked=False。"""
    business_summary: str | None = None
    sensitivity: str | None = None
    op_type: str | None = None
    risk_level: str | None = None
    description: str | None = None
    human_locked: bool | None = None


class ServiceProfileBody(BaseModel):
    """服务级业务画像 upsert。scanner 端全量覆盖(非 partial),两字段一起提交。
    updated_by 服务端注入。"""
    business_summary: str | None = None
    description: str | None = None


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


@router.get("/engines")
async def list_engines(current_user: CurrentUser) -> dict[str, Any]:
    """Read-only catalog of scan engines (scanner DISC-004). Global — engines
    are not per-project. Each item carries name/display/kind/enabled/
    binary_present/optional/config_keys; the console renders the roster from
    this (never hard-codes it) so engines added in scanner code appear here."""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_engines())


# ── system profile (系统画像 / FEAT) ──────────────────────────────────


@router.get("/services/{name}/system-profile")
async def get_system_profile(
    name: str,
    current_user: CurrentUser,
    sha: str | None = Query(default=None),
    project: str | None = Query(default=None),
) -> dict[str, Any]:
    """The service's system-level profile — framework/tech-flow/attack-surface
    aggregate (references interfaces) / risk aggregate (references findings) +
    an AI narrative. Latest when `sha` omitted; 404 when never profiled."""
    async with ScannerClient() as client:
        return await _call_scanner(
            client.get_system_profile(name, sha=sha, project=project),
        )


@router.get("/services/{name}/system-profile/history")
async def system_profile_history(
    name: str,
    current_user: CurrentUser,
    project: str | None = Query(default=None),
) -> dict[str, Any]:
    """All profiled shas for a service, newest first."""
    async with ScannerClient() as client:
        return await _call_scanner(
            client.system_profile_history(name, project=project),
        )


@router.post("/services/{name}/system-profile/regenerate")
async def regenerate_system_profile(
    name: str,
    current_user: CurrentUser,
    project: str | None = Query(default=None),
) -> dict[str, Any]:
    """Refresh the latest profile's aggregates + AI narrative in place
    (source-free). 404 when the service has never been profiled."""
    async with ScannerClient() as client:
        return await _call_scanner(
            client.regenerate_system_profile(name, project=project),
        )


@router.get("/projects/{key}/system-profile")
async def project_system_profile(
    key: str,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """项目级系统画像 rollup —— 整个项目(所有服务)的技术栈/流程/暴露面/
    风险/渗透视角聚合。实时聚合,不落表。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.project_system_profile(key))


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
async def list_services(
    current_user: CurrentUser,
    project: str | None = Query(default=None,
        description="多项目隔离(scanner FEAT-025);不传=全部项目"),
) -> list[dict[str, Any]]:
    """List services from scanner's manifest with open/closed counts."""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_services(project=project))


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


# ── DAST(动态扫描,scanner FEAT-033~036)──────────────────────────────
# scanner 侧带外主动扫描:列表只读;触发是变更动作(会真的去打目标),
# 故触发需 active 用户,授权范围由 scanner 的 scope 门二次把关。


@router.get("/services/{name}/dast-runs")
async def list_dast_runs(
    name: str,
    current_user: CurrentUser,
    project: str | None = Query(default=None,
        description="多项目隔离(scanner ADR-0019):同名跨项目时用它消歧"),
    limit: int = Query(default=20, ge=1, le=200),
) -> dict[str, Any]:
    """某服务的 DAST 扫描历史(新→旧)。返回 {total, items:[...]}。"""
    async with ScannerClient() as client:
        return await _call_scanner(
            client.list_dast_runs(name, project=project, limit=limit)
        )


@router.post("/services/{name}/dast-scan")
async def trigger_dast_scan(
    name: str,
    current_user: CurrentUser,
    project: str | None = Query(default=None,
        description="服务所属项目;同名跨项目时必填以消歧"),
) -> dict[str, Any]:
    """触发某服务的带外 DAST 扫描。立即返回 {service, project, accepted};
    未授权目标由 scanner 落一条 skipped run(带原因),不是静默 no-op。
    变更动作 → inactive 用户拒绝。"""
    if not current_user.is_active:
        raise HTTPException(403, "inactive user")
    async with ScannerClient() as client:
        return await _call_scanner(
            client.trigger_dast_scan(name, project=project)
        )


# ── Ops: rebuild + redeploy scanner (internal tool) ──────────────────
# INTERNAL ONLY. Rebuilds + restarts the scanner container via docker.sock.
# No extra RBAC (product decision); do not expose backend to untrusted nets.


@router.post("/ops/scanner/redeploy")
async def ops_redeploy_scanner(current_user: CurrentUser) -> dict[str, Any]:
    """Kick a background `docker compose build scanner && up -d scanner`.
    Idempotent while running (returns already_running). Poll
    GET /ops/scanner/status for progress + logs."""
    if not current_user.is_active:
        raise HTTPException(403, "inactive user")
    from app.services import ops_runner
    return await ops_runner.redeploy_scanner()


@router.get("/ops/scanner/status")
async def ops_scanner_status(current_user: CurrentUser) -> dict[str, Any]:
    """Current/last scanner redeploy status + tail of build logs."""
    from app.services import ops_runner
    return ops_runner.get_status()


@router.get("/scan-runs")
async def list_all_scan_runs(
    current_user: CurrentUser,
    limit_per_service: int = Query(default=20, ge=1, le=200),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="按状态过滤:running | completed | failed | aborted",
    ),
    project: str | None = Query(default=None,
        description="多项目隔离(scanner FEAT-025):只看该项目下服务的扫描"),
) -> list[dict[str, Any]]:
    """全局扫描任务总览:并发拉取所有服务的 scan-runs 后合并。

    外部 gitlab-scanner 只暴露 per-service 的 `/api/admin/services/{name}/scan-runs`,
    没有跨服务的任务列表接口。这里在服务端 fan-out(asyncio.gather),既避免前端
    N+1 请求,又不依赖 scanner 未验证的全局端点。单个服务拉取失败只跳过该服务,
    不拖垮整体(return_exceptions=True)。project 非空则只 fan-out 该项目的服务。
    """
    # 先拿服务清单(按项目过滤);这一跳失败(scanner 不可达/鉴权错)直接透传错误给前端
    async with ScannerClient() as client:
        services = await _call_scanner(client.list_services(project=project))
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
    ref: str | None = Query(default=None),
    sha: str | None = Query(default=None),
) -> dict[str, Any]:
    """Trigger an on-demand scan for the given service.

    `ref=None` → scanner uses the service's manifest-configured branch
    (e.g. sts=dev). Pass a ref only to override for a one-off scan.
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
    scan_run_id: int | None = Query(default=None,
        description="仅看该次扫描真实产出(观测到)的 findings(方案 C)"),
    project: str | None = Query(default=None,
        description="多项目隔离:仅看该项目 findings(scanner FEAT-025);"
                    "不传则返回全部(向后兼容)"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    sort: str = Query(default="-id"),
) -> dict[str, Any]:
    """List findings — main triage table view."""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_findings(
            service=service, severity=severity, status=status,
            engine=engine, rule_prefix=rule_prefix, recent_runs=recent_runs,
            scan_run_id=scan_run_id,
            project=project,
            limit=limit, offset=offset, sort=sort,
        ))


@router.get("/services/{name}/finding-runs")
async def list_finding_runs(
    name: str,
    current_user: CurrentUser,
    rule_prefix: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    engine: str | None = Query(default=None),
    limit: int = Query(default=3, ge=1, le=20),
) -> list[dict[str, Any]]:
    """某服务最近 N 次「真实产出过(匹配筛选的)finding」的扫描 + 每次产出条数。
    服务详情页 Findings 标签的扫描切换 pill 用它(方案 C)。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_finding_runs(
            name, rule_prefix=rule_prefix, severity=severity,
            status=status, engine=engine, limit=limit,
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


# ── AI hunt categories(AI 扫描规则,scanner FEAT-018)─────────────────
#
# 改动下次扫描热加载生效(scanner 写库后自动重建扫描器)。updated_by 由认证
# 用户注入(同 triage / config 审计规则),不信任前端传入的归属字段。


@router.get("/ai/categories")
async def list_ai_categories(
    current_user: CurrentUser,
    enabled: bool | None = Query(default=None),
    source: str | None = Query(default=None, description="builtin | custom"),
) -> dict[str, Any]:
    """列出可编辑的 AI 扫描规则(返回 {total, items})。空列表 = scanner 尚未
    seed(正常启动会自动 seed 22 条)。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_hunt_categories(
            enabled=enabled, source=source,
        ))


@router.get("/ai/categories/{name}")
async def get_ai_category(
    name: str, current_user: CurrentUser,
) -> dict[str, Any]:
    """单条规则详情(含完整 system/user prompt)。404 透传。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_hunt_category(name))


@router.post("/ai/categories", status_code=status.HTTP_201_CREATED)
async def create_ai_category(
    body: HuntCategoryCreateBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """新增自定义规则(source=custom)。重名 409 透传。"""
    by = getattr(current_user, "email", None) or str(current_user.id)
    async with ScannerClient() as client:
        return await _call_scanner(client.create_hunt_category(
            body.model_dump(), updated_by=by,
        ))


@router.put("/ai/categories/{name}")
async def update_ai_category(
    name: str,
    body: HuntCategoryUpdateBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """部分更新一条规则(builtin 可编辑/启停,不可改名删除)。只传要改的字段。"""
    by = getattr(current_user, "email", None) or str(current_user.id)
    # exclude_unset:只把前端真正传了的字段发给 scanner(部分更新语义)。
    changes = body.model_dump(exclude_unset=True)
    async with ScannerClient() as client:
        return await _call_scanner(client.update_hunt_category(
            name, changes, updated_by=by,
        ))


@router.delete("/ai/categories/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_category(
    name: str, current_user: CurrentUser,
) -> None:
    """删除自定义规则。builtin 不可删(scanner 返回 400,改用 PUT enabled=false)。"""
    async with ScannerClient() as client:
        await _call_scanner(client.delete_hunt_category(name))


# ── service knowledge docs(项目理解知识,scanner FEAT-018 phase C)────
#
# 只有 classification==ai_context 的文档真正喂给 AI(fed_to_ai)。手工新增/
# 编辑后 human_edited=True,重扫不覆盖。改动下次扫描自然读取。


@router.get("/services/{name}/knowledge")
async def list_service_knowledge(
    name: str,
    current_user: CurrentUser,
    sha: str | None = Query(default=None),
    classification: str | None = Query(default=None),
) -> dict[str, Any]:
    """列出某服务的知识文档(返回 {total, items}),可按 sha / classification 过滤。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_knowledge_docs(
            name, sha=sha, classification=classification,
        ))


@router.get("/knowledge/{doc_id}")
async def get_knowledge_doc(
    doc_id: int, current_user: CurrentUser,
) -> dict[str, Any]:
    """单条知识文档详情(含 markdown content)。404 透传。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_knowledge_doc(doc_id))


@router.post(
    "/services/{name}/knowledge", status_code=status.HTTP_201_CREATED,
)
async def create_knowledge_doc(
    name: str,
    body: KnowledgeCreateBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """手工新增知识文档(source=manual)。(service, sha, doc_path) 重复 409 透传。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.create_knowledge_doc(
            name, body.model_dump(),
        ))


@router.put("/knowledge/{doc_id}")
async def update_knowledge_doc(
    doc_id: int,
    body: KnowledgeUpdateBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """改 content / classification(只传要改的),置 human_edited=True。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.update_knowledge_doc(
            doc_id, body.model_dump(exclude_unset=True),
        ))


@router.delete("/knowledge/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_doc(
    doc_id: int, current_user: CurrentUser,
) -> None:
    """删除一条知识文档。404 透传。"""
    async with ScannerClient() as client:
        await _call_scanner(client.delete_knowledge_doc(doc_id))


# ── AI 参考规则库 / 方法论 skills(scanner FEAT-018 phase B,只读)────
#
# 内置参考规则语料(master_rules ~2038 + ASVS 345)+ 方法论 skills(159)。
# 规则库很大,服务端分页;这些是「规则」,与 ai/categories(审计类别)不同。


@router.get("/ai/rules")
async def list_rules(
    current_user: CurrentUser,
    q: str | None = Query(default=None),
    source: str | None = Query(default=None, description="master_rules | asvs | custom"),
    cwe: str | None = Query(default=None, description="e.g. CWE-89"),
    owasp: str | None = Query(default=None, description="e.g. API01:2023"),
    asvs: str | None = Query(default=None),
    language: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    """规则库分页浏览(返回 {total, limit, offset, items}),可按 CWE/OWASP/ASVS 反查。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_rules(
            q=q, source=source, cwe=cwe, owasp=owasp, asvs=asvs,
            language=language, limit=limit, offset=offset,
        ))


@router.get("/ai/rules/{source}/{rule_id:path}")
async def get_rule(
    source: str, rule_id: str, current_user: CurrentUser,
) -> dict[str, Any]:
    """单条规则详情(含 description / license)。rule_id 可含斜杠。404 透传。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_rule(source, rule_id))


@router.get("/ai/skills")
async def list_skills(
    current_user: CurrentUser,
    q: str | None = Query(default=None),
    subdomain: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    """方法论 skills 分页浏览(返回 {total, limit, offset, items})。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_skills(
            q=q, subdomain=subdomain, tag=tag, limit=limit, offset=offset,
        ))


@router.get("/ai/skills/{skill_id}")
async def get_skill(
    skill_id: str, current_user: CurrentUser,
) -> dict[str, Any]:
    """单条 skill 详情(含方法论全文 body)。404 透传。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_skill(skill_id))


# ── AI 自定义参考规则(scanner FEAT-018 phase B2,CRUD)──────────────
#
# 运营者自建的参考规则,并进规则库(source=custom)并按 CWE/OWASP/ASVS 被
# category 注入。updated_by 由认证用户注入。


@router.get("/ai/custom-rules")
async def list_custom_rules(
    current_user: CurrentUser,
    enabled: bool | None = Query(default=None),
) -> dict[str, Any]:
    """列出自定义规则(含禁用,返回 {total, items})。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_custom_rules(enabled=enabled))


@router.get("/ai/custom-rules/{rule_id}")
async def get_custom_rule(
    rule_id: str, current_user: CurrentUser,
) -> dict[str, Any]:
    """单条自定义规则详情(含 description)。404 透传。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_custom_rule(rule_id))


@router.post("/ai/custom-rules", status_code=status.HTTP_201_CREATED)
async def create_custom_rule(
    body: CustomRuleCreateBody, current_user: CurrentUser,
) -> dict[str, Any]:
    """新增自定义规则。重名 409 透传。"""
    by = getattr(current_user, "email", None) or str(current_user.id)
    async with ScannerClient() as client:
        return await _call_scanner(client.create_custom_rule(
            body.model_dump(), updated_by=by,
        ))


@router.put("/ai/custom-rules/{rule_id}")
async def update_custom_rule(
    rule_id: str, body: CustomRuleUpdateBody, current_user: CurrentUser,
) -> dict[str, Any]:
    """部分更新一条自定义规则(含启停)。只传要改的字段。404 透传。"""
    by = getattr(current_user, "email", None) or str(current_user.id)
    changes = body.model_dump(exclude_unset=True)
    async with ScannerClient() as client:
        return await _call_scanner(client.update_custom_rule(
            rule_id, changes, updated_by=by,
        ))


@router.delete(
    "/ai/custom-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_custom_rule(
    rule_id: str, current_user: CurrentUser,
) -> None:
    """删除一条自定义规则。404 透传。"""
    async with ScannerClient() as client:
        await _call_scanner(client.delete_custom_rule(rule_id))


# ── 项目理解:接口画像 / 服务 profile / ai-context(scanner phase D)──
#
# 编辑接口画像自动锁定(human_locked=True),AI 风险分级不再覆盖;服务
# profile 是服务级业务描述;ai-context 预览 AI 扫描时看到的完整上下文。


@router.put("/interfaces/{interface_id}")
async def update_interface(
    interface_id: int, body: InterfaceProfileBody, current_user: CurrentUser,
) -> dict[str, Any]:
    """改接口业务画像(部分更新)。404 透传。"""
    changes = body.model_dump(exclude_unset=True)
    async with ScannerClient() as client:
        return await _call_scanner(client.update_interface(
            interface_id, changes,
        ))


@router.get("/services/{name}/profile")
async def get_service_profile(
    name: str, current_user: CurrentUser,
) -> dict[str, Any]:
    """服务级 profile(无则返回空字段,不 404)。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_service_profile(name))


@router.put("/services/{name}/profile")
async def update_service_profile(
    name: str, body: ServiceProfileBody, current_user: CurrentUser,
) -> dict[str, Any]:
    """upsert 服务 profile(全量覆盖,两字段一起提交)。"""
    by = getattr(current_user, "email", None) or str(current_user.id)
    async with ScannerClient() as client:
        return await _call_scanner(client.update_service_profile(
            name, body.model_dump(), updated_by=by,
        ))


@router.delete(
    "/services/{name}/profile", status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_service_profile(
    name: str, current_user: CurrentUser,
) -> None:
    """删除服务 profile。404 透传。"""
    async with ScannerClient() as client:
        await _call_scanner(client.delete_service_profile(name))


@router.get("/services/{name}/ai-context")
async def get_ai_context(
    name: str,
    current_user: CurrentUser,
    sha: str | None = Query(default=None),
    project: str | None = Query(default=None,
        description="多项目隔离:按项目定位服务(scanner FEAT-025)"),
) -> dict[str, Any]:
    """预览 AI 扫描时看到的完整上下文(只读)。返回 {service_name, sha, context}。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_ai_context(
            name, sha=sha, project=project,
        ))


# ── 多项目:项目(租户)+ 服务定义 CRUD(scanner FEAT-024/025)───────────
#
# 薄代理:JWT 由本路由校验,ScannerClient 加 X-Admin-Token 打 scanner。
# 业务约束全在 scanner 侧(重名 409 / 跨项目 repo 409 / default 不可删 400),
# 由 _call_scanner 原样透传 detail,前端据此提示;这里不重复实现校验(单一真相源)。


class ProjectCreateBody(BaseModel):
    """建项目入参。key 为稳定 slug(项目内数据以此隔离)。"""
    key: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1)
    enabled: bool = True
    created_by: str | None = None


class ProjectUpdateBody(BaseModel):
    """改项目:仅 name / enabled 可改,key 不可变(是隔离键)。"""
    name: str | None = None
    enabled: bool | None = None


class ProjectConfigUpdateBody(BaseModel):
    """设置每项目扫描配置覆盖。updates 仅允许 verify 开关 / verify 严重度 / AI 并发
    三个键(scanner 侧白名单校验,传其它键返 400)。updated_by 缺省注入当前用户(审计)。"""
    updates: dict[str, object]
    updated_by: str | None = None


class ServiceCreateBody(BaseModel):
    """项目下加服务。language 兼容 str 或 list[str](scanner 侧同为 object)。"""
    name: str = Field(min_length=1)
    repo_url: str = Field(min_length=1)
    group_name: str = "default"
    ref: str = "main"
    path_in_repo: str = "."
    language: object = "unknown"
    framework: str | None = None
    service_type: str = "service"
    internal_url: str | None = None
    enabled: bool = True


class ServiceUpdateBody(BaseModel):
    """改服务:除 name/project 外任意子集(PUT 用 exclude_unset 只发改动字段)。"""
    group_name: str | None = None
    repo_url: str | None = None
    ref: str | None = None
    path_in_repo: str | None = None
    language: object | None = None
    framework: str | None = None
    service_type: str | None = None
    internal_url: str | None = None
    enabled: bool | None = None


class GroupDiscoverBody(BaseModel):
    """按 GitLab 组地址枚举仓库(只读预览)。project_key 用于判每个仓库是否
    已属该/别的项目。"""
    group_path: str = Field(min_length=1)
    project_key: str | None = None


class GroupImportRepo(BaseModel):
    """import-group 里被勾选的一个仓库(取自 discover 的 suggested_* 字段)。"""
    project_id: int
    repo_url: str = Field(min_length=1)
    name: str = Field(min_length=1)
    group_name: str = "default"
    ref: str = "main"
    language: object = "unknown"
    framework: str | None = None
    service_type: str = "service"
    enabled: bool = True


class GroupImportBody(BaseModel):
    """建项目 + 落库选中仓库 + 建 webhook。冲突/重名逐仓库跳过报告。"""
    project_key: str = Field(min_length=1, max_length=64)
    project_name: str | None = None
    created_by: str | None = None
    group_path: str = Field(min_length=1)
    repos: list[GroupImportRepo]


class GroupSyncBody(BaseModel):
    """已有项目重扫组:只加新增仓库 + 补 webhook。group_path 前端从现有服务
    推导预填,用户可改。"""
    group_path: str = Field(min_length=1)


@router.get("/projects")
async def list_projects(current_user: CurrentUser) -> dict[str, Any]:
    """列项目(租户)+ 各自服务数。返回 {total, items[]}。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_projects())


@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreateBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """建项目。重名 key → 409(scanner 透传)。created_by 缺省时注入当前用户。"""
    payload = body.model_dump(exclude_unset=True)
    # created_by 未显式给时,记为当前登录用户(审计溯源)
    if not payload.get("created_by"):
        payload["created_by"] = (
            getattr(current_user, "email", None) or str(current_user.id)
        )
    async with ScannerClient() as client:
        return await _call_scanner(client.create_project(payload))


@router.put("/projects/{key}")
async def update_project(
    key: str,
    body: ProjectUpdateBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """改项目 name / enabled。只传要改的字段。404 透传。"""
    changes = body.model_dump(exclude_unset=True)
    async with ScannerClient() as client:
        return await _call_scanner(client.update_project(key, changes))


@router.delete("/projects/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(key: str, current_user: CurrentUser) -> None:
    """删项目(连带其服务定义)。default 不可删 → 400(scanner 透传)。"""
    async with ScannerClient() as client:
        await _call_scanner(client.delete_project(key))


@router.get("/projects/{key}/services")
async def list_project_services(
    key: str, current_user: CurrentUser,
) -> dict[str, Any]:
    """列该项目下服务定义。返回 {total, items[]}。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.list_project_services(key))


@router.post(
    "/projects/{key}/services", status_code=status.HTTP_201_CREATED,
)
async def create_project_service(
    key: str,
    body: ServiceCreateBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """项目下加服务。项目不存在 404;(项目,名字)重复 409;
    repo 已属别项目 409(ADR-0019,detail 含目标项目名)。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.create_project_service(
            key, body.model_dump(),
        ))


@router.post("/projects/discover-group")
async def discover_group(
    body: GroupDiscoverBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """按 GitLab 组地址枚举仓库(只读预览,不写库)。坏组名 404、token 缺失 503
    由 scanner 透传。供新建项目弹框展示可勾选列表。"""
    async with ScannerClient() as client:
        return await _call_scanner(
            client.discover_group(body.model_dump(exclude_unset=True))
        )


@router.post("/projects/import-group", status_code=status.HTTP_201_CREATED)
async def import_group(
    body: GroupImportBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """建项目 + 落库选中仓库 + 建 webhook。冲突/重名逐仓库跳过报告(不整批失败)。
    created_by 缺省时注入当前用户(审计溯源,与 create_project 一致)。"""
    payload = body.model_dump(exclude_unset=True)
    if not payload.get("created_by"):
        payload["created_by"] = (
            getattr(current_user, "email", None) or str(current_user.id)
        )
    async with ScannerClient() as client:
        return await _call_scanner(client.import_group(payload))


@router.post("/projects/{key}/sync-group")
async def sync_group(
    key: str,
    body: GroupSyncBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """已有项目重扫组:只加新增仓库 + 补 webhook。项目不存在 404(scanner 透传)。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.sync_group(key, body.model_dump()))


@router.put("/projects/{key}/services/{name}")
async def update_project_service(
    key: str,
    name: str,
    body: ServiceUpdateBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """改服务(部分字段)。改 repo_url 时跨项目冲突同样 409 透传。"""
    changes = body.model_dump(exclude_unset=True)
    async with ScannerClient() as client:
        return await _call_scanner(client.update_project_service(
            key, name, changes,
        ))


@router.delete(
    "/projects/{key}/services/{name}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_project_service(
    key: str, name: str, current_user: CurrentUser,
) -> None:
    """删服务定义。404 透传。"""
    async with ScannerClient() as client:
        await _call_scanner(client.delete_project_service(key, name))


# ── 每项目扫描配置覆盖(FEAT-027 M3;透传 scanner /projects/{key}/config)──
@router.get("/projects/{key}/config")
async def get_project_config(
    key: str, current_user: CurrentUser,
) -> dict[str, Any]:
    """列该项目可覆盖的扫描配置(verify 开关 / verify 严重度 / AI 并发),
    每项带 global_default / value / is_overridden。项目不存在 → 404 透传。"""
    async with ScannerClient() as client:
        return await _call_scanner(client.get_project_config(key))


@router.put("/projects/{key}/config")
async def update_project_config(
    key: str,
    body: ProjectConfigUpdateBody,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """设置每项目扫描配置覆盖(全或无)。updated_by 缺省时注入当前用户;
    非白名单键 / 非法值 / 空 updates → 400 透传;项目不存在 → 404 透传。"""
    payload = body.model_dump(exclude_unset=True)
    # updated_by 未显式给时记为当前登录用户(与 create_project 一致的审计口径)
    if not payload.get("updated_by"):
        payload["updated_by"] = (
            getattr(current_user, "email", None) or str(current_user.id)
        )
    async with ScannerClient() as client:
        return await _call_scanner(client.update_project_config(key, payload))


@router.delete(
    "/projects/{key}/config/{config_key}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_project_config(
    key: str, config_key: str, current_user: CurrentUser,
) -> None:
    """删单个每项目覆盖,该键回退全局默认。项目 / 覆盖不存在 → 404 透传。"""
    async with ScannerClient() as client:
        await _call_scanner(client.delete_project_config_key(key, config_key))

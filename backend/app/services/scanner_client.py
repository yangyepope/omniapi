"""HTTP client wrapper around gitlab-scanner's admin REST API.

scanner is the source-of-truth for security findings. security-platform backend
calls scanner via this client to:
  - list / filter findings for the management console
  - triage findings (mark fp/fixed/wontfix/...)
  - trigger on-demand scans
  - read dashboard stats

Auth: scanner expects `X-Admin-Token` header. security-platform backend holds the
shared secret in `settings.SCANNER_ADMIN_TOKEN`. End users never see
this token — they auth to security-platform with JWT, security-platform adds the admin
token when forwarding.

This module is intentionally thin (no business logic, no caching).
Business rules + RBAC + audit logging live in the calling route
(`api/routes/security.py`).
"""
from __future__ import annotations

import logging
from typing import Any, Literal

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


# Valid triage actions — mirrors scanner's TriageRequest schema.
TriageAction = Literal[
    "fp", "fixed", "wontfix", "suppressed", "duplicate", "reopen",
]


class ScannerClient:
    """Thin async HTTP client for gitlab-scanner's /api/admin/* endpoints.

    Construct one per request (or DI it from a singleton — both work).
    httpx.AsyncClient is created lazily on first call and reused for
    the lifetime of the instance, so callers should `await client.aclose()`
    when done (or use as async context manager).
    """

    def __init__(
        self,
        *,
        base_url: str | None = None,
        admin_token: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self._base = (base_url or settings.SCANNER_BASE_URL or "").rstrip("/")
        self._token = admin_token or settings.SCANNER_ADMIN_TOKEN
        self._timeout = timeout
        self._client: httpx.AsyncClient | None = None
        if not self._base:
            raise RuntimeError(
                "SCANNER_BASE_URL not configured — set in security-platform backend .env",
            )
        if not self._token:
            raise RuntimeError(
                "SCANNER_ADMIN_TOKEN not configured — must match scanner's "
                "SCANNER_ADMIN_TOKEN env var",
            )

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base,
                headers={"X-Admin-Token": self._token},
                timeout=self._timeout,
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "ScannerClient":
        return self

    async def __aexit__(self, *exc) -> None:
        await self.aclose()

    # ── findings ─────────────────────────────────────────────────────

    async def list_findings(
        self,
        *,
        service: str | None = None,
        severity: str | None = None,
        status: str | None = None,
        engine: str | None = None,
        rule_prefix: str | None = None,
        recent_runs: int | None = None,
        scan_run_id: int | None = None,
        project: str | None = None,
        limit: int = 50,
        offset: int = 0,
        sort: str = "-id",
    ) -> dict[str, Any]:
        """GET /api/admin/findings — returns {total, limit, offset, items}."""
        params = {
            "limit": limit,
            "offset": offset,
            "sort": sort,
        }
        for k, v in [
            ("service", service), ("severity", severity),
            ("status", status), ("engine", engine),
            ("rule_prefix", rule_prefix), ("recent_runs", recent_runs),
            ("scan_run_id", scan_run_id),
            # project:多项目隔离(scanner FEAT-025),非空则只看该项目 findings
            ("project", project),
        ]:
            if v is not None:
                params[k] = v
        r = await self._get_client().get("/api/admin/findings", params=params)
        r.raise_for_status()
        return r.json()

    async def get_finding(self, finding_id: int) -> dict[str, Any]:
        """GET /api/admin/findings/{id} — full detail incl. verifier reasoning."""
        r = await self._get_client().get(f"/api/admin/findings/{finding_id}")
        r.raise_for_status()
        return r.json()

    async def triage_finding(
        self,
        finding_id: int,
        *,
        action: TriageAction,
        reason: str | None = None,
        by: str,
    ) -> dict[str, Any]:
        """POST /api/admin/findings/{id}/triage.

        `by` MUST be the authenticated user's identity from JWT — do
        NOT take it from the client request body.
        """
        r = await self._get_client().post(
            f"/api/admin/findings/{finding_id}/triage",
            json={"action": action, "reason": reason, "by": by},
        )
        r.raise_for_status()
        return r.json()

    # ── services ─────────────────────────────────────────────────────

    async def list_services(
        self, *, project: str | None = None,
    ) -> list[dict[str, Any]]:
        """GET /api/admin/services — services from manifest + finding counts.
        project 非空则只列该项目服务(scanner FEAT-025)。"""
        params: dict[str, Any] = {}
        if project is not None:
            params["project"] = project
        r = await self._get_client().get(
            "/api/admin/services", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def list_scan_runs(
        self, service_name: str, *, limit: int = 20,
    ) -> list[dict[str, Any]]:
        """GET /api/admin/services/{name}/scan-runs — scan history for one service."""
        r = await self._get_client().get(
            f"/api/admin/services/{service_name}/scan-runs",
            params={"limit": limit},
        )
        r.raise_for_status()
        return r.json()

    async def list_finding_runs(
        self,
        service_name: str,
        *,
        rule_prefix: str | None = None,
        severity: str | None = None,
        status: str | None = None,
        engine: str | None = None,
        limit: int = 3,
    ) -> list[dict[str, Any]]:
        """GET /api/admin/services/{name}/finding-runs — 最近 N 次「真实产出过
        (匹配筛选的)finding」的扫描 + 每次产出条数。用于服务详情页 Findings
        标签的扫描切换 pill(方案 C:数据源为 finding_scan_runs 观测表)。"""
        params: dict[str, Any] = {"limit": limit}
        for k, v in [
            ("rule_prefix", rule_prefix), ("severity", severity),
            ("status", status), ("engine", engine),
        ]:
            if v is not None:
                params[k] = v
        r = await self._get_client().get(
            f"/api/admin/services/{service_name}/finding-runs",
            params=params,
        )
        r.raise_for_status()
        return r.json()

    async def get_scan_run(
        self, service_name: str, run_id: int,
    ) -> dict[str, Any]:
        """GET /api/admin/services/{name}/scan-runs/{id} — one run's full
        detail: current_stage, phases timeline, heartbeat liveness, and
        per-engine breakdown (FEAT-011)."""
        r = await self._get_client().get(
            f"/api/admin/services/{service_name}/scan-runs/{run_id}",
        )
        r.raise_for_status()
        return r.json()

    async def list_source_cache(self, service_name: str) -> list[dict[str, Any]]:
        """GET /api/admin/services/{name}/source-cache — cached pulled-code
        SHAs for a service (FEAT-012)."""
        r = await self._get_client().get(
            f"/api/admin/services/{service_name}/source-cache",
        )
        r.raise_for_status()
        return r.json()

    async def evict_source_cache(
        self, service_name: str, sha: str,
    ) -> dict[str, Any]:
        """DELETE /api/admin/services/{name}/source-cache/{sha} — evict a
        cached checkout + clear that sha's resume state (FEAT-012)."""
        r = await self._get_client().delete(
            f"/api/admin/services/{service_name}/source-cache/{sha}",
        )
        r.raise_for_status()
        return r.json()

    # ── scan ─────────────────────────────────────────────────────────

    async def trigger_scan(
        self,
        *,
        service: str,
        ref: str | None = None,
        sha: str | None = None,
    ) -> dict[str, Any]:
        """POST /api/admin/scan — fire-and-forget on-demand scan.

        `ref=None` → scanner uses the service's manifest-configured branch
        (e.g. sts=dev); pass a value only to override for a one-off scan.
        Returns {task_id, service, sha, accepted}. Console then polls
        list_scan_runs(service) to see status.
        """
        body: dict[str, Any] = {"service": service}
        if ref is not None:
            body["ref"] = ref
        if sha is not None:
            body["sha"] = sha
        r = await self._get_client().post("/api/admin/scan", json=body)
        r.raise_for_status()
        return r.json()

    # ── DAST(动态扫描,scanner FEAT-033~036)────────────────────────

    async def list_dast_runs(
        self, service_name: str, *, project: str | None = None, limit: int = 20,
    ) -> dict[str, Any]:
        """GET /api/admin/services/{name}/dast-runs — 某服务的 DAST 历史,新→旧。

        返回 {total, items:[{id, project, service_name, target_url, status,
        skip_reason, engines, findings_total, triggered_by, started_at,
        finished_at}]}。project 非空则只看该项目(同名跨项目消歧,ADR-0019)。
        """
        params: dict[str, Any] = {"limit": limit}
        # project 非空才带上;省略时由 scanner 按唯一名解析
        if project is not None:
            params["project"] = project
        r = await self._get_client().get(
            f"/api/admin/services/{service_name}/dast-runs", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def trigger_dast_scan(
        self, service_name: str, *, project: str | None = None,
    ) -> dict[str, Any]:
        """POST /api/admin/services/{name}/dast-scan — 触发带外 DAST 扫描。

        scanner 内部由 scope 授权门(resolve_dast_target)决定放行:未授权目标
        也会落一条 skipped 的 dast_runs(带原因),不是静默 no-op。立即返回
        {service, project, accepted};随后轮询 list_dast_runs 看状态。project
        作为 query 参数(与 scanner 端签名一致),省略时按唯一名解析。
        """
        params: dict[str, Any] = {}
        if project is not None:
            params["project"] = project
        r = await self._get_client().post(
            f"/api/admin/services/{service_name}/dast-scan", params=params,
        )
        r.raise_for_status()
        return r.json()

    # ── stats ────────────────────────────────────────────────────────

    async def stats(self, *, project: str | None = None) -> dict[str, Any]:
        """GET /api/admin/stats — dashboard totals。project 非空则按项目隔离。"""
        params: dict[str, Any] = {}
        if project is not None:
            params["project"] = project
        r = await self._get_client().get("/api/admin/stats", params=params)
        r.raise_for_status()
        return r.json()

    # ── dashboard endpoints (#184) ───────────────────────────────────

    async def stats_trend(
        self, days: int = 7, *, project: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/stats/trend — per-day open/new/closed series。"""
        params: dict[str, Any] = {"days": days}
        if project is not None:
            params["project"] = project
        r = await self._get_client().get(
            "/api/admin/stats/trend", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def categories(
        self,
        dimension: str = "owasp",
        service: str | None = None,
        top: int = 20,
        project: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/categories — aggregate by owasp/cwe/engine/rule_namespace."""
        params: dict[str, Any] = {"dimension": dimension, "top": top}
        if service:
            params["service"] = service
        if project is not None:
            params["project"] = project
        r = await self._get_client().get("/api/admin/categories", params=params)
        r.raise_for_status()
        return r.json()

    async def verifier_stats(
        self, service: str | None = None, project: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/verifier-stats — AI verifier FP-suppression metrics."""
        params: dict[str, Any] = {}
        if service:
            params["service"] = service
        if project is not None:
            params["project"] = project
        r = await self._get_client().get(
            "/api/admin/verifier-stats", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def finding_review_stats(
        self, service: str | None = None, project: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/finding-review-stats — post-process AI review
        effectiveness (FP rate / auto-closed / by-engine breakdown)."""
        params: dict[str, Any] = {}
        if service:
            params["service"] = service
        if project is not None:
            params["project"] = project
        r = await self._get_client().get(
            "/api/admin/finding-review-stats", params=params,
        )
        r.raise_for_status()
        return r.json()

    # ── cost metrics (scanner FEAT-009) ──────────────────────────────

    async def cost_stats(
        self, service: str | None = None, days: int | None = None,
        project: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/cost-stats — per-engine AI token usage + timing."""
        params: dict[str, Any] = {}
        if service:
            params["service"] = service
        if days is not None:
            params["days"] = days
        if project is not None:
            params["project"] = project
        r = await self._get_client().get(
            "/api/admin/cost-stats", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def cost_runs(
        self,
        service: str | None = None,
        days: int | None = None,
        limit: int = 50,
        project: str | None = None,
    ) -> list[dict[str, Any]]:
        """GET /api/admin/cost-runs — 单次扫描成本明细(FEAT-009 第三级下钻)。

        返回最近 limit 次有成本记录的扫描,每条含逐引擎明细。service/days/project
        过滤语义与 cost_stats 一致。
        """
        params: dict[str, Any] = {"limit": limit}
        if service:
            params["service"] = service
        if days is not None:
            params["days"] = days
        if project is not None:
            params["project"] = project
        r = await self._get_client().get(
            "/api/admin/cost-runs", params=params,
        )
        r.raise_for_status()
        return r.json()

    # ── runtime config (scanner FEAT-008) ────────────────────────────

    async def get_config(self) -> dict[str, Any]:
        """GET /api/admin/config — every runtime-configurable setting with
        current value / category / is_overridden / requires_restart."""
        r = await self._get_client().get("/api/admin/config")
        r.raise_for_status()
        return r.json()

    async def update_config(
        self, updates: dict[str, Any], *, updated_by: str | None = None,
    ) -> dict[str, Any]:
        """PUT /api/admin/config — persist + hot-apply config overrides.

        `updated_by` MUST be the authenticated user's identity from JWT —
        do NOT take it from the client request body (same audit rule as
        triage_finding).
        """
        r = await self._get_client().put(
            "/api/admin/config",
            json={"updates": updates, "updated_by": updated_by},
        )
        r.raise_for_status()
        return r.json()

    async def delete_config(self, key: str) -> None:
        """DELETE /api/admin/config/{key} — drop an override so the field
        falls back to env/default. Scanner returns 204 (no body)."""
        r = await self._get_client().delete(f"/api/admin/config/{key}")
        r.raise_for_status()

    async def list_engines(self) -> dict[str, Any]:
        """GET /api/admin/engines — read-only catalog of scan engines
        (DISC-004). Each item carries name/display/kind/enabled/binary_present/
        optional/config_keys; new engines added in scanner code appear
        automatically. Global (not per-project)."""
        r = await self._get_client().get("/api/admin/engines")
        r.raise_for_status()
        return r.json()

    # ── system profile (系统画像 / FEAT) ──────────────────────────────

    async def get_system_profile(
        self, name: str, *, sha: str | None = None, project: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/services/{name}/system-profile — the service's
        system-level profile (framework/flow/attack-surface/risk + narrative).
        Latest when sha omitted; 404 when never profiled."""
        params: dict[str, Any] = {}
        if sha:
            params["sha"] = sha
        if project:
            params["project"] = project
        r = await self._get_client().get(
            f"/api/admin/services/{name}/system-profile", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def system_profile_history(
        self, name: str, *, project: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/services/{name}/system-profile/history — all
        profiled shas, newest first."""
        params = {"project": project} if project else {}
        r = await self._get_client().get(
            f"/api/admin/services/{name}/system-profile/history", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def regenerate_system_profile(
        self, name: str, *, project: str | None = None,
    ) -> dict[str, Any]:
        """POST /api/admin/services/{name}/system-profile/regenerate — refresh
        the latest profile's aggregates + AI narrative in place. 404 when the
        service has never been profiled."""
        params = {"project": project} if project else {}
        r = await self._get_client().post(
            f"/api/admin/services/{name}/system-profile/regenerate",
            params=params,
        )
        r.raise_for_status()
        return r.json()

    async def project_system_profile(self, key: str) -> dict[str, Any]:
        """GET /api/admin/projects/{key}/system-profile — 项目级 rollup:整个
        项目(所有服务)的技术栈/流程/暴露面/风险/渗透视角聚合。实时聚合。"""
        r = await self._get_client().get(
            f"/api/admin/projects/{key}/system-profile",
        )
        r.raise_for_status()
        return r.json()

    # ── interfaces (#193) ────────────────────────────────────────────

    async def list_service_interfaces(
        self, name: str, risk_level: str | None = None,
    ) -> list[dict[str, Any]]:
        """GET /api/admin/services/{name}/interfaces — discovered endpoints
        for one service, with per-interface findings counts."""
        params: dict[str, Any] = {}
        if risk_level:
            params["risk_level"] = risk_level
        r = await self._get_client().get(
            f"/api/admin/services/{name}/interfaces", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def get_interface(self, interface_id: int) -> dict[str, Any]:
        """GET /api/admin/interfaces/{id} — single interface + related findings."""
        r = await self._get_client().get(
            f"/api/admin/interfaces/{interface_id}",
        )
        r.raise_for_status()
        return r.json()

    # ── AI hunt categories (scanner FEAT-018) ────────────────────────
    #
    # AI 扫描规则(OWASP API01 / crypto_misuse / LLM Top-10…),控制台可
    # 列表 / 查看 / 编辑 / 启停 / 新增自定义 / 删除。改动下次扫描热加载生效
    # (scanner 侧写库后已自动重建扫描器)。

    async def list_hunt_categories(
        self,
        *,
        enabled: bool | None = None,
        source: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/ai/categories — 返回 {total, items}，可按
        enabled / source(builtin|custom)过滤。"""
        params: dict[str, Any] = {}
        if enabled is not None:
            params["enabled"] = enabled
        if source is not None:
            params["source"] = source
        r = await self._get_client().get(
            "/api/admin/ai/categories", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def get_hunt_category(self, name: str) -> dict[str, Any]:
        """GET /api/admin/ai/categories/{name} — 详情(含完整 prompt);404。"""
        r = await self._get_client().get(f"/api/admin/ai/categories/{name}")
        r.raise_for_status()
        return r.json()

    async def create_hunt_category(
        self, payload: dict[str, Any], *, updated_by: str | None = None,
    ) -> dict[str, Any]:
        """POST /api/admin/ai/categories — 新增自定义规则(source=custom)。

        `updated_by` 由认证用户注入(同 update_config 审计规则),不取自
        请求体。重名 scanner 返回 409。"""
        body = {**payload, "updated_by": updated_by}
        r = await self._get_client().post(
            "/api/admin/ai/categories", json=body,
        )
        r.raise_for_status()
        return r.json()

    async def update_hunt_category(
        self, name: str, changes: dict[str, Any], *, updated_by: str | None = None,
    ) -> dict[str, Any]:
        """PUT /api/admin/ai/categories/{name} — 部分更新(只传要改的字段)。

        builtin 可编辑 / 启停但不可改名删除。`updated_by` 同样由认证用户注入。"""
        body = {**changes, "updated_by": updated_by}
        r = await self._get_client().put(
            f"/api/admin/ai/categories/{name}", json=body,
        )
        r.raise_for_status()
        return r.json()

    async def delete_hunt_category(self, name: str) -> None:
        """DELETE /api/admin/ai/categories/{name} — 删除自定义规则。
        builtin 不可删(scanner 返回 400，改用 PUT enabled=false 禁用)。"""
        r = await self._get_client().delete(f"/api/admin/ai/categories/{name}")
        r.raise_for_status()

    # ── service knowledge docs (scanner FEAT-018 phase C) ────────────
    #
    # 扫描时从各服务源码摄取的业务知识文档(CLAUDE.md / docs/ai/**…),AI
    # 用它理解项目。控制台可按服务列出 / 查看 / 改分类 / 编辑 / 手工新增 / 删除。
    # 只有 classification==ai_context 的文档真正喂给 AI(fed_to_ai)。

    async def list_knowledge_docs(
        self,
        service_name: str,
        *,
        sha: str | None = None,
        classification: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/services/{name}/knowledge — 返回 {total, items}，
        可按 sha / classification 过滤。"""
        params: dict[str, Any] = {}
        if sha is not None:
            params["sha"] = sha
        if classification is not None:
            params["classification"] = classification
        r = await self._get_client().get(
            f"/api/admin/services/{service_name}/knowledge", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def get_knowledge_doc(self, doc_id: int) -> dict[str, Any]:
        """GET /api/admin/knowledge/{id} — 详情(含 content);404。"""
        r = await self._get_client().get(f"/api/admin/knowledge/{doc_id}")
        r.raise_for_status()
        return r.json()

    async def create_knowledge_doc(
        self, service_name: str, payload: dict[str, Any],
    ) -> dict[str, Any]:
        """POST /api/admin/services/{name}/knowledge — 手工新增(source=manual，
        human_edited=True，重扫不覆盖)。(service, sha, doc_path) 重复返回 409。"""
        r = await self._get_client().post(
            f"/api/admin/services/{service_name}/knowledge", json=payload,
        )
        r.raise_for_status()
        return r.json()

    async def update_knowledge_doc(
        self, doc_id: int, payload: dict[str, Any],
    ) -> dict[str, Any]:
        """PUT /api/admin/knowledge/{id} — 改 content / classification
        (只传要改的),置 human_edited=True。"""
        r = await self._get_client().put(
            f"/api/admin/knowledge/{doc_id}", json=payload,
        )
        r.raise_for_status()
        return r.json()

    async def delete_knowledge_doc(self, doc_id: int) -> None:
        """DELETE /api/admin/knowledge/{id} — 删除;404。"""
        r = await self._get_client().delete(f"/api/admin/knowledge/{doc_id}")
        r.raise_for_status()

    # ── AI 参考规则库 / 方法论 skills (scanner FEAT-018 phase B) ──────
    #
    # 内置参考规则语料(master_rules / ASVS)+ 方法论 skills，只读浏览;
    # 规则库很大(2383+),服务端分页(limit/offset)。控制台按 CWE/OWASP/ASVS
    # 反查规则。这些是「规则」,与 ai/categories(审计类别)不同。

    async def list_rules(
        self,
        *,
        q: str | None = None,
        source: str | None = None,
        cwe: str | None = None,
        owasp: str | None = None,
        asvs: str | None = None,
        language: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        """GET /api/admin/ai/rules — {total, limit, offset, items}，服务端分页。"""
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if q is not None:
            params["q"] = q
        if source is not None:
            params["source"] = source
        if cwe is not None:
            params["cwe"] = cwe
        if owasp is not None:
            params["owasp"] = owasp
        if asvs is not None:
            params["asvs"] = asvs
        if language is not None:
            params["language"] = language
        r = await self._get_client().get("/api/admin/ai/rules", params=params)
        r.raise_for_status()
        return r.json()

    async def get_rule(self, source: str, rule_id: str) -> dict[str, Any]:
        """GET /api/admin/ai/rules/{source}/{rule_id} — 详情(含 description /
        license)。rule_id 可含斜杠(scanner 侧为 path 参数),直接拼接;404。"""
        r = await self._get_client().get(
            f"/api/admin/ai/rules/{source}/{rule_id}",
        )
        r.raise_for_status()
        return r.json()

    async def list_skills(
        self,
        *,
        q: str | None = None,
        subdomain: str | None = None,
        tag: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        """GET /api/admin/ai/skills — {total, limit, offset, items}，服务端分页。"""
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if q is not None:
            params["q"] = q
        if subdomain is not None:
            params["subdomain"] = subdomain
        if tag is not None:
            params["tag"] = tag
        r = await self._get_client().get("/api/admin/ai/skills", params=params)
        r.raise_for_status()
        return r.json()

    async def get_skill(self, skill_id: str) -> dict[str, Any]:
        """GET /api/admin/ai/skills/{id} — 详情(含方法论全文 body);404。"""
        r = await self._get_client().get(f"/api/admin/ai/skills/{skill_id}")
        r.raise_for_status()
        return r.json()

    # ── AI 自定义参考规则 (scanner FEAT-018 phase B2) ────────────────
    #
    # 运营者自建的参考规则,并进规则库(source=custom)并按 CWE/OWASP/ASVS
    # 被 category 注入。`updated_by` 由认证用户注入,不取自请求体。

    async def list_custom_rules(
        self, *, enabled: bool | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/ai/custom-rules — {total, items}(含禁用),可按
        enabled 过滤。"""
        params: dict[str, Any] = {}
        if enabled is not None:
            params["enabled"] = enabled
        r = await self._get_client().get(
            "/api/admin/ai/custom-rules", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def get_custom_rule(self, rule_id: str) -> dict[str, Any]:
        """GET /api/admin/ai/custom-rules/{id} — 详情(含 description);404。"""
        r = await self._get_client().get(
            f"/api/admin/ai/custom-rules/{rule_id}",
        )
        r.raise_for_status()
        return r.json()

    async def create_custom_rule(
        self, payload: dict[str, Any], *, updated_by: str | None = None,
    ) -> dict[str, Any]:
        """POST /api/admin/ai/custom-rules — 新增。重名 scanner 返回 409。"""
        body = {**payload, "updated_by": updated_by}
        r = await self._get_client().post(
            "/api/admin/ai/custom-rules", json=body,
        )
        r.raise_for_status()
        return r.json()

    async def update_custom_rule(
        self, rule_id: str, changes: dict[str, Any], *, updated_by: str | None = None,
    ) -> dict[str, Any]:
        """PUT /api/admin/ai/custom-rules/{id} — 部分更新(只传要改的字段)。"""
        body = {**changes, "updated_by": updated_by}
        r = await self._get_client().put(
            f"/api/admin/ai/custom-rules/{rule_id}", json=body,
        )
        r.raise_for_status()
        return r.json()

    async def delete_custom_rule(self, rule_id: str) -> None:
        """DELETE /api/admin/ai/custom-rules/{id} — 删除;404。"""
        r = await self._get_client().delete(
            f"/api/admin/ai/custom-rules/{rule_id}",
        )
        r.raise_for_status()

    # ── 项目理解:接口画像 / 服务 profile / ai-context (scanner phase D) ─
    #
    # 编辑接口画像会自动锁定(human_locked=True),AI 风险分级不再覆盖;
    # 服务 profile 是服务级业务描述;ai-context 预览 AI 扫描时看到的完整上下文。

    async def update_interface(
        self, interface_id: int, changes: dict[str, Any],
    ) -> dict[str, Any]:
        """PUT /api/admin/interfaces/{id} — 改接口业务画像(部分更新)。
        scanner 端忽略 body 里的 updated_by,故此处不注入。404。"""
        r = await self._get_client().put(
            f"/api/admin/interfaces/{interface_id}", json=changes,
        )
        r.raise_for_status()
        return r.json()

    async def get_service_profile(self, name: str) -> dict[str, Any]:
        """GET /api/admin/services/{name}/profile — 无则返回空字段(200,不 404)。"""
        r = await self._get_client().get(
            f"/api/admin/services/{name}/profile",
        )
        r.raise_for_status()
        return r.json()

    async def update_service_profile(
        self, name: str, payload: dict[str, Any], *, updated_by: str | None = None,
    ) -> dict[str, Any]:
        """PUT /api/admin/services/{name}/profile — upsert。scanner 端是全量
        覆盖(非 partial),原样透传前端两字段;`updated_by` 由认证用户注入。"""
        body = {**payload, "updated_by": updated_by}
        r = await self._get_client().put(
            f"/api/admin/services/{name}/profile", json=body,
        )
        r.raise_for_status()
        return r.json()

    async def delete_service_profile(self, name: str) -> None:
        """DELETE /api/admin/services/{name}/profile — 删除;404。"""
        r = await self._get_client().delete(
            f"/api/admin/services/{name}/profile",
        )
        r.raise_for_status()

    async def get_ai_context(
        self, name: str, *, sha: str | None = None,
        project: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/services/{name}/ai-context — 预览 AI 扫描完整上下文。"""
        params: dict[str, Any] = {}
        if sha is not None:
            params["sha"] = sha
        # project:多项目隔离(scanner FEAT-025);服务名在项目内唯一,带上更精确
        if project is not None:
            params["project"] = project
        r = await self._get_client().get(
            f"/api/admin/services/{name}/ai-context", params=params,
        )
        r.raise_for_status()
        return r.json()

    # ── 多项目:项目(租户)+ 服务定义 CRUD(scanner FEAT-024 M1)────────
    # 全部薄转发:JWT 已在路由层校验,这里只加 X-Admin-Token 打 scanner。
    # 409(重名 / 跨项目 repo)、404、400(default 不可删)由调用方 _call_scanner
    # 原样透传 detail,前端据此做提示。

    async def list_projects(self) -> dict[str, Any]:
        """GET /api/admin/projects — {total, items[]}。"""
        r = await self._get_client().get("/api/admin/projects")
        r.raise_for_status()
        return r.json()

    async def create_project(self, body: dict[str, Any]) -> dict[str, Any]:
        """POST /api/admin/projects — 建项目;重名 key → 409。"""
        r = await self._get_client().post("/api/admin/projects", json=body)
        r.raise_for_status()
        return r.json()

    async def update_project(
        self, key: str, changes: dict[str, Any],
    ) -> dict[str, Any]:
        """PUT /api/admin/projects/{key} — 改 name / enabled。"""
        r = await self._get_client().put(
            f"/api/admin/projects/{key}", json=changes,
        )
        r.raise_for_status()
        return r.json()

    async def delete_project(self, key: str) -> None:
        """DELETE /api/admin/projects/{key} — default 不可删(400)。"""
        r = await self._get_client().delete(f"/api/admin/projects/{key}")
        r.raise_for_status()

    async def list_project_services(self, key: str) -> dict[str, Any]:
        """GET /api/admin/projects/{key}/services — {total, items[]}。"""
        r = await self._get_client().get(
            f"/api/admin/projects/{key}/services",
        )
        r.raise_for_status()
        return r.json()

    async def create_project_service(
        self, key: str, body: dict[str, Any],
    ) -> dict[str, Any]:
        """POST /api/admin/projects/{key}/services — 项目不存在 404;
        (项目,名字)重复 409;repo 已属别项目 409(ADR-0019)。"""
        r = await self._get_client().post(
            f"/api/admin/projects/{key}/services", json=body,
        )
        r.raise_for_status()
        return r.json()

    async def update_project_service(
        self, key: str, name: str, changes: dict[str, Any],
    ) -> dict[str, Any]:
        """PUT /api/admin/projects/{key}/services/{name} — 部分更新。"""
        r = await self._get_client().put(
            f"/api/admin/projects/{key}/services/{name}", json=changes,
        )
        r.raise_for_status()
        return r.json()

    async def delete_project_service(self, key: str, name: str) -> None:
        """DELETE /api/admin/projects/{key}/services/{name}。"""
        r = await self._get_client().delete(
            f"/api/admin/projects/{key}/services/{name}",
        )
        r.raise_for_status()

    # ── 按 GitLab 组地址导入项目(scanner FEAT-030)──────────────────
    async def discover_group(self, body: dict[str, Any]) -> dict[str, Any]:
        """POST /api/admin/projects/discover-group — 只读枚举组下仓库(预览);
        坏组名 404;token 缺失 503。"""
        r = await self._get_client().post(
            "/api/admin/projects/discover-group", json=body,
        )
        r.raise_for_status()
        return r.json()

    async def import_group(self, body: dict[str, Any]) -> dict[str, Any]:
        """POST /api/admin/projects/import-group — 建项目 + 落库选中仓库 + 建 webhook。
        冲突/重名逐仓库跳过并在 items 报告,不整批失败。"""
        r = await self._get_client().post(
            "/api/admin/projects/import-group", json=body,
        )
        r.raise_for_status()
        return r.json()

    async def sync_group(self, key: str, body: dict[str, Any]) -> dict[str, Any]:
        """POST /api/admin/projects/{key}/sync-group — 重扫组,只加新增仓库 +
        补 webhook;项目不存在 404。"""
        r = await self._get_client().post(
            f"/api/admin/projects/{key}/sync-group", json=body,
        )
        r.raise_for_status()
        return r.json()

    # ── 每项目扫描配置覆盖(FEAT-027 M3)────────────────────────────
    async def get_project_config(self, key: str) -> dict[str, Any]:
        """GET /api/admin/projects/{key}/config — 每项目可覆盖的扫描配置键
        (verify 开关 / verify 严重度 / AI 并发),每项带 global_default(全局默认)、
        value(本项目生效值)、is_overridden(是否已覆盖)。项目不存在 → 404 透传。"""
        r = await self._get_client().get(f"/api/admin/projects/{key}/config")
        r.raise_for_status()
        return r.json()

    async def update_project_config(
        self, key: str, body: dict[str, Any],
    ) -> dict[str, Any]:
        """PUT /api/admin/projects/{key}/config — 设置每项目覆盖(全或无)。
        非白名单键 / 非法值 / 空 updates → scanner 返 400 透传;项目不存在 404 透传。"""
        r = await self._get_client().put(
            f"/api/admin/projects/{key}/config", json=body,
        )
        r.raise_for_status()
        return r.json()

    async def delete_project_config_key(
        self, key: str, config_key: str,
    ) -> None:
        """DELETE /api/admin/projects/{key}/config/{config_key} — 删单个覆盖,
        该键回退到全局默认。项目 / 覆盖不存在 → 404 透传。"""
        r = await self._get_client().delete(
            f"/api/admin/projects/{key}/config/{config_key}",
        )
        r.raise_for_status()

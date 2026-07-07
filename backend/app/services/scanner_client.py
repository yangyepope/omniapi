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

    async def list_services(self) -> list[dict[str, Any]]:
        """GET /api/admin/services — services from manifest + finding counts."""
        r = await self._get_client().get("/api/admin/services")
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
        ref: str = "main",
        sha: str | None = None,
    ) -> dict[str, Any]:
        """POST /api/admin/scan — fire-and-forget on-demand scan.

        Returns {task_id, service, sha, accepted}. Console then polls
        list_scan_runs(service) to see status.
        """
        body: dict[str, Any] = {"service": service, "ref": ref}
        if sha is not None:
            body["sha"] = sha
        r = await self._get_client().post("/api/admin/scan", json=body)
        r.raise_for_status()
        return r.json()

    # ── stats ────────────────────────────────────────────────────────

    async def stats(self) -> dict[str, Any]:
        """GET /api/admin/stats — dashboard totals."""
        r = await self._get_client().get("/api/admin/stats")
        r.raise_for_status()
        return r.json()

    # ── dashboard endpoints (#184) ───────────────────────────────────

    async def stats_trend(self, days: int = 7) -> dict[str, Any]:
        """GET /api/admin/stats/trend — per-day open/new/closed series."""
        r = await self._get_client().get(
            "/api/admin/stats/trend", params={"days": days},
        )
        r.raise_for_status()
        return r.json()

    async def categories(
        self,
        dimension: str = "owasp",
        service: str | None = None,
        top: int = 20,
    ) -> dict[str, Any]:
        """GET /api/admin/categories — aggregate by owasp/cwe/engine/rule_namespace."""
        params: dict[str, Any] = {"dimension": dimension, "top": top}
        if service:
            params["service"] = service
        r = await self._get_client().get("/api/admin/categories", params=params)
        r.raise_for_status()
        return r.json()

    async def verifier_stats(
        self, service: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/verifier-stats — AI verifier FP-suppression metrics."""
        params: dict[str, Any] = {}
        if service:
            params["service"] = service
        r = await self._get_client().get(
            "/api/admin/verifier-stats", params=params,
        )
        r.raise_for_status()
        return r.json()

    async def finding_review_stats(
        self, service: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/finding-review-stats — post-process AI review
        effectiveness (FP rate / auto-closed / by-engine breakdown)."""
        params: dict[str, Any] = {}
        if service:
            params["service"] = service
        r = await self._get_client().get(
            "/api/admin/finding-review-stats", params=params,
        )
        r.raise_for_status()
        return r.json()

    # ── cost metrics (scanner FEAT-009) ──────────────────────────────

    async def cost_stats(
        self, service: str | None = None, days: int | None = None,
    ) -> dict[str, Any]:
        """GET /api/admin/cost-stats — per-engine AI token usage + timing."""
        params: dict[str, Any] = {}
        if service:
            params["service"] = service
        if days is not None:
            params["days"] = days
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
    ) -> list[dict[str, Any]]:
        """GET /api/admin/cost-runs — 单次扫描成本明细(FEAT-009 第三级下钻)。

        返回最近 limit 次有成本记录的扫描,每条含逐引擎明细。service/days
        过滤语义与 cost_stats 一致。
        """
        params: dict[str, Any] = {"limit": limit}
        if service:
            params["service"] = service
        if days is not None:
            params["days"] = days
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

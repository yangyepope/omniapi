"""MCP server exposing scanner ops as tools for Claude Desktop / Cursor (#182).

Why this exists:
  The React frontend already calls scanner via security-platform's /security/* HTTP
  routes. This module gives the SAME backend a second protocol exit: MCP
  (Model Context Protocol). Claude Desktop or any MCP-aware client can
  then drive the scanner with natural language — list findings, triage,
  trigger scans — without the operator touching CLI or UI.

Architecture:
                              ┌──────────────────────────┐
   React frontend ──HTTP/JWT──┤                          │
                              │   security-platform backend        │──ScannerClient──→ gitlab-scanner
   Claude Desktop ──MCP/SSE───┤   (this module here)     │
                              └──────────────────────────┘

Both exits share `ScannerClient`. No business duplication.

Tools registered:
  list_findings / get_finding / triage_finding
  list_services / list_scan_runs / trigger_scan / stats

Auth:
  All MCP requests must carry `Authorization: Bearer <SECURITY_PLATFORM_MCP_TOKEN>`.
  Set the token in security-platform backend .env. Claude Desktop config holds the
  same token. timing-safe compare against the env value.

Why bearer-token instead of JWT:
  SSE establishes a long-lived session at connect-time. Per-tool-call JWT
  refresh would be awkward. A long-lived bearer is the standard MCP
  pattern and matches scanner's X-Admin-Token approach.
"""
from __future__ import annotations

import hmac
import logging
from typing import Any

from fastapi import HTTPException, Request, status
from mcp.server.fastmcp import FastMCP

from app.core.config import settings
from app.services.scanner_client import ScannerClient, TriageAction

logger = logging.getLogger(__name__)


# ── FastMCP server ───────────────────────────────────────────────────


mcp = FastMCP(
    name="security-platform-scanner",
    instructions=(
        "Tools for the gitlab-scanner security platform. Use these to "
        "list findings, triage them (fp/fixed/wontfix/etc), trigger "
        "scans, and query dashboard stats. Findings are produced by 7 "
        "engines: Semgrep, Trivy, Trufflehog, Dependency-Check, CodeQL, "
        "SpotBugs, and AI Sonnet (with verifier). Always pass the "
        "operator's email as `by` when triaging."
    ),
)


# ── Tools (thin wrappers over ScannerClient) ─────────────────────────


@mcp.tool()
async def list_findings(
    service: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    engine: str | None = None,
    rule_prefix: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    """List security findings with filters and pagination.

    Args:
      service: filter to one service name from the manifest (e.g. "aam-parent")
      severity: CRITICAL | HIGH | MEDIUM | LOW
      status: open | closed
      engine: ai_sonnet | semgrep | trivy | dependency_check | codeql | spotbugs | trufflehog
      rule_prefix: match rule_id startswith (e.g. "ai/owasp_api02")
      limit: 1..500, default 50
      offset: pagination offset

    Returns {total, limit, offset, items: [...]}
    """
    async with ScannerClient() as c:
        return await c.list_findings(
            service=service, severity=severity, status=status,
            engine=engine, rule_prefix=rule_prefix,
            limit=limit, offset=offset,
        )


@mcp.tool()
async def get_finding(finding_id: int) -> dict[str, Any]:
    """Fetch one finding's full detail including AI verifier reasoning
    (when present). Use after `list_findings` to drill down on a candidate."""
    async with ScannerClient() as c:
        return await c.get_finding(finding_id)


@mcp.tool()
async def triage_finding(
    finding_id: int,
    action: TriageAction,
    reason: str,
    by: str,
) -> dict[str, Any]:
    """Mark a finding as fp / fixed / wontfix / suppressed / duplicate / reopen.

    For `fp`, the `reason` text feeds back into the AI engine's HARD
    CONSTRAINTS block on the next scan — AI will skip the same pattern.
    Write `reason` for that audience (be precise about WHY it's FP).

    `by` must be the operator's identity (email is preferred). The MCP
    client should supply this from the authenticated user; this server
    does NOT spoof it.
    """
    async with ScannerClient() as c:
        return await c.triage_finding(
            finding_id=finding_id, action=action, reason=reason, by=by,
        )


@mcp.tool()
async def list_services() -> list[dict[str, Any]]:
    """List all services registered in the scanner's manifest.

    Each entry has name, repo_url, ref, language, framework, open/closed
    finding counts, last scan timestamp + status.
    """
    async with ScannerClient() as c:
        return await c.list_services()


@mcp.tool()
async def list_scan_runs(service: str, limit: int = 20) -> list[dict[str, Any]]:
    """Scan history for one service — useful for checking when a service
    was last audited and what status (completed / running / crashed)."""
    async with ScannerClient() as c:
        return await c.list_scan_runs(service, limit=limit)


@mcp.tool()
async def trigger_scan(
    service: str,
    ref: str = "main",
    sha: str | None = None,
) -> dict[str, Any]:
    """Trigger an on-demand scan of one service. Returns a task_id; poll
    `list_scan_runs(service)` to see when it completes (scans take
    30-60 min depending on size)."""
    async with ScannerClient() as c:
        return await c.trigger_scan(service=service, ref=ref, sha=sha)


@mcp.tool()
async def stats() -> dict[str, Any]:
    """Dashboard totals: counts by severity, by engine, by status,
    plus services count and last-scan-at."""
    async with ScannerClient() as c:
        return await c.stats()


@mcp.tool()
async def stats_trend(days: int = 7) -> dict[str, Any]:
    """Per-day new/closed/open-running-total series for the last N days.
    Use for trend questions like 'are findings going up or down this week?'."""
    async with ScannerClient() as c:
        return await c.stats_trend(days=days)


@mcp.tool()
async def categories(
    dimension: str = "owasp",
    service: str | None = None,
    top: int = 20,
) -> dict[str, Any]:
    """Aggregate findings by category. dimension: 'owasp' | 'cwe' | 'engine' | 'rule_namespace'.
    Use to answer 'what OWASP categories dominate?' or 'which CWEs are most common?'."""
    async with ScannerClient() as c:
        return await c.categories(dimension=dimension, service=service, top=top)


@mcp.tool()
async def verifier_stats(service: str | None = None) -> dict[str, Any]:
    """AI verifier effectiveness — refute counts by bucket + FP-suppression rate.
    Buckets: server_side_overwrite / framework_guard / deployment_context_excluded /
    reachability_gone / theoretical_no_chain."""
    async with ScannerClient() as c:
        return await c.verifier_stats(service=service)


@mcp.tool()
async def list_service_interfaces(
    service: str,
    risk_level: str | None = None,
) -> list[dict[str, Any]]:
    """List discovered HTTP/Feign endpoints for one service, with per-interface
    findings counts. Use to answer 'which endpoints have unfixed CRITICAL bugs?'
    risk_level: 'P0' | 'P1' | 'P2' to filter (None = all)."""
    async with ScannerClient() as c:
        return await c.list_service_interfaces(service, risk_level=risk_level)


@mcp.tool()
async def get_interface(interface_id: int) -> dict[str, Any]:
    """Drill into one interface: metadata (method, path, handler, file:line,
    risk level) plus all findings linked to it (direct or via call-chain)."""
    async with ScannerClient() as c:
        return await c.get_interface(interface_id)


# ── Auth middleware for the SSE mount ────────────────────────────────


async def verify_mcp_auth(request: Request) -> None:
    """FastAPI dependency that gates the MCP mount on a bearer token.

    Validates `Authorization: Bearer <SECURITY_PLATFORM_MCP_TOKEN>`. If env var not
    configured, all MCP requests respond 503 (fail-closed).

    Use as a dependency on the route that mounts the SSE app, or as a
    middleware predicate. Token compared timing-safe.
    """
    expected = getattr(settings, "SECURITY_PLATFORM_MCP_TOKEN", None)
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MCP server not configured (SECURITY_PLATFORM_MCP_TOKEN unset)",
        )
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing bearer token",
        )
    presented = auth.split(None, 1)[1].strip()
    if not hmac.compare_digest(presented, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid bearer token",
        )


def build_sse_app():
    """Return the ASGI sub-app you mount on FastAPI under e.g. /mcp.

    Caller is responsible for adding `dependencies=[Depends(verify_mcp_auth)]`
    on the mount route (or wrapping with custom middleware).
    """
    return mcp.sse_app()

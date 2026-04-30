"""
扫描手动触发 + 查询接口（v3.0 §1.6 / §5）。
"""
import logging
import uuid as _uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query, status

from aisec.config import get_settings
from aisec.db.postgres import get_pool
from aisec.db.repository import AuditRepository
from aisec.models.scan import FullScanRequest, ScanRunOut
from aisec.temporal.cancel import cancel_existing_workflow, make_workflow_id
from aisec.temporal.client import get_temporal_client
from aisec.temporal.models import ScanInput

logger = logging.getLogger(__name__)
router = APIRouter()


# ── 触发 ──────────────────────────────────────────────────────────

@router.post("/scan/full", status_code=status.HTTP_202_ACCEPTED)
async def trigger_full_scan(req: FullScanRequest) -> dict[str, Any]:
    """
    手动触发全量扫描（v3.0 §1.6）。

    认证：v3.0 §6 待确认事项 — 暂用空鉴权，生产建议加 API Token。
    """
    s = get_settings()
    scan_id = str(_uuid.uuid4())
    wf_id = make_workflow_id(
        "scheduled",
        req.project_id,
        date=datetime.utcnow().strftime("%Y%m%d%H%M"),
    )
    client = await get_temporal_client()
    await cancel_existing_workflow(client, wf_id)

    await AuditRepository().create_scan_run(
        scan_id=scan_id,
        project_id=req.project_id,
        mr_iid=None,
        mode="full",
        git_ref=req.git_ref,
        triggered_by_user_id=None,
        workflow_id=wf_id,
    )
    await client.start_workflow(
        "ScanWorkflow",
        ScanInput(
            scan_id=scan_id,
            project_id=req.project_id,
            mode="full",
            git_ref=req.git_ref,
        ),
        id=wf_id,
        task_queue=s.TEMPORAL_TASK_QUEUE,
    )
    return {"status": "accepted", "scan_id": scan_id, "workflow_id": wf_id}


# ── 取消正在运行的扫描 ──────────────────────────────────────────────

@router.post("/scans/{scan_id}/cancel")
async def cancel_scan(scan_id: _uuid.UUID) -> dict[str, Any]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT workflow_id FROM scan_run WHERE scan_id = $1",
            scan_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="scan not found")
    wf_id = row["workflow_id"]
    if not wf_id:
        raise HTTPException(status_code=409, detail="scan has no associated workflow")
    client = await get_temporal_client()
    cancelled = await cancel_existing_workflow(client, wf_id)
    return {"workflow_id": wf_id, "cancelled": cancelled}


# ── 查询：扫描列表 / 详情 ────────────────────────────────────────────

@router.get("/scans", response_model=list[ScanRunOut])
async def list_scans(
    project_id: Optional[int] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[ScanRunOut]:
    where: list[str] = []
    params: list[Any] = []
    if project_id is not None:
        params.append(project_id)
        where.append(f"project_id = ${len(params)}")
    if status_filter is not None:
        params.append(status_filter)
        where.append(f"status = ${len(params)}")
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    params.extend([limit, skip])
    sql = f"""
        SELECT scan_id, project_id, mr_iid, mode, git_ref, triggered_by_user_id,
               started_at, finished_at, status,
               files_count, total_findings,
               critical_count, high_count, medium_count, low_count,
               error_message
          FROM scan_run
          {where_sql}
         ORDER BY started_at DESC
         LIMIT ${len(params) - 1} OFFSET ${len(params)}
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *params)
    return [ScanRunOut(**dict(r)) for r in rows]


@router.get("/scans/{scan_id}", response_model=ScanRunOut)
async def get_scan(scan_id: _uuid.UUID) -> ScanRunOut:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT scan_id, project_id, mr_iid, mode, git_ref, triggered_by_user_id,
                   started_at, finished_at, status,
                   files_count, total_findings,
                   critical_count, high_count, medium_count, low_count,
                   error_message
              FROM scan_run
             WHERE scan_id = $1
            """,
            scan_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="scan not found")
    return ScanRunOut(**dict(row))


async def _resolve_scan_run_id(scan_id: _uuid.UUID) -> int:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id FROM scan_run WHERE scan_id = $1", scan_id
        )
    if not row:
        raise HTTPException(status_code=404, detail="scan not found")
    return int(row["id"])


# ── 查询：finding ──────────────────────────────────────────────────

@router.get("/scans/{scan_id}/findings")
async def list_findings(
    scan_id: _uuid.UUID,
    severity: Optional[str] = Query(default=None),
    service_name: Optional[str] = Query(default=None),
) -> list[dict[str, Any]]:
    scan_run_id = await _resolve_scan_run_id(scan_id)
    sql = """
        SELECT id, rule_id, vulnerability_type, severity,
               endpoint, location, description, evidence,
               payload_hint, service_name, joern_path_id
          FROM vulnerability
         WHERE scan_run_id = $1
    """
    params: list[Any] = [scan_run_id]
    if severity:
        params.append(severity)
        sql += f" AND severity = ${len(params)}"
    if service_name:
        params.append(service_name)
        sql += f" AND service_name = ${len(params)}"
    sql += (
        " ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 "
        "WHEN 'MEDIUM' THEN 2 ELSE 3 END, id"
    )
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *params)
    return [dict(r) for r in rows]


# ── 查询：attack_chain ─────────────────────────────────────────────

@router.get("/scans/{scan_id}/attack-chains")
async def list_attack_chains(scan_id: _uuid.UUID) -> list[dict[str, Any]]:
    scan_run_id = await _resolve_scan_run_id(scan_id)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, endpoints, vulnerability_rule_ids,
                   combined_severity, description
              FROM attack_chain
             WHERE scan_run_id = $1
             ORDER BY id
            """,
            scan_run_id,
        )
    return [dict(r) for r in rows]


# ── 查询：joern_path / services / modules（v3.0 扩展）─────────────

@router.get("/scans/{scan_id}/joern-paths")
async def list_joern_paths(
    scan_id: _uuid.UUID,
    service_name: Optional[str] = Query(default=None),
) -> list[dict[str, Any]]:
    scan_run_id = await _resolve_scan_run_id(scan_id)
    sql = """
        SELECT id, service_name, endpoint, sink_method, source_kind,
               call_chain, file_path, line_number, snippet, created_at
          FROM joern_path
         WHERE scan_run_id = $1
    """
    params: list[Any] = [scan_run_id]
    if service_name:
        params.append(service_name)
        sql += f" AND service_name = ${len(params)}"
    sql += " ORDER BY id"
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *params)
    return [dict(r) for r in rows]


@router.get("/scans/{scan_id}/services")
async def list_services(scan_id: _uuid.UUID) -> dict[str, Any]:
    scan_run_id = await _resolve_scan_run_id(scan_id)
    pool = await get_pool()
    async with pool.acquire() as conn:
        srow = await conn.fetchrow(
            "SELECT services_scanned FROM scan_run WHERE id = $1",
            scan_run_id,
        )
        commit_rows = await conn.fetch(
            """
            SELECT service_name, commit_hash, reused_cache, cpg_built_at
              FROM microservice_commit
             WHERE scan_run_id = $1
             ORDER BY service_name
            """,
            scan_run_id,
        )
    return {
        "services_scanned": list(srow["services_scanned"] or []) if srow else [],
        "commits": [dict(r) for r in commit_rows],
    }


@router.get("/scans/{scan_id}/modules")
async def list_modules(scan_id: _uuid.UUID) -> list[dict[str, Any]]:
    scan_run_id = await _resolve_scan_run_id(scan_id)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT service_name, module_kind, root_path, has_controller, referenced_by
              FROM module_info
             WHERE scan_run_id = $1
             ORDER BY service_name
            """,
            scan_run_id,
        )
    return [dict(r) for r in rows]

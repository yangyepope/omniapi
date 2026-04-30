"""
aisec_audit 库的 CRUD 封装（v3.0 §2.2 / §2.4 / §2.5）。

包含：
- scan_run 创建 / 完成 / 失败标记
- microservice_commit 写入（增量判断依据）
- module_info 写入（公共模块识别结果）
- joern_path 写入（Activity 5 输出）
- vulnerability + attack_chain 批量插入
"""
import logging
import uuid
from typing import Any, Optional

from aisec.db.postgres import get_pool
from aisec.models.vulnerability import (
    AttackChain,
    ScanSummary,
    VulnerabilityResult,
)

logger = logging.getLogger(__name__)


class AuditRepository:
    """全异步、无状态、按需获取连接池。"""

    # ── scan_run ────────────────────────────────────────────────────

    async def get_scan_run_id(self, scan_id: str) -> Optional[int]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM scan_run WHERE scan_id = $1",
                uuid.UUID(scan_id),
            )
        return int(row["id"]) if row else None

    async def create_scan_run(
        self,
        scan_id: str,
        project_id: int,
        mr_iid: Optional[int],
        mode: str,
        git_ref: str,
        triggered_by_user_id: Optional[uuid.UUID],
        workflow_id: Optional[str] = None,
    ) -> int:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO scan_run
                    (scan_id, project_id, mr_iid, mode, git_ref,
                     triggered_by_user_id, status, workflow_id)
                VALUES ($1, $2, $3, $4, $5, $6, 'running', $7)
                RETURNING id
                """,
                uuid.UUID(scan_id), project_id, mr_iid, mode, git_ref,
                triggered_by_user_id, workflow_id,
            )
            return int(row["id"])

    async def mark_failed(self, scan_run_id: int, error_message: str) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE scan_run
                   SET status = 'failed',
                       finished_at = NOW(),
                       error_message = $2
                 WHERE id = $1
                """,
                scan_run_id, error_message[:2000],
            )

    # ── microservice_commit（v3.0 §2.4）─────────────────────────────

    async def upsert_microservice_commit(
        self,
        scan_run_id: int,
        service_name: str,
        commit_hash: str,
        reused_cache: bool,
    ) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO microservice_commit
                    (scan_run_id, service_name, commit_hash, reused_cache)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (scan_run_id, service_name) DO UPDATE
                   SET commit_hash = EXCLUDED.commit_hash,
                       reused_cache = EXCLUDED.reused_cache,
                       cpg_built_at = NOW()
                """,
                scan_run_id, service_name, commit_hash, reused_cache,
            )

    async def latest_commit_for_service(self, service_name: str) -> Optional[str]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT mc.commit_hash
                  FROM microservice_commit mc
                  JOIN scan_run sr ON sr.id = mc.scan_run_id
                 WHERE mc.service_name = $1 AND sr.status = 'completed'
                 ORDER BY mc.cpg_built_at DESC LIMIT 1
                """,
                service_name,
            )
        return row["commit_hash"] if row else None

    # ── module_info（v3.0 §2.3）────────────────────────────────────

    async def save_modules(
        self,
        scan_run_id: int,
        modules: list[dict[str, Any]],
    ) -> None:
        if not modules:
            return
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.executemany(
                """
                INSERT INTO module_info
                    (scan_run_id, service_name, module_kind, root_path,
                     has_controller, referenced_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (scan_run_id, service_name) DO UPDATE
                   SET module_kind = EXCLUDED.module_kind,
                       root_path = EXCLUDED.root_path,
                       has_controller = EXCLUDED.has_controller,
                       referenced_by = EXCLUDED.referenced_by
                """,
                [
                    (
                        scan_run_id,
                        m["service_name"],
                        m["module_kind"],
                        m["root_path"],
                        m.get("has_controller", False),
                        m.get("referenced_by", []),
                    )
                    for m in modules
                ],
            )

    # ── joern_path（v3.0 §2.5）────────────────────────────────────

    async def save_joern_paths(
        self,
        scan_run_id: int,
        paths: list[dict[str, Any]],
    ) -> dict[tuple[str, str, str], int]:
        if not paths:
            return {}
        pool = await get_pool()
        result: dict[tuple[str, str, str], int] = {}
        async with pool.acquire() as conn:
            async with conn.transaction():
                for p in paths:
                    row = await conn.fetchrow(
                        """
                        INSERT INTO joern_path
                            (scan_run_id, service_name, endpoint, sink_method,
                             source_kind, call_chain, file_path, line_number, snippet)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING id
                        """,
                        scan_run_id,
                        p["service_name"],
                        p.get("endpoint"),
                        p["sink_method"],
                        p["source_kind"],
                        p["call_chain"],
                        p["file_path"],
                        p.get("line_number"),
                        p.get("snippet"),
                    )
                    result[(p["service_name"], p["file_path"], p["sink_method"])] = int(row["id"])
        return result

    # ── vulnerability + attack_chain + 总计 ─────────────────────────

    async def save_summary(
        self,
        scan_run_id: int,
        files_count: int,
        services_scanned: list[str],
        summary: ScanSummary,
        joern_path_lookup: Optional[dict[tuple[str, str, str], int]] = None,
    ) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    UPDATE scan_run
                       SET status = 'completed',
                           finished_at = NOW(),
                           files_count = $2,
                           total_findings = $3,
                           critical_count = $4,
                           high_count = $5,
                           medium_count = $6,
                           low_count = $7,
                           services_scanned = $8
                     WHERE id = $1
                    """,
                    scan_run_id,
                    files_count,
                    summary.total_findings,
                    summary.critical_count,
                    summary.high_count,
                    summary.medium_count,
                    summary.low_count,
                    services_scanned,
                )

                if summary.findings:
                    await conn.executemany(
                        """
                        INSERT INTO vulnerability
                            (scan_run_id, rule_id, vulnerability_type, severity,
                             endpoint, location, description, evidence,
                             payload_hint, service_name, joern_path_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        """,
                        [
                            self._row_for_finding(scan_run_id, f, joern_path_lookup or {})
                            for f in summary.findings
                        ],
                    )

                if summary.attack_chains:
                    await conn.executemany(
                        """
                        INSERT INTO attack_chain
                            (scan_run_id, endpoints, vulnerability_rule_ids,
                             combined_severity, description)
                        VALUES ($1, $2, $3, $4, $5)
                        """,
                        [self._row_for_chain(scan_run_id, c) for c in summary.attack_chains],
                    )

        logger.info(
            "scan_run_id=%d saved: findings=%d chains=%d",
            scan_run_id, len(summary.findings), len(summary.attack_chains),
        )

    @staticmethod
    def _row_for_finding(
        scan_run_id: int,
        f: VulnerabilityResult,
        joern_lookup: dict[tuple[str, str, str], int],
    ) -> tuple:
        file_part = f.location.split(":", 1)[0] if f.location else ""
        joern_id = f.joern_path_id
        if joern_id is None and f.service:
            joern_id = joern_lookup.get((f.service, file_part, f.vulnerability_type))
        return (
            scan_run_id,
            f.rule_id,
            f.vulnerability_type,
            f.severity,
            f.endpoint,
            f.location,
            f.description,
            f.evidence,
            f.payload_hint,
            f.service,
            joern_id,
        )

    @staticmethod
    def _row_for_chain(scan_run_id: int, c: AttackChain) -> tuple:
        return (
            scan_run_id,
            c.endpoints,
            c.vulnerabilities,
            c.combined_severity,
            c.description,
        )

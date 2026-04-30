"""
ScanWorkflow（v3.0 §2.2 / §3.2）。

执行顺序（不可变）：
    1. resolve_source_plan      （GitLab 元数据 + 模块识别）
    2. sync_source_files        （按 service+commit 增量下载）
    3. build_cpg                （Joern + resolver + Claude 兜底）
    4. store_cpg                （Neo4j 持久化）
    5. discover_interfaces      （按服务查 Controller 入口）
    6. query_call_chains        （Neo4j 查 Source→Sink）
    7. run_agents               （10 个 Claude Agent 并发分析）
        ├ persist_agent_results （joern_path 落库）
    8. summarize_findings        （Claude 攻击链推断 + 严格 ScanSummary）
    9. publish_results           （PG save_summary + 流量平台回传 + 通知）

任意 Activity 失败 → Temporal 按 RetryPolicy 重试；
Workflow 收到 Cancel Signal → 走 except 路径 mark_failed。
"""
import logging
import uuid as _uuid
from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import CancelledError, ApplicationError

with workflow.unsafe.imports_passed_through():
    from aisec.config import get_settings
    from aisec.db.repository import AuditRepository
    from aisec.temporal.activities import (
        build_cpg,
        discover_interfaces,
        mark_scan_failed,
        persist_agent_results,
        publish_results,
        query_call_chains,
        resolve_source_plan,
        run_agents,
        store_cpg,
        summarize_findings,
        sync_source_files,
    )
    from aisec.temporal.models import (
        BuildCpgInput,
        BuildCpgOutput,
        DiscoverInterfacesInput,
        DiscoverInterfacesOutput,
        PersistAgentResultsInput,
        PublishInput,
        QueryCallChainsInput,
        QueryCallChainsOutput,
        ResolveSourcePlanInput,
        ResolveSourcePlanOutput,
        RunAgentsInput,
        RunAgentsOutput,
        ScanInput,
        StoreCpgInput,
        SummarizeInput,
        SyncSourceInput,
        SyncSourceOutput,
    )

logger = logging.getLogger(__name__)


def _retry(min_minutes: float, max_attempts: int) -> RetryPolicy:
    return RetryPolicy(
        initial_interval=timedelta(seconds=2),
        backoff_coefficient=2.0,
        maximum_interval=timedelta(seconds=60 * min_minutes),
        maximum_attempts=max_attempts,
    )


@workflow.defn(name="ScanWorkflow")
class ScanWorkflow:
    """
    Workflow 不持有 IO；所有外部调用都通过 execute_activity。

    返回 scan_run_id（aisec_audit 主键）。
    """

    @workflow.run
    async def run(self, scan: ScanInput) -> int:
        s = get_settings()

        # 在 Activity 之外用 workflow.now() / workflow.uuid4() 才合法；
        # scan_run_id 由外部 webhook 创建后注入更稳定，但当前实现里仍由
        # publish_results 内部创建 scan_run。为简化，先在前置 Activity
        # 之前预取一次 scan_run_id（PG 行）。
        # 由于此处 workflow 内不能直接做 DB IO，scan_run 的创建挪到了 webhook
        # 路由层 — 路由先 INSERT scan_run（status=running）再 start_workflow。
        # 因此 ScanInput 字段里的 scan_run_id 由路由经 ScanInput 透传过来。
        scan_run_id = workflow.info().run_id  # placeholder，真正 id 在路由侧
        # ↑ 仅用作 Workflow Info；下游 Activity 仍用 ScanInput.scan_id 关联

        try:
            # ── A1: resolve source plan ────────────────────────────
            plan: ResolveSourcePlanOutput = await workflow.execute_activity(
                resolve_source_plan,
                ResolveSourcePlanInput(
                    scan_id=scan.scan_id,
                    project_id=scan.project_id,
                    mode=scan.mode,
                    git_ref=scan.git_ref,
                    mr_iid=scan.mr_iid,
                ),
                start_to_close_timeout=timedelta(minutes=s.AUDIT_TIMEOUT_SOURCE_SYNC_MIN),
                retry_policy=_retry(0.5, 3),
            )
            if not plan.services:
                workflow.logger.info("no services to scan, exit early scan_id=%s", scan.scan_id)
                return 0

            # 真正的 scan_run_id 通过一次 publish 的 fetch 拿；此处先用 0 占位
            # （下面 Activity 都不直接依赖 scan_run_id 的真实值，统一靠 scan_id）
            real_scan_run_id = await self._resolve_scan_run_id(scan.scan_id)

            # ── A2: sync source ────────────────────────────────────
            sync_out: SyncSourceOutput = await workflow.execute_activity(
                sync_source_files,
                SyncSourceInput(
                    scan_run_id=real_scan_run_id,
                    project_id=scan.project_id,
                    git_ref=plan.resolved_ref,
                    services=plan.services,
                ),
                start_to_close_timeout=timedelta(minutes=s.AUDIT_TIMEOUT_SOURCE_SYNC_MIN),
                heartbeat_timeout=timedelta(seconds=s.JOERN_HEARTBEAT_SEC),
                retry_policy=_retry(0.5, 3),
            )

            # ── A3: build CPG（最长） ───────────────────────────────
            cpg_out: BuildCpgOutput = await workflow.execute_activity(
                build_cpg,
                BuildCpgInput(
                    scan_run_id=real_scan_run_id,
                    project_id=scan.project_id,
                    services=plan.services,
                    file_map_per_service=sync_out.file_map_per_service,
                ),
                start_to_close_timeout=timedelta(minutes=s.AUDIT_TIMEOUT_BUILD_CPG_MIN),
                heartbeat_timeout=timedelta(seconds=s.JOERN_HEARTBEAT_SEC * 5),
                retry_policy=_retry(1.0, 1),
            )

            # ── A4: store CPG to Neo4j ─────────────────────────────
            await workflow.execute_activity(
                store_cpg,
                StoreCpgInput(artifacts=cpg_out.artifacts),
                start_to_close_timeout=timedelta(minutes=s.AUDIT_TIMEOUT_STORE_NEO4J_MIN),
                retry_policy=_retry(0.25, 3),
            )

            # ── A5: discover interfaces ────────────────────────────
            disc_out: DiscoverInterfacesOutput = await workflow.execute_activity(
                discover_interfaces,
                DiscoverInterfacesInput(services=plan.services),
                start_to_close_timeout=timedelta(minutes=s.AUDIT_TIMEOUT_DISCOVER_MIN),
                retry_policy=_retry(0.25, 3),
            )

            # ── A6: query call chains ──────────────────────────────
            chains_out: QueryCallChainsOutput = await workflow.execute_activity(
                query_call_chains,
                QueryCallChainsInput(discovered=disc_out.discovered),
                start_to_close_timeout=timedelta(minutes=s.AUDIT_TIMEOUT_QUERY_CHAIN_MIN),
                retry_policy=_retry(0.25, 3),
            )

            # 把每个 Joern 路径落库
            await workflow.execute_activity(
                persist_agent_results,
                PersistAgentResultsInput(
                    scan_run_id=real_scan_run_id,
                    joern_paths=chains_out.joern_paths,
                ),
                start_to_close_timeout=timedelta(minutes=s.AUDIT_TIMEOUT_PERSIST_MIN),
                retry_policy=_retry(0.25, 3),
            )

            # ── A7: run 10 agents（最贵） ─────────────────────────
            agents_out: RunAgentsOutput = await workflow.execute_activity(
                run_agents,
                RunAgentsInput(
                    scan_id=scan.scan_id,
                    project_id=scan.project_id,
                    services=plan.services,
                    neo4j_context=chains_out.neo4j_context,
                    file_map_per_service=sync_out.file_map_per_service,
                    critical_files=chains_out.critical_files,
                ),
                start_to_close_timeout=timedelta(minutes=s.AUDIT_TIMEOUT_AGENTS_MIN),
                heartbeat_timeout=timedelta(minutes=5),
                retry_policy=_retry(1.0, 2),
            )

            # ── A8: summarize ──────────────────────────────────────
            sum_out = await workflow.execute_activity(
                summarize_findings,
                SummarizeInput(
                    scan_id=scan.scan_id,
                    project_id=scan.project_id,
                    mode=scan.mode,
                    agent_findings=agents_out.agent_findings,
                ),
                start_to_close_timeout=timedelta(minutes=s.AUDIT_TIMEOUT_SUMMARIZE_MIN),
                retry_policy=_retry(0.5, 2),
            )

            # 取 joern_path_lookup（A6 已经把 joern_paths 写进 PG，这里反查 id 映射）
            lookup_dict = await self._resolve_joern_path_lookup(real_scan_run_id)

            # ── A9: publish + notify ───────────────────────────────
            files_count = sum(len(m) for m in sync_out.file_map_per_service.values())
            services_scanned = [s["service_name"] for s in plan.services]
            await workflow.execute_activity(
                publish_results,
                PublishInput(
                    scan_run_id=real_scan_run_id,
                    scan_id=scan.scan_id,
                    project_id=scan.project_id,
                    summary=sum_out.summary,
                    services_scanned=services_scanned,
                    files_count=files_count,
                    joern_path_lookup=lookup_dict,
                ),
                start_to_close_timeout=timedelta(minutes=s.AUDIT_TIMEOUT_PUBLISH_MIN),
                retry_policy=_retry(0.25, 3),
            )

            return real_scan_run_id

        except CancelledError:
            workflow.logger.warning("scan cancelled: %s", scan.scan_id)
            await workflow.execute_activity(
                mark_scan_failed,
                args=[await self._resolve_scan_run_id(scan.scan_id), "cancelled by signal"],
                start_to_close_timeout=timedelta(minutes=1),
            )
            raise
        except ApplicationError as exc:
            workflow.logger.exception("scan failed: %s", scan.scan_id)
            await workflow.execute_activity(
                mark_scan_failed,
                args=[await self._resolve_scan_run_id(scan.scan_id), str(exc)[:1500]],
                start_to_close_timeout=timedelta(minutes=1),
            )
            raise

    # ── 辅助：通过本地 helper 拿真实 scan_run_id ────────────────────
    async def _resolve_scan_run_id(self, scan_id: str) -> int:
        """
        Workflow 内不能直接开 DB 连接；通过一个轻 Activity 取 scan_run_id。
        """
        return await workflow.execute_activity(
            _fetch_scan_run_id_activity,
            scan_id,
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=_retry(0.1, 3),
        )

    async def _resolve_joern_path_lookup(self, scan_run_id: int) -> dict[str, int]:
        return await workflow.execute_activity(
            _fetch_joern_path_lookup_activity,
            scan_run_id,
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=_retry(0.1, 3),
        )


# ── 把 helper Activity 也暴露注册（在 worker.py 里 register） ──────
from temporalio import activity  # noqa: E402


@activity.defn(name="_fetch_scan_run_id")
async def _fetch_scan_run_id_activity(scan_id: str) -> int:
    repo = AuditRepository()
    sid = await repo.get_scan_run_id(scan_id)
    if sid is None:
        # 兜底：路由层应已 INSERT；若没有，这里创建一条占位
        sid = await repo.create_scan_run(
            scan_id=scan_id,
            project_id=0,
            mr_iid=None,
            mode="full",
            git_ref="HEAD",
            triggered_by_user_id=None,
            workflow_id=None,
        )
    return sid


@activity.defn(name="_fetch_joern_path_lookup")
async def _fetch_joern_path_lookup_activity(scan_run_id: int) -> dict[str, int]:
    """从 PG 读取 joern_path 表，构造与 vulnerability 关联用的 lookup map。"""
    from aisec.db.postgres import get_pool

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, service_name, file_path, sink_method
              FROM joern_path
             WHERE scan_run_id = $1
            """,
            scan_run_id,
        )
    return {
        f"{r['service_name']}|{r['file_path']}|{r['sink_method']}": int(r["id"])
        for r in rows
    }

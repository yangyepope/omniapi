"""
Temporal Worker 入口（v3.0 §3）。

启动方式（compose 内）：
    python -m aisec.temporal.worker
"""
import asyncio
import logging
import os

from temporalio.client import Client
from temporalio.worker import Worker

from aisec.config import get_settings
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
from aisec.temporal.scheduler import register_schedules
from aisec.temporal.workflows import (
    ScanWorkflow,
    _fetch_joern_path_lookup_activity,
    _fetch_scan_run_id_activity,
)


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    logger = logging.getLogger(__name__)

    s = get_settings()
    target = os.environ.get("TEMPORAL_HOST") or s.TEMPORAL_HOST
    namespace = os.environ.get("TEMPORAL_NAMESPACE") or s.TEMPORAL_NAMESPACE
    task_queue = s.TEMPORAL_TASK_QUEUE

    logger.info("connecting to temporal: %s namespace=%s", target, namespace)
    client = await Client.connect(target, namespace=namespace)

    # 注册定时任务（幂等：已存在则跳过）
    try:
        n = await register_schedules(client)
        logger.info("schedules registered: %d", n)
    except Exception as exc:  # noqa: BLE001
        logger.warning("schedule registration failed: %s", exc)

    worker = Worker(
        client,
        task_queue=task_queue,
        workflows=[ScanWorkflow],
        activities=[
            resolve_source_plan,
            sync_source_files,
            build_cpg,
            store_cpg,
            discover_interfaces,
            query_call_chains,
            run_agents,
            persist_agent_results,
            summarize_findings,
            publish_results,
            mark_scan_failed,
            _fetch_scan_run_id_activity,
            _fetch_joern_path_lookup_activity,
        ],
        max_concurrent_activities=10,
    )
    logger.info("worker started, task_queue=%s", task_queue)
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())

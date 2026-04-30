"""
Temporal Schedule 注册（v3.0 §1.5 / §3.5）。

启动 worker 时调用，确保 SCHEDULED_SCAN_PROJECTS 中每个项目都有一条
cron schedule 触发 ScanWorkflow（mode=full）。

Schedule ID 规则：scheduled-{project_id}
"""
import logging
from datetime import datetime
from typing import Optional

from temporalio.client import Client, Schedule, ScheduleActionStartWorkflow, ScheduleSpec, ScheduleIntervalSpec, ScheduleCalendarSpec
from temporalio.client import ScheduleAlreadyRunningError  # type: ignore[attr-defined]
from temporalio.common import RetryPolicy

from aisec.config import get_settings, scheduled_scan_project_ids
from aisec.temporal.cancel import make_workflow_id
from aisec.temporal.models import ScanInput

logger = logging.getLogger(__name__)


def _parse_cron(expr: str) -> ScheduleSpec:
    """
    Temporal Python SDK 1.7+ 支持 cron 字符串通过 cron_expressions 字段。
    简化处理：把 cron 字符串直接塞到 ScheduleSpec.cron_expressions。
    """
    return ScheduleSpec(cron_expressions=[expr])


async def register_schedules(client: Client) -> int:
    """注册所有定时任务，返回成功注册（含已存在）数量。"""
    s = get_settings()
    project_ids = scheduled_scan_project_ids()
    if not project_ids:
        logger.info("SCHEDULED_SCAN_PROJECTS empty, skip schedule registration")
        return 0

    spec = _parse_cron(s.SCHEDULED_SCAN_CRON)
    count = 0
    for pid in project_ids:
        sched_id = f"scheduled-{pid}"
        wf_id = make_workflow_id("scheduled", pid, date=datetime.utcnow().strftime("%Y%m%d"))
        scan_input = ScanInput(
            scan_id="<placeholder>",  # 由触发时由 sched 自动 patch；为保持类型严格，由 webhook 启动模式不用此 id
            project_id=pid,
            mode="full",
            git_ref="main",
        )
        action = ScheduleActionStartWorkflow(
            "ScanWorkflow",
            scan_input,
            id=wf_id,
            task_queue=s.TEMPORAL_TASK_QUEUE,
            retry_policy=RetryPolicy(maximum_attempts=2),
        )
        schedule = Schedule(action=action, spec=spec)
        try:
            await client.create_schedule(sched_id, schedule)
            logger.info("schedule created: %s cron=%s", sched_id, s.SCHEDULED_SCAN_CRON)
            count += 1
        except Exception as exc:  # noqa: BLE001 - 已存在等场景跳过
            msg = str(exc)
            if "already exists" in msg.lower() or "AlreadyExists" in msg:
                logger.info("schedule already exists: %s", sched_id)
                count += 1
                continue
            logger.warning("create schedule failed: %s err=%s", sched_id, msg)
    return count

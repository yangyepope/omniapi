"""
Workflow ID 规则 + Cancel Signal（v3.0 §3.5）。

Workflow ID 规则：
    MR        : {prefix}-{project_id}-mr-{mr_iid}
    push      : {prefix}-{project_id}-push-{commit}
    scheduled : {prefix}-{project_id}-scheduled-{YYYYMMDD}
"""
import logging
from datetime import datetime
from typing import Literal, Optional

from temporalio.client import Client
from temporalio.service import RPCError

from aisec.config import get_settings

logger = logging.getLogger(__name__)

WorkflowKind = Literal["mr", "push", "scheduled"]


def make_workflow_id(
    kind: WorkflowKind,
    project_id: int,
    *,
    mr_iid: Optional[int] = None,
    commit: Optional[str] = None,
    date: Optional[str] = None,
) -> str:
    prefix = get_settings().WORKFLOW_ID_PREFIX
    if kind == "mr":
        if mr_iid is None:
            raise ValueError("mr_iid required for kind=mr")
        return f"{prefix}-{project_id}-mr-{mr_iid}"
    if kind == "push":
        if not commit:
            raise ValueError("commit required for kind=push")
        return f"{prefix}-{project_id}-push-{commit[:12]}"
    if kind == "scheduled":
        date = date or datetime.utcnow().strftime("%Y%m%d")
        return f"{prefix}-{project_id}-scheduled-{date}"
    raise ValueError(f"unknown kind: {kind}")


async def cancel_existing_workflow(client: Client, wf_id: str) -> bool:
    """
    若同 ID 的 Workflow 还在 Running，发送 Cancel Signal 并返回 True；
    否则返回 False。
    """
    try:
        handle = client.get_workflow_handle(wf_id)
        desc = await handle.describe()
        # 只取 RUNNING / EXECUTION_RUNNING 状态
        status = getattr(desc, "status", None)
        # Temporal Python SDK 返回 WorkflowExecutionStatus 枚举
        if status and getattr(status, "name", "") in ("RUNNING", "EXECUTION_RUNNING"):
            await handle.cancel()
            logger.info("cancelled previous workflow: %s", wf_id)
            return True
    except RPCError as exc:
        # NOT_FOUND 表示无该 Workflow，正常
        if "NOT_FOUND" in str(exc):
            return False
        logger.warning("cancel check rpc error: %s", exc)
    except Exception as exc:  # noqa: BLE001
        logger.warning("cancel check unexpected error: %s", exc)
    return False

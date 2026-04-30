"""
GitLab Webhook 入口（v3.0 §1.2 / §1.5）。

POST /api/webhook
  - X-Gitlab-Token 校验
  - object_kind=merge_request / push 分别走 incremental / full
  - 启动前先按 Workflow ID 规则取消旧任务（v3.0 §3.5）
"""
import logging
import uuid as _uuid
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Header, HTTPException, Request, status

from aisec.config import get_settings
from aisec.db.repository import AuditRepository
from aisec.temporal.cancel import cancel_existing_workflow, make_workflow_id
from aisec.temporal.client import get_temporal_client
from aisec.temporal.models import ScanInput

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/webhook", status_code=status.HTTP_202_ACCEPTED)
async def gitlab_webhook(
    request: Request,
    x_gitlab_token: Annotated[Optional[str], Header(alias="X-Gitlab-Token")] = None,
) -> dict[str, Any]:
    s = get_settings()
    if s.GITLAB_WEBHOOK_SECRET and x_gitlab_token != s.GITLAB_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid webhook token")

    payload = await request.json()
    kind = payload.get("object_kind")
    accepted: list[dict[str, str]] = []
    client = await get_temporal_client()
    repo = AuditRepository()

    if kind == "merge_request":
        attrs = payload.get("object_attributes") or {}
        action = attrs.get("action")
        if action in ("open", "update", "reopen"):
            project_id = payload["project"]["id"]
            mr_iid = attrs["iid"]
            wf_id = make_workflow_id("mr", project_id, mr_iid=mr_iid)
            await cancel_existing_workflow(client, wf_id)
            scan_id = str(_uuid.uuid4())
            await repo.create_scan_run(
                scan_id=scan_id,
                project_id=project_id,
                mr_iid=mr_iid,
                mode="incremental",
                git_ref=attrs.get("source_branch", "HEAD"),
                triggered_by_user_id=None,
                workflow_id=wf_id,
            )
            await client.start_workflow(
                "ScanWorkflow",
                ScanInput(
                    scan_id=scan_id,
                    project_id=project_id,
                    mode="incremental",
                    mr_iid=mr_iid,
                    git_ref=attrs.get("source_branch", "HEAD"),
                ),
                id=wf_id,
                task_queue=s.TEMPORAL_TASK_QUEUE,
            )
            accepted.append({"scan_id": scan_id, "workflow_id": wf_id})

    elif kind == "push":
        ref = payload.get("ref", "")
        if ref == "refs/heads/main":
            project_id = payload["project"]["id"]
            commit = payload.get("after", "main")
            wf_id = make_workflow_id("push", project_id, commit=commit)
            await cancel_existing_workflow(client, wf_id)
            scan_id = str(_uuid.uuid4())
            await repo.create_scan_run(
                scan_id=scan_id,
                project_id=project_id,
                mr_iid=None,
                mode="full",
                git_ref=commit,
                triggered_by_user_id=None,
                workflow_id=wf_id,
            )
            await client.start_workflow(
                "ScanWorkflow",
                ScanInput(
                    scan_id=scan_id,
                    project_id=project_id,
                    mode="full",
                    git_ref=commit,
                ),
                id=wf_id,
                task_queue=s.TEMPORAL_TASK_QUEUE,
            )
            accepted.append({"scan_id": scan_id, "workflow_id": wf_id})

    return {"status": "accepted", "scans": accepted}

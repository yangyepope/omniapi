"""GitLab Webhook + 手动扫描触发路由（v3.0 §5 api/）。"""

from fastapi import APIRouter

from aisec.api.scan import router as scan_router
from aisec.api.webhook import router as webhook_router

router = APIRouter()
router.include_router(webhook_router)
router.include_router(scan_router)

__all__ = ["router"]

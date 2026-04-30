"""
扫描结论回传到 omniapi 流量采集平台（v3.0 §2.2 Activity 9）。

策略：HTTP API（service-to-service）。
- POST {TRAFFIC_PLATFORM_URL}/api/v1/internal/security-findings
- 头：Authorization: Bearer <TRAFFIC_PLATFORM_TOKEN>
- 体：scan_id / project_id / summary（ScanSummary 序列化）

omniapi backend 内部接收后，按接口归档为 FlowTag + 派生 Variant。
"""
import logging
from typing import Any

import httpx

from aisec.config import get_settings
from aisec.models.vulnerability import ScanSummary

logger = logging.getLogger(__name__)


class TrafficPublisher:
    """异步推送扫描结论到 omniapi 流量采集平台。"""

    async def publish(
        self,
        scan_id: str,
        project_id: int,
        summary: ScanSummary,
    ) -> dict[str, Any]:
        s = get_settings()
        if not s.TRAFFIC_PLATFORM_URL:
            logger.warning("TRAFFIC_PLATFORM_URL not set, skip publish")
            return {"status": "skipped", "reason": "missing_url"}

        headers = {"Content-Type": "application/json"}
        if s.TRAFFIC_PLATFORM_TOKEN:
            headers["Authorization"] = f"Bearer {s.TRAFFIC_PLATFORM_TOKEN}"

        payload: dict[str, Any] = {
            "scan_id": scan_id,
            "project_id": project_id,
            "summary": summary.model_dump(),
        }
        url = s.TRAFFIC_PLATFORM_URL.rstrip("/") + "/api/v1/internal/security-findings"

        async with httpx.AsyncClient(timeout=60) as client:
            try:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json() or {}
            except httpx.HTTPError as exc:
                logger.exception("publish failed: %s", exc)
                return {"status": "failed", "error": str(exc)}

        logger.info(
            "traffic publish ok: scan=%s tagged=%s variants=%s skipped=%s",
            scan_id,
            data.get("tagged"),
            data.get("variants"),
            data.get("skipped"),
        )
        return {"status": "ok", **data}

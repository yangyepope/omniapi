"""Temporal client helper（懒初始化单例）。"""
import logging
from typing import Optional

from temporalio.client import Client

from aisec.config import get_settings

logger = logging.getLogger(__name__)
_client: Optional[Client] = None


async def get_temporal_client() -> Client:
    global _client
    if _client is None:
        s = get_settings()
        _client = await Client.connect(s.TEMPORAL_HOST, namespace=s.TEMPORAL_NAMESPACE)
        logger.info("temporal client connected: %s", s.TEMPORAL_HOST)
    return _client


async def close_temporal_client() -> None:
    global _client
    _client = None

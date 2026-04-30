"""asyncpg 连接池（独立于 omniapi 主库）。"""
import logging
from typing import Optional

import asyncpg

from aisec.config import get_settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    """惰性创建并返回单例池。"""
    global _pool
    if _pool is None:
        dsn = get_settings().AI_AUDIT_POSTGRES_DSN
        _pool = await asyncpg.create_pool(dsn, min_size=1, max_size=10)
        logger.info("aisec asyncpg pool initialized")
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def reset_pool() -> None:
    """供新 event loop 起点调用。"""
    global _pool
    _pool = None

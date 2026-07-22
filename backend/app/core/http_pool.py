import httpx
from loguru import logger
from typing import Optional

class HTTPPool:
    """
    [职责]：SecurityPlatform 全局 HTTP 连接池单例。
    [设计意图]：
    1. 10 万级并发下，必须通过 Keep-Alive 复用 TCP 连接，避免端口耗尽。
    2. 支持异步 (Asyncio) 与 同步 (Gevent/Monkey-patched) 两种访问模式。
    """
    _async_instance: Optional[httpx.AsyncClient] = None
    _sync_instance: Optional[httpx.Client] = None

    @classmethod
    async def get_async_client(cls) -> httpx.AsyncClient:
        """获取异步客户端（用于 FastAPI 主进程或 Prefork Worker）"""
        if cls._async_instance is None or cls._async_instance.is_closed:
            logger.info("📡 [HTTP Pool] Initializing global ASYNC client...")
            limits = httpx.Limits(max_connections=5000, max_keepalive_connections=2000)
            cls._async_instance = httpx.AsyncClient(
                verify=False,
                timeout=httpx.Timeout(20.0, connect=5.0),
                limits=limits,
                follow_redirects=True,
                headers={"User-Agent": "SecurityPlatform-HighScale-Replayer/2.0 (async)"}
            )
        return cls._async_instance

    @classmethod
    def get_sync_client(cls) -> httpx.Client:
        """
        获取同步客户端（用于 Gevent Worker）。
        [Why]：在 Gevent 模式下，同步阻塞调用会被 monkey-patch 自动转为非阻塞协程。
        """
        if cls._sync_instance is None or cls._sync_instance.is_closed:
            logger.info("📡 [HTTP Pool] Initializing global SYNC client (Gevent Optimized)...")
            # 同样配置高性能连接池
            limits = httpx.Limits(max_connections=5000, max_keepalive_connections=2000)
            cls._sync_instance = httpx.Client(
                verify=False,
                timeout=httpx.Timeout(20.0, connect=5.0),
                limits=limits,
                follow_redirects=True,
                headers={"User-Agent": "SecurityPlatform-HighScale-Replayer/2.0 (gevent-sync)"}
            )
        return cls._sync_instance

    @classmethod
    async def close_all(cls):
        """关闭所有连接池"""
        if cls._async_instance:
            await cls._async_instance.aclose()
        if cls._sync_instance:
            cls._sync_instance.close()
        logger.warning("🔌 [HTTP Pool] All connections closed.")

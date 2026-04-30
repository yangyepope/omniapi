"""joern-runner HTTP 客户端（v3.0 §2.2 Activity 2）。"""
import logging
from typing import Any

import httpx

from aisec.config import get_settings

logger = logging.getLogger(__name__)


class JoernClient:
    def __init__(self) -> None:
        s = get_settings()
        self.base = s.JOERN_RUNNER_URL.rstrip("/")
        self.timeout = httpx.Timeout(connect=10.0, read=3600.0, write=60.0, pool=10.0)

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self.base}/health")
                return resp.status_code == 200
        except Exception:
            return False

    async def analyze(
        self,
        service_name: str,
        src_dir: str,
        commit_hash: str,
    ) -> dict[str, Any]:
        """
        请求 joern-runner 分析单个微服务源码目录。

        返回 JSON 结构：
        {
          "service_name": "sts",
          "commit_hash": "abc123",
          "cpg_path": "/var/cache/aisec/cpg/sts/abc123/cpg.bin",
          "nodes": {
              "endpoints": [...], "controllers": [...], "methods": [...],
              "calls": [...], "sql_sinks": [...], "feign_calls": [...]
          },
          "paths": [
              {"sink_method": "...", "source_kind": "...", "call_chain": [...],
               "file_path": "...", "line_number": ..., "snippet": "..."}
          ]
        }
        """
        payload = {
            "service_name": service_name,
            "src_dir": src_dir,
            "commit_hash": commit_hash,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(f"{self.base}/analyze", json=payload)
            resp.raise_for_status()
            return resp.json()

    async def clear_cache(self, service_name: str) -> None:
        async with httpx.AsyncClient(timeout=30) as client:
            await client.post(
                f"{self.base}/clear-cache", json={"service_name": service_name}
            )

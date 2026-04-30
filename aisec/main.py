"""
aisec FastAPI 入口（v3.0 §5 main.py）。

启动命令：
    uvicorn aisec.main:app --host 0.0.0.0 --port 8000

承担职责：
- 收 GitLab Webhook
- 手动触发全量扫描
- 提供扫描记录 / 漏洞 / 攻击链 / Joern 路径等查询接口

不承担 Temporal Activity 执行 — 那是 aisec-worker 的事。
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from aisec.api import router as api_router
from aisec.config import get_settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ANN001 — FastAPI 类型推断
    """启动 / 关闭钩子。"""
    s = get_settings()
    logger.info(
        "aisec api startup: gitlab=%s temporal=%s neo4j=%s",
        s.GITLAB_URL or "<unset>", s.TEMPORAL_HOST, s.NEO4J_URI,
    )
    yield
    # 关闭时清理资源
    from aisec.cpg.neo4j_client import close_driver as close_neo4j
    from aisec.db.postgres import close_pool as close_pg
    await close_neo4j()
    await close_pg()


app = FastAPI(
    title="aisec",
    description="AI 驱动安全渗透测试扫描平台",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(api_router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}

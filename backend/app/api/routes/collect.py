"""
文件职责：接收 Nginx 或其他代理转发过来的镜像流量 (Mirror Traffic)。
目录原因：属于外部流量入口，因此放置在 app/api/routes/ 目录下。
接入方式：在 app/main.py 中通过 app.include_router(collect.router, prefix="/v1") 独立注册，避免被全局的 /api/v1 前缀影响。
"""

import json

from fastapi import APIRouter, Request, Response, status
from loguru import logger
from sqlmodel import select

from app.api.deps import SessionDep
from app.models import GlobalConfig
from app.worker import process_mirror_traffic_task

router = APIRouter(prefix="/collect", tags=["collect"])

# [接口完整路径]: POST /v1/collect/
# [设计意图]：作为 Nginx 镜像流量的接收端。接收并记录 Nginx 转发过来的真实流量信息。
# [参数说明]：request: Request 对象，包含从 Nginx 镜像过来的完整 HTTP 请求信息（Headers, Body 等）。
# [注意]：异常必须全量捕获，无论如何都要返回 204，避免阻塞或影响上游。
@router.post(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Collect Mirror Traffic",
    description="Endpoint to receive asynchronous mirror traffic from Nginx. Returns 204 immediately.",
    response_class=Response,
)
@router.post(
    "/",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Collect Mirror Traffic",
    description="Endpoint to receive asynchronous mirror traffic from Nginx. Returns 204 immediately.",
    response_class=Response,
    include_in_schema=False,
)
@router.get("")
@router.get("/")
@router.put("")
@router.put("/")
@router.delete("")
@router.delete("/")
async def collect_traffic(request: Request, session: SessionDep) -> Response:
    try:
        # 1. 检查全局流量采集开关
        # 为了极速响应，这里从 DB 同步读取配置（后续可优化为 Redis 缓存）
        statement = select(GlobalConfig).where(GlobalConfig.key == "traffic_collection_enabled")
        config = session.exec(statement).first()
        if config and config.value.lower() == "false":
            # 如果开关关闭，直接丢弃流量并返回 204
            return Response(status_code=status.HTTP_204_NO_CONTENT)

        # 获取原始请求体和 Headers。使用 await 异步读取，防止阻塞
        body = await request.body()
        headers = dict(request.headers)

        # 提取 Nginx 配置中专门透传的 Headers
        original_method = headers.get('x-original-method', request.method)
        original_uri = headers.get('x-original-uri', request.url.path)
        real_ip = headers.get('x-real-ip', getattr(request.client, 'host', 'Unknown'))

        # 尝试将 body 解析为字符串；如果是二进制无法解码则保留其 repr 表示
        try:
            body_str = body.decode('utf-8')
        except UnicodeDecodeError:
            body_str = repr(body)

        # 打印清晰的日志，方便在控制台查看接收到的流量
        logger.info(
            f"🟢 [Mirror Traffic Received]\n"
            f"   ├─ Original Request: {original_method} {original_uri}\n"
            f"   ├─ Real IP: {real_ip}\n"
            f"   ├─ Headers: {json.dumps(headers, indent=2, ensure_ascii=False)}\n"
            f"   └─ Body Length: {len(body)} bytes\n"
            f"   └─ Body Preview: {body_str[:500]}"
        )

        # 将流量交给 Celery 异步处理，推导为 ApiAsset 并存入数据库
        process_mirror_traffic_task.delay(
            method=original_method,
            uri=original_uri,
            headers=headers,
            body_str=body_str,
            source_ip=real_ip
        )

    except Exception as e:
        # 捕获所有异常，确保绝对不会向上游 Nginx 返回 500 错误
        logger.error(f"🔴 Error processing mirror traffic: {e}")

    # 根据 HTTP 规范，处理成功但无内容返回时使用 204 状态码
    return Response(status_code=status.HTTP_204_NO_CONTENT)

"""
文件职责：接收 Nginx 或其他代理转发过来的镜像流量 (Mirror Traffic)。
目录原因：属于外部流量入口，因此放置在 app/api/routes/ 目录下。
接入方式：在 app/main.py 中通过 app.include_router(collect.router, prefix="/v1") 独立注册，避免被全局的 /api/v1 前缀影响。
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Request, Response, status
from loguru import logger
from sqlmodel import select

from app.api.deps import SessionDep
from app.models import GlobalConfig, RawFlow
from app.worker import process_raw_flow_task

router = APIRouter(prefix="/collect", tags=["collect"])

# [接口完整路径]: POST /v1/collect
# [设计意图]：作为流量采集的第一站，实现“极速入库”模式。
@router.post(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Collect Mirror Traffic",
    description="Endpoint for Step 1: Immediate ingestion into RawFlow table.",
    response_class=Response,
)
@router.post(
    "/",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
    response_class=Response,
)
async def collect_traffic(request: Request, session: SessionDep) -> Response:
    try:
        # --- 1. 采集开关与回流拦截校验 ---
        # 物理物理加固：即便 DB 出错也默认放行采集
        config_map = {"traffic_collection_enabled": True, "loopback_interception_enabled": True}
        try:
            keys = ["traffic_collection_enabled", "loopback_interception_enabled"]
            configs = session.exec(select(GlobalConfig).where(GlobalConfig.key.in_(keys))).all()
            if configs:
                config_map.update({c.key: c.value.lower() == "true" for c in configs})
        except Exception as db_err:
            logger.warning(f"⚠️ [Governance Config Fail] Defaulting to safe capture: {db_err}")

        # 第一道防线：全局采集开关
        if not config_map.get("traffic_collection_enabled", True):
            logger.debug("⏸️ [Traffic Coll. Disabled] Ignoring incoming flow per governance config.")
            return Response(status_code=status.HTTP_204_NO_CONTENT)

        # 第二道防线：回流流量拦截 (Loopback Detection)
        if config_map.get("loopback_interception_enabled", True):
            if request.headers.get("X-AAM-Replay") == "true":
                logger.warning("🚫 [Loopback Blocked] Detected X-AAM-Replay header")
                return Response(status_code=status.HTTP_204_NO_CONTENT)

        # --- 2. 原始报文读取 ---
        # 异步读取 Body 并获取请求头字典
        body = await request.body()
        raw_headers = dict(request.headers)

        # --- 3. 核心字段提取 (Step 1 要求) ---
        # 获取由 Nginx Mirror 模块透传的原始 URI 和方法
        original_method = raw_headers.get('x-original-method', request.method)
        original_uri = raw_headers.get('x-original-uri', request.url.path)
        real_ip = raw_headers.get('x-real-ip', getattr(request.client, 'host', 'Unknown'))
        
        # [服务名称提取逻辑]：取 URL Path 的第一层（例如 /api/v1/users -> api）
        path_parts = [p for p in original_uri.split('/') if p]
        service_name = path_parts[0] if path_parts else "default"

        # --- 4. 实例化原始流量对象 ---
        # 毫秒级时间戳由数据库默认值工厂或此处显式生成
        raw_flow = RawFlow(
            service_name=service_name,
            captured_at=datetime.now(timezone.utc),
            method=original_method,
            interface_path=original_uri,
            headers=raw_headers,
            body=body,
            body_size=len(body),
            client_ip=real_ip,
            parsed=False,
            deduped=False
        )

        # --- 5. 即时存库 ---
        # 将原始报文存入数据库，作为审计和后续解析的唯一证据
        session.add(raw_flow)
        session.commit()
        session.refresh(raw_flow)

        # 打印摄入日志，包含 ID 以便分布式追踪
        logger.info(f"✅ [RawFlow Created] ID: {raw_flow.id} | Service: {service_name} | Method: {original_method}")

        # --- 6. 异步移交 ---
        # 仅向异步任务池发送记录 ID，由 Worker 完成去重和路径发现逻辑
        process_raw_flow_task.delay(raw_flow_id=str(raw_flow.id))

    except Exception as e:
        # 全量异常捕获，确保镜像流量接收端点永不返回 500
        logger.error(f"🔴 Traffic collection failed: {e}")

    # 根据 HTTP 规范，处理成功但无内容返回时使用 204 状态码
    return Response(status_code=status.HTTP_204_NO_CONTENT)

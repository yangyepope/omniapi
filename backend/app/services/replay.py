import time
from datetime import datetime, timezone
import httpx
from sqlmodel import Session, select
from app.models import Variant
from loguru import logger

class ReplayEngine:
    """
    [职责]：负责执行 API 变体的重放攻击，并将结果持久化。
    [核心逻辑]：
    1. 从数据库读取 Variant 配置（含已脱壳的 Headers）。
    2. 使用 httpx 发送真实的异步请求。
    3. 记录响应码、报文体、延迟及时间戳。
    """
    
    @staticmethod
    async def execute_variant(variant_id: str, session: Session) -> Variant:
        # 1. 获取变体定义
        import uuid
        v_uuid = uuid.UUID(variant_id) if isinstance(variant_id, str) else variant_id
        variant = session.get(Variant, v_uuid)
        
        if not variant:
            raise ValueError(f"Variant {variant_id} not found")
            
        logger.info(f"🚀 [Replay] Executing variant: {variant.name} ({variant.method} {variant.url})")
        
        # 2. 构造请求参数
        # 这里的 headers 已经过 collect.py 和清洗脚本的处理，是纯净的业务 Headers
        headers = variant.headers or {}
        # 注入身份特征，防止采集器自我循环采集 (Loopback Prevention)
        headers["X-OmniAPI-Replay"] = "true"
        headers["User-Agent"] = "OmniAPI-Replayer/1.0"
        
        method = variant.method or "GET"
        
        # 协议补全逻辑：如果 URL 缺少协议头，则进行补全
        url = variant.url
        if url.startswith("/"):
            # 优先方案：从 Host 头还原，若无则使用 localhost 兜底
            host = headers.get("Host") or headers.get("host") or "localhost:8000"
            url = f"http://{host}{url}"
        elif not url.startswith("http"):
            url = f"http://{url}"

        body = variant.body_str
        
        start_time = time.perf_counter()
        
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    content=body
                )
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                
                # 3. 更新执行结果
                variant.last_response_code = response.status_code
                variant.last_response_body = response.text[:50000] # 截断超大 Body 以防撑爆数据库
                variant.last_latency_ms = latency_ms
                variant.last_replay_at = datetime.now(timezone.utc)
                variant.replay_count += 1
                
                logger.success(f"✅ [Replay Success] Status: {response.status_code} | Latency: {latency_ms}ms")
                
            except Exception as e:
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                logger.error(f"❌ [Replay Failed] Unexpected error: {str(e)}")
                variant.last_response_code = 0 # 表示网络或连接错误
                variant.last_response_body = f"ERROR: {str(e)}"
                variant.last_latency_ms = latency_ms
                variant.last_replay_at = datetime.now(timezone.utc)
                variant.replay_count += 1
                
        session.add(variant)
        session.commit()
        session.refresh(variant)
        
        return variant

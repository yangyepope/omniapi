import time
from datetime import datetime, timezone

import httpx
from loguru import logger
from sqlmodel import Session, update
from app.core.http_pool import HTTPPool

from app.models import ReplayResult, Variant


class ReplayEngine:
    """
    [职责]：负责执行 API 变体的重放攻击，并将结果持久化。
    [核心逻辑]：
    1. 从数据库读取 Variant 配置（含已脱壳的 Headers）。
    2. 使用 httpx 发送真实的异步请求。
    3. 记录响应码、报文体、延迟及时间戳。
    """

    @staticmethod
    def to_curl(method: str, url: str, headers: dict, body: str | None) -> str:
        """物理生成标准的 CURL 命令以供调试 (纠正转义漏洞)"""
        # 物理过滤：移除由 curl 自动处理或干扰调试的头
        skip_headers = ["host", "content-length", "connection", "accept-encoding"]
        clean_headers = {k: v for k, v in headers.items() if k.lower() not in skip_headers}

        # 物理转义：对所有 Header 值中的引号进行转义，防止 Shell 解析崩溃
        header_parts = []
        for k, v in clean_headers.items():
            safe_v = str(v).replace('"', '\\"')
            header_parts.append(f"-H \"{k}: {safe_v}\"")

        header_str = " ".join(header_parts)
        curl = f"curl -X {method} \"{url}\" {header_str}"

        if body:
            # 物理 Body 转义
            safe_body = body.replace('"', '\\"')
            curl += f" -d \"{safe_body}\""

        return curl

    @staticmethod
    def _execute_http_call(
        method: str,
        url: str,
        headers: dict,
        body: str | bytes | None
    ) -> dict:
        """
        [内部核心]：执行实际的 HTTP 调用。
        [Gevent Logic]：在 Gevent 模式下，同步阻塞调用会被猴子补丁自动转为非阻塞。
        """
        start_time = time.perf_counter()
        result = {
            "status_code": 0,
            "body": "",
            "headers": {},
            "latency_ms": 0,
            "error": None
        }

        # [Why]：调用全局同步客户端。在 Gevent 补丁下，这比 asyncio.run 更高效。
        client = HTTPPool.get_sync_client()

        try:
            response = client.request(
                method=method,
                url=url,
                headers=headers,
                content=body
            )
            latency_ms = int((time.perf_counter() - start_time) * 1000)

            result.update({
                "status_code": response.status_code,
                "body": response.text[:100000],
                "headers": dict(response.headers),
                "latency_ms": latency_ms
            })
            logger.success(f"✅ [HTTP Call] {method} {url} | {response.status_code}")

        except Exception as e:
            result["latency_ms"] = int((time.perf_counter() - start_time) * 1000)
            result["body"] = f"NETWORK_ERROR: {str(e)}"
            result["error"] = "network_fail"
            logger.error(f"❌ [HTTP Call Fail] {str(e)}")

        return result

        return result

    @staticmethod
    def execute_baseline_by_flow_id(flow_id: str, session: Session) -> dict:
        """
        [基准重放]：同步执行，对接 Gevent 流量治理逻辑。
        """
        import uuid

        from app.models import FilteredFlow

        f_uuid = uuid.UUID(flow_id) if isinstance(flow_id, str) else flow_id
        flow = session.get(FilteredFlow, f_uuid)

        if not flow:
            raise ValueError(f"Flow {flow_id} not found")

        logger.info(f"🔍 [Baseline] Generating baseline for flow: {flow_id}")

        # 构造 URL
        headers = flow.headers or {}
        host = headers.get("Host") or headers.get("host") or "localhost"
        url = flow.original_path

        # 同样的 localhost 逃逸逻辑
        from app.core.config import settings
        if settings.ENVIRONMENT == "local":
             if "localhost" in host or "127.0.0.1" in host:
                import re
                frontend_host = re.sub(r"https?://", "", settings.FRONTEND_HOST).split(":")[0]
                if frontend_host and frontend_host != "localhost":
                    host = frontend_host
                else:
                    host = "host.docker.internal"

        if not url.startswith("http"):
            url = f"http://{host}{url}"

        # 执行调用
        return ReplayEngine._execute_http_call(
            method=flow.method,
            url=url,
            headers=headers,
            body=flow.body
        )

    @staticmethod
    def execute_variant(variant_id: str, session: Session) -> Variant:
        # 1. 获取变体定义
        import uuid
        v_uuid = uuid.UUID(variant_id) if isinstance(variant_id, str) else variant_id
        variant = session.get(Variant, v_uuid)

        if not variant:
            raise ValueError(f"Variant {variant_id} not found")

        logger.info(f"🚀 [Replay] Executing variant: {variant.name}")

        # 2. 构造请求参数
        headers = variant.headers or {}
        method = variant.method or "GET"

        # 协议与 URL 补全逻辑
        url = variant.url
        host = headers.get("Host") or headers.get("host") or ""

        from app.core.config import settings
        if settings.ENVIRONMENT == "local":
            if not host or "localhost" in host or "127.0.0.1" in host:
                import re
                frontend_host = re.sub(r"https?://", "", settings.FRONTEND_HOST).split(":")[0]
                if frontend_host and frontend_host != "localhost":
                    host = frontend_host
                else:
                    host = "host.docker.internal"

        if not url or url == "/":
            url = f"http://{host or 'localhost'}/"
        if url.startswith("/"):
            url = f"http://{host or 'localhost'}{url}"

        body = variant.body_str

        # 物理审计 CURL
        variant.last_request_curl = ReplayEngine.to_curl(method, url, headers, body)

        # JSON 预检
        content_type = ""
        for k, val in headers.items():
            if k.lower() == "content-type": content_type = val.lower()

        if "application/json" in content_type and body:
            import json
            try:
                json.loads(body)
            except Exception as e:
                variant.last_response_code = 400
                variant.last_response_body = f"❌ [PRE-FLIGHT FORMAT ERROR]\nJSON 校验失败。\n细节：{str(e)}"
                variant.last_replay_at = datetime.now(timezone.utc)
                session.add(variant)
                session.commit()
                return variant

        # 立即入库状态
        session.add(variant)
        session.commit()

        # 3. 执行核心调用 (同步，已由 Gevent 协程化)
        call_res = ReplayEngine._execute_http_call(
            method=method,
            url=url,
            headers=headers,
            body=body
        )

        # 4. 更新变体主表 (Update Variant Cache)
        # 记录最后一次执行的快照，用于卡片即时展示
        variant.last_response_code = call_res["status_code"]
        variant.last_response_body = call_res["body"]
        variant.last_latency_ms = call_res["latency_ms"]
        variant.last_response_headers = call_res["headers"]
        variant.last_replay_at = datetime.now(timezone.utc)

        # 5. 持久化审计流水 (Persist History Record)
        # [Why]：记录完整执行链路，供 HistoryTimeline 组件进行审计展示
        def _safe_encode(data: str | bytes | None) -> bytes | None:
            if data is None: return None
            return data if isinstance(data, bytes) else str(data).encode("utf-8")

        history_record = ReplayResult(
            root_flow_id=variant.root_flow_id,
            source_type="variant",
            source_id=variant.id,
            status="success" if call_res["status_code"] > 0 else "error",
            request_method=method,
            request_url=url,
            request_headers=headers,
            request_body=_safe_encode(body),
            response_status=call_res["status_code"],
            response_headers=call_res["headers"],
            response_body=_safe_encode(call_res["body"]),
            latency_ms=call_res["latency_ms"],
            executed_at=variant.last_replay_at,
            error_message=call_res["error"] if call_res["error"] else None
        )

        # [Atomic Update]：实施原子计数物理方案，彻底消除并发导致的数据偏离
        session.add(variant)
        session.add(history_record)
        session.execute(
            update(Variant)
            .where(Variant.id == variant.id)
            .values(replay_count=Variant.replay_count + 1)
        )
        session.commit()
        session.refresh(variant)

        return variant

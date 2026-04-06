from datetime import datetime, timezone
import uuid
import json  # [Why]：psycopg3 通过 text() SQL 不能自动适配 dict → json 列，必须手动序列化
import time  # [Why]：死锁重试需要指数退避 sleep

from celery import Celery
from sqlalchemy import text
from sqlalchemy.exc import OperationalError  # [Why]：捕获死锁需要检查 OperationalError.orig 类型

from app.core.config import settings
from app.core.db import engine
import httpx
import logging

logger = logging.getLogger(__name__)

# ── Celery 初始化 ────────────────────────────────────────────────────────────
# [Why getattr]：CELERY_BROKER_URL/CELERY_RESULT_BACKEND 尚未在 Settings 声明，
# 用 getattr fallback 比 hasattr + 三目运算符更简洁。
# 后续应在 config.py 中正式声明这两个字段并删除此 fallback。
_BROKER  = getattr(settings, "CELERY_BROKER_URL",    "redis://localhost:6379/0")
_BACKEND = getattr(settings, "CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery("worker", broker=_BROKER, backend=_BACKEND)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,  # 让监控系统能感知到 STARTED 状态
)


# ── 工具函数 ──────────────────────────────────────────────────────────────────

def safe_encode(data: bytes | str | None) -> bytes | None:
    """将任意输入统一转为 bytes，用于 bytea 列存储；None 原样透传。"""
    if data is None:
        return None
    if isinstance(data, bytes):
        return data
    return str(data).encode("utf-8")


# ── DB 辅助（原子 SQL，绕过 ORM 避免 Identity Map 并发问题）───────────────────

def _find_endpoint(
    conn, method: str, path: str, service_name: str
) -> tuple[str, str | None] | None:
    """
    查询 apiendpoint，返回 (ep_id, mod_id) 或 None。

    [Why 同时返回 module_id]：调用方步骤 3 需要 module_id 做统计更新；
    合并进同一次 SELECT 省去一次额外的 DB 往返（每条消息节省 1 次 round-trip）。
    [Why 不加 FOR UPDATE]：后续写入全走 ON CONFLICT，加锁只会与
    _get_or_create_module 形成 AB/BA 死锁。
    """
    row = conn.execute(
        text(
            "SELECT id, module_id FROM apiendpoint "
            "WHERE method = :m AND path = :p AND service_name = :s"
        ),
        {"m": method, "p": path, "s": service_name},
    ).fetchone()
    if not row:
        return None
    return str(row[0]), str(row[1]) if row[1] else None


def _get_or_create_module(conn, service_name: str) -> str:
    """
    原子查找或创建 SystemModule，返回 id 字符串。
    [Lock Order]：所有的死锁防御都起始于此地。
    """
    row = conn.execute(
        text(
            "INSERT INTO systemmodule (id, name, service_prefix, owner, status) "
            "VALUES (:id, :n, :p, :o, :s) "
            "ON CONFLICT (name) DO UPDATE SET name = systemmodule.name "
            "RETURNING id"
        ),
        {
            "id": uuid.uuid4(),
            "n": service_name,
            "p": f"/{service_name}",
            "o": "Auto",
            "s": "active",
        },
    ).fetchone()
    if not row:
        raise RuntimeError(f"无法获取或创建 SystemModule: {service_name!r}")
    return str(row[0])


def _get_or_create_endpoint(
    conn, method: str, path: str, service_name: str, module_id: str
) -> str:
    """
    原子获取或创建 ApiEndpoint。
    [Lock Order]：由调用方确保已持有对应 SystemModule 的锁。
    """
    row = conn.execute(
        text(
            "INSERT INTO apiendpoint "
            "(id, method, path, name, service_name, module_id, source_type, total_traffic_count, unique_traffic_count) "
            "VALUES (:id, :m, :p, :n, :s, :mid, :st, 0, 0) "
            "ON CONFLICT (method, path, service_name) DO UPDATE SET name = apiendpoint.name "
            "RETURNING id"
        ),
        {
            "id": uuid.uuid4(),
            "m": method,
            "p": path,
            "n": f"Auto: {method} {path}",
            "s": service_name,
            "mid": module_id,
            "st": "auto_discovered",
        },
    ).fetchone()
    if not row:
        raise RuntimeError(f"无法获取或创建 ApiEndpoint: {method} {path}")
    return str(row[0])


# ── Celery Tasks ──────────────────────────────────────────────────────────────

@celery_app.task(
    name="process_raw_flow_task",
    bind=True,
    max_retries=5,    # [Why]：死锁在高并发下是预期行为，增加重试上限
    default_retry_delay=2,
    acks_late=True,
)
def process_raw_flow_task(self, raw_flow_id: str) -> str:
    """
    流量处理流水线 (Deadlock Resilient V5.0)。
    通过严格锁序 (Module -> Endpoint -> Flow) 与快速事务机制终结死锁。
    """
    import random
    from app.services.discovery import normalize_uri, generate_dedup_key

    try:
        raw_uuid = uuid.UUID(raw_flow_id)

        # ── 1. 事务外：读取原始流量并计算特征 ───────────────────────────────
        # [Why]：减少事务持锁时长，将 CPU 密集型操作移出事务。
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT service_name, interface_path, method, headers, body, body_size, client_ip FROM raw_flows WHERE id = :id"),
                {"id": raw_uuid},
            ).fetchone()
            if not row:
                return f"Skipped: {raw_flow_id} not found"
            svc, path, mth, hdrs, bdy, bsize, cip = row

        capt = datetime.now(timezone.utc)
        norm_uri = normalize_uri(path)
        dedup_key = generate_dedup_key(svc, norm_uri, mth, hdrs, bdy)

        # ── 2. 事务内：严格锁序写入 ─────────────────────────────────────────
        with engine.begin() as conn:
            # [Lock 1]：SystemModule
            mod_id = _get_or_create_module(conn, svc)
            
            # [Lock 2]：ApiEndpoint
            ep_id = _get_or_create_endpoint(conn, mth, norm_uri, svc, mod_id)

            # [Lock 3]：FilteredFlow (Upsert)
            flow_uuid = uuid.uuid4()
            upsert_row = conn.execute(
                text("""
                    INSERT INTO filtered_flows (
                        id, endpoint_id, raw_flow_id, captured_at, method, 
                        original_path, headers, body, body_size, client_ip, 
                        dedup_key, occurrence_count, replay_count
                    )
                    VALUES (
                        :id, :ep_id, :raw_id, :capt, :m, :p, 
                        :h, :b, :bsize, :cip, :k, 1, 0
                    )
                    ON CONFLICT (dedup_key) DO UPDATE SET 
                        occurrence_count = filtered_flows.occurrence_count + 1,
                        captured_at = EXCLUDED.captured_at
                    RETURNING id, (occurrence_count = 1) AS is_new
                """),
                {
                    "id": flow_uuid,
                    "ep_id": ep_id, "raw_id": raw_uuid, "capt": capt, "m": mth, "p": path,
                    "h": json.dumps(hdrs) if hdrs else None,
                    "b": safe_encode(bdy),
                    "bsize": len(bdy) if bdy else 0,
                    "cip": cip,
                    "k": dedup_key
                }
            ).fetchone()

            is_new = bool(upsert_row[1]) if upsert_row else False
            u_inc = 1 if is_new else 0

            # ── 3. 统计更新 (由于已持有 Module/Endpoint 锁，此处不会死锁) ──────────
            conn.execute(
                text("UPDATE apiendpoint SET total_traffic_count = total_traffic_count + 1, "
                     "unique_traffic_count = unique_traffic_count + :u, last_active_at = :t WHERE id = :id"),
                {"u": u_inc, "t": capt, "id": ep_id}
            )
            conn.execute(
                text("UPDATE systemmodule SET total_traffic_count = total_traffic_count + 1, "
                     "unique_traffic_count = unique_traffic_count + :u WHERE id = :id"),
                {"u": u_inc, "id": mod_id}
            )

            # ── 4. 标记完成 ────────────────────────────────────────────────
            conn.execute(text("UPDATE raw_flows SET deduped = true, parsed = true WHERE id = :id"), {"id": raw_uuid})

        return f"ok: key={dedup_key} is_new={is_new}"

    except OperationalError as exc:
        if "deadlock detected" in str(exc).lower():
            if getattr(self, "request", None) and self.request.id:
                # 仅在 Celery 容器内重试
                wait = random.uniform(0.1, 0.5) * (2 ** self.request.retries)
                logger.warning("检测到物理死锁，正在退避重试 (%s s): %s", round(wait, 2), raw_flow_id)
                raise self.retry(exc=exc, countdown=wait)
            else:
                # 测试环境直接抛出，由测试脚本处理延迟或失败
                raise exc
        # 非死锁的 OperationalError（如连接池满）
        if getattr(self, "request", None) and self.request.id:
            raise self.retry(exc=exc)
        raise exc
    except Exception as exc:
        if not getattr(self, "request", None) or not self.request.id:
            raise exc
        logger.exception("process_raw_flow_task 严重失败: %s", raw_flow_id)
        raise self.retry(exc=exc)


@celery_app.task(
    name="run_security_scan_task",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
    acks_late=True,
)
def run_security_scan_task(self, task_id: str) -> str:
    """执行安全扫描任务，记录扫描结果到 SecurityTestReport。"""
    import asyncio
    from app.models import SecurityTestTask, SecurityTestReport, ApiAsset
    from app.services.scanner import run_scan_for_asset
    from sqlmodel import Session

    try:
        with Session(engine) as session:
            task = session.get(SecurityTestTask, uuid.UUID(task_id))
            if not task:
                return f"Skipped: SecurityTestTask {task_id} not found"

            task.status = "running"
            session.add(task)
            session.commit()

            asset = session.get(ApiAsset, task.target_asset_id)
            if not asset:
                task.status = "failed"
                task.finished_at = datetime.now(timezone.utc)
                session.add(task)
                session.commit()
                return f"Error: ApiAsset {task.target_asset_id} not found"

            # [Why asyncio.run]：scanner 是 async 函数，Celery prefork worker
            # 没有运行中的 event loop，asyncio.run() 可安全创建并销毁一次性 loop。
            # 若改用 gevent/eventlet worker，需改为 loop.run_until_complete()。
            scan_result = asyncio.run(run_scan_for_asset(asset, task.payload_type))

            report = SecurityTestReport(
                task_id=task.id,
                asset_id=asset.id,
                vulnerability_found=scan_result["vulnerability_found"],
                details=scan_result["details"],
            )
            session.add(report)

            task.status = "completed"
            task.finished_at = datetime.now(timezone.utc)
            session.add(task)
            session.commit()
            return f"ok: vuln={report.vulnerability_found}"

    except Exception as exc:
        logger.exception("run_security_scan_task 失败: task_id=%s", task_id)
        raise self.retry(exc=exc)


@celery_app.task(
    name="replay_variant_task",
    bind=True,
    max_retries=2,
    default_retry_delay=3,
    acks_late=True,
)
def replay_variant_task(self, variant_id: str) -> str:
    """重放单个 Variant，记录响应结果和延迟。"""
    from app.models import Variant, ReplayResult
    from sqlmodel import Session

    try:
        with Session(engine) as session:
            variant = session.get(Variant, uuid.UUID(variant_id))
            if not variant:
                return f"Skipped: Variant {variant_id} not found"

            start_time = datetime.now(timezone.utc)
            # [Why 按环境决定 verify]：本地/staging 允许自签名证书，生产强制校验 TLS
            tls_verify = settings.ENVIRONMENT == "production"
            with httpx.Client(timeout=10.0, verify=tls_verify) as client:
                resp = client.request(
                    method=variant.method.upper(),
                    url=variant.url,
                    headers=variant.headers or {},
                    content=variant.body_str,
                )
            latency = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)

            variant.last_response_code = resp.status_code
            variant.last_latency_ms = latency
            variant.last_replay_at = datetime.now(timezone.utc)

            history = ReplayResult(
                root_flow_id=variant.root_flow_id,
                source_type="variant",
                source_id=variant.id,
                status="success",
                request_method=variant.method.upper(),
                request_url=variant.url,
                response_status=resp.status_code,
                response_body=safe_encode(resp.text[:10_000]),
                latency_ms=latency,
                executed_at=datetime.now(timezone.utc),
            )
            session.add(history)
            session.add(variant)
            session.commit()
            return f"ok: status={resp.status_code} latency={latency}ms"

    except Exception as exc:
        logger.exception("replay_variant_task 失败: variant_id=%s", variant_id)
        raise self.retry(exc=exc)

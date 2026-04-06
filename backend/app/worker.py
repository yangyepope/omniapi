# ❗ [CRITICAL]：必须在物理第一行执行 Monkey Patch，确保所有底层阻塞库（socket, ssl, threading）被协程化
import logging
import os
import uuid
from datetime import datetime, timezone

# ❗ [CRITICAL]：防御性 Monkey Patch
# 仅当处于 Celery Gevent Worker 环境时才执行补丁，防止干扰 FastAPI (uvloop) 进程
if os.getenv("CELERY_WORKER_TYPE") == "gevent":
    try:
        import gevent.monkey
        gevent.monkey.patch_all()
        logging.info("💪 [Gevent] Monkey patch applied successfully.")
    except ImportError:
        logging.warning("⚠️ [Gevent] gevent not found, skipping monkey patch.")

from celery import Celery
from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import OperationalError

from app.core.config import settings
from app.core.db import engine
from app.models import ApiEndpoint, FilteredFlow, RawFlow, SystemModule

logger = logging.getLogger(__name__)

# ── Celery 初始化 ────────────────────────────────────────────────────────────
# [Why]：配置已在 config.py 中通过 Settings 统一管理，直接引用即可。
celery_app = Celery(
    "worker", 
    broker=settings.CELERY_BROKER_URL, 
    backend=settings.CELERY_RESULT_BACKEND
)
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
    [Elegant Version]：原子查找或创建 SystemModule。
    [Lock Order]：所有的死锁防御都起始于此地。
    """
    stmt = (
        insert(SystemModule)
        .values(
            id=uuid.uuid4(),
            name=service_name,
            service_prefix=f"/{service_name}",
            owner="Auto",
            status="active",
        )
        .on_conflict_do_update(
            index_elements=[SystemModule.name],
            set_={SystemModule.name: SystemModule.name},  # 无损更新以触发 RETURNING
        )
        .returning(SystemModule.id)
    )

    row = conn.execute(stmt).fetchone()
    if not row:
        raise RuntimeError(f"无法获取或创建 SystemModule: {service_name!r}")
    return str(row[0])


def _get_or_create_endpoint(
    conn, method: str, path: str, service_name: str, module_id: str
) -> str:
    """
    [Elegant Version]：原子获取或创建 ApiEndpoint。
    [Lock Order]：由调用方确保已持有对应 SystemModule 的锁。
    """
    stmt = (
        insert(ApiEndpoint)
        .values(
            id=uuid.uuid4(),
            method=method,
            path=path,
            name=f"Auto: {method} {path}",
            service_name=service_name,
            module_id=module_id,
            source_type="auto_discovered",
            total_traffic_count=0,
            unique_traffic_count=0,
        )
        .on_conflict_do_update(
            index_elements=[
                ApiEndpoint.method,
                ApiEndpoint.path,
                ApiEndpoint.service_name,
            ],
            set_={ApiEndpoint.name: ApiEndpoint.name},
        )
        .returning(ApiEndpoint.id)
    )

    row = conn.execute(stmt).fetchone()
    if not row:
        raise RuntimeError(f"无法获取或创建 ApiEndpoint: {method} {path}")
    return str(row[0])


# ── Celery Tasks ──────────────────────────────────────────────────────────────


@celery_app.task(
    name="process_raw_flow_task",
    bind=True,
    max_retries=5,  # [Why]：死锁在高并发下是预期行为，增加重试上限
    default_retry_delay=2,
    acks_late=True,
)
def process_raw_flow_task(self, raw_flow_id: str) -> str:
    """
    流量处理流水线 (Deadlock Resilient V5.0)。
    通过严格锁序 (Module -> Endpoint -> Flow) 与快速事务机制终结死锁。
    """
    import random

    from app.services.discovery import generate_dedup_key, normalize_uri

    try:
        raw_uuid = uuid.UUID(raw_flow_id)

        # ── 1. 事务外：读取原始流量并计算特征 ───────────────────────────────
        with engine.connect() as conn:
            stmt = select(
                RawFlow.service_name,
                RawFlow.interface_path,
                RawFlow.method,
                RawFlow.headers,
                RawFlow.body,
                RawFlow.body_size,
                RawFlow.client_ip,
            ).where(RawFlow.id == raw_uuid)
            row = conn.execute(stmt).fetchone()
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
            upsert_stmt = (
                insert(FilteredFlow)
                .values(
                    id=flow_uuid,
                    endpoint_id=ep_id,
                    raw_flow_id=raw_uuid,
                    captured_at=capt,
                    method=mth,
                    original_path=path,
                    headers=hdrs,  # SQLAlchemy 为 JSON 列处理序列化
                    body=safe_encode(bdy),
                    body_size=bsize if bsize else (len(bdy) if bdy else 0),
                    client_ip=cip,
                    dedup_key=dedup_key,
                    occurrence_count=1,
                    replay_count=0,
                )
                .on_conflict_do_update(
                    index_elements=[FilteredFlow.dedup_key],
                    set_={
                        FilteredFlow.occurrence_count: FilteredFlow.occurrence_count
                        + 1,
                        FilteredFlow.captured_at: capt,
                    },
                )
                .returning(
                    FilteredFlow.id,
                    (FilteredFlow.occurrence_count == 1).label("is_new"),
                )
            )

            upsert_row = conn.execute(upsert_stmt).fetchone()
            is_new = bool(upsert_row[1]) if upsert_row else False
            u_inc = 1 if is_new else 0

            # ── 3. 统计更新 (SQL 表达式，避免丢失更新) ─────────────────────
            conn.execute(
                update(ApiEndpoint)
                .where(ApiEndpoint.id == ep_id)
                .values(
                    total_traffic_count=ApiEndpoint.total_traffic_count + 1,
                    unique_traffic_count=ApiEndpoint.unique_traffic_count + u_inc,
                    last_active_at=capt,
                )
            )
            conn.execute(
                update(SystemModule)
                .where(SystemModule.id == mod_id)
                .values(
                    total_traffic_count=SystemModule.total_traffic_count + 1,
                    unique_traffic_count=SystemModule.unique_traffic_count + u_inc,
                )
            )

            # ── 4. 标记完成 ────────────────────────────────────────────────
            conn.execute(
                update(RawFlow)
                .where(RawFlow.id == raw_uuid)
                .values(deduped=True, parsed=True)
            )

        return f"ok: key={dedup_key} is_new={is_new}"

    except OperationalError as exc:
        if "deadlock detected" in str(exc).lower():
            if getattr(self, "request", None) and self.request.id:
                # 仅在 Celery 容器内重试
                wait = random.uniform(0.1, 0.5) * (2**self.request.retries)
                logger.warning(
                    "检测到物理死锁，正在退避重试 (%s s): %s",
                    round(wait, 2),
                    raw_flow_id,
                )
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

    from sqlmodel import Session

    from app.models import ApiAsset, SecurityTestReport, SecurityTestTask
    from app.services.scanner import run_scan_for_asset

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
    queue="replay",  # [Why]：队列解耦，确保重放攻击的高并发 I/O 不会阻塞默认队列的 CPU 密集型任务
)
def replay_variant_task(self, variant_id: str) -> str:
    """
    [重构]：复用 ReplayEngine 执行变体重放。
    [Why]：统一同步与异步执行路径，确保审计留痕（ReplayResult）逻辑完全一致。
    """
    from sqlmodel import Session

    from app.services.replay import ReplayEngine

    try:
        with Session(engine) as session:
            # [Why]：在 Gevent 模式下直接调用同步方法。
            # 给定 _execute_http_call 已被 patch，此过程将是完全非阻塞的。
            variant = ReplayEngine.execute_variant(variant_id, session)
            return f"ok: status={variant.last_response_code} latency={variant.last_latency_ms}ms"

    except Exception as exc:
        logger.exception("replay_variant_task 失败: variant_id=%s", variant_id)
        raise self.retry(exc=exc)

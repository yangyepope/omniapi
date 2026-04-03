from datetime import datetime, timezone
import re
import asyncio
from celery import Celery
from sqlmodel import Session, func, select
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.core.db import engine
from app.models import (
    ApiAsset, 
    ApiEndpoint, 
    SystemModule, 
    ServiceStatus,
    RawFlow,
    FilteredFlow,
    Variant
)
from app.services.discovery import (
    normalize_uri, 
    generate_dedup_key
)
from app.services.scanner import run_scan_for_asset
import logging
import httpx

logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL if hasattr(settings, "CELERY_BROKER_URL") else "redis://localhost:6379/0",
    backend=settings.CELERY_RESULT_BACKEND if hasattr(settings, "CELERY_RESULT_BACKEND") else "redis://localhost:6379/0"
)


# [设计意图]：以 FilteredFlow 事实表为唯一来源重算 Endpoint 统计，确保“流量到达即正确”。
# [参数说明]：session 为当前事务会话；endpoint_id 为需要重算的接口主键。
# [注意]：先锁定 Endpoint 行再聚合，避免并发事务覆盖导致的计数回退。
def reconcile_endpoint_stats_from_source(session: Session, endpoint_id) -> ApiEndpoint:
    endpoint = session.exec(
        select(ApiEndpoint).where(ApiEndpoint.id == endpoint_id).with_for_update()
    ).one()

    stats = session.exec(
        select(
            func.count(FilteredFlow.id).label("unique_count"),
            func.coalesce(func.sum(FilteredFlow.variant_count), 0).label("duplicate_count"),
            func.max(FilteredFlow.captured_at).label("last_active"),
        ).where(FilteredFlow.endpoint_id == endpoint_id)
    ).one()

    unique_count = int(stats[0] or 0)
    duplicate_count = int(stats[1] or 0)
    last_active = stats[2]

    endpoint.total_traffic_count = unique_count + duplicate_count
    endpoint.variants_count = unique_count
    endpoint.last_active_at = last_active
    session.add(endpoint)
    return endpoint


# [设计意图]：以 Endpoint 聚合结果重算模块统计，保证模块总览与接口明细强一致。
# [参数说明]：session 为当前事务会话；module_id 为需要重算的模块主键。
# [注意]：同样先锁模块行，确保高并发下不会出现旧值回写。
def reconcile_module_stats_from_source(session: Session, module_id) -> None:
    module = session.exec(
        select(SystemModule).where(SystemModule.id == module_id).with_for_update()
    ).one()

    stats = session.exec(
        select(
            func.coalesce(func.sum(ApiEndpoint.total_traffic_count), 0).label("total"),
            func.coalesce(func.sum(ApiEndpoint.variants_count), 0).label("unique_total"),
            func.max(ApiEndpoint.last_active_at).label("last_active"),
        ).where(ApiEndpoint.module_id == module_id)
    ).one()

    module.total_traffic_count = int(stats[0] or 0)
    module.unique_traffic_count = int(stats[1] or 0)
    module.last_active_at = stats[2]
    session.add(module)

def find_matching_endpoint(session: Session, method: str, norm_uri: str, service_name: str) -> ApiEndpoint | None:
    """
    [功能]：查找匹配的 ApiEndpoint。
    [逻辑]：在指定 Service 下查找匹配，先精确后正则。
    [并发安全]：精确匹配时加行锁 (FOR UPDATE)，防止多个 Worker 同时读到 None 后重复创建。
    """
    # 精确匹配加行锁：若已存在则锁住该行，避免并发写入重复记录
    statement = select(ApiEndpoint).where(
        ApiEndpoint.method == method,
        ApiEndpoint.path == norm_uri,
        ApiEndpoint.service_name == service_name
    ).with_for_update()
    exact_match = session.exec(statement).first()
    if exact_match:
        return exact_match
        
    endpoints = session.exec(select(ApiEndpoint).where(
        ApiEndpoint.method == method,
        ApiEndpoint.service_name == service_name
    )).all()
    for ep in endpoints:
        # 将 {id} 或其他花括号占位符替换为正则通配符
        pattern = re.sub(r'\{[^}]+\}', r'[^/]+', ep.path)
        if re.match(f"^{pattern}$", norm_uri):
            return ep
            
    return None

def get_or_create_module_by_uri(session: Session, service_name: str) -> SystemModule:
    """
    [功能]：根据服务名称获取或创建系统模块 (SystemModule)。
    [并发安全]：with_for_update() 在行已存在时锁住该行；行不存在时 flush() 触发写入，
    若另一 Worker 在极短窗口内抢先插入同名模块，捕获 IntegrityError 后回退并重新查询，
    与 ApiEndpoint 的创建逻辑保持一致的防护级别。
    """
    statement = select(SystemModule).where(SystemModule.name == service_name).with_for_update()
    mod = session.exec(statement).first()

    if not mod:
        # 若模块不存在则自动创建，默认分配责任人为 Unknown
        mod = SystemModule(
            name=service_name,
            service_prefix=f"/{service_name}",
            owner="Unknown",
            description=f"Auto-generated module for {service_name} service",
            status=ServiceStatus.active,
        )
        session.add(mod)
        try:
            session.flush()  # 获取 ID 以备后用
        except IntegrityError:
            # [Why]：另一 Worker 已在并发窗口内插入了同名模块，
            # 回退本次插入并查出已有记录，避免 Task 因未捕获异常而失败
            session.rollback()
            mod = session.exec(
                select(SystemModule).where(SystemModule.name == service_name)
            ).first()
            if not mod:
                logger.error(f"无法定位模块 {service_name}，IntegrityError 后仍查不到记录")
                raise

    return mod

@celery_app.task(name="process_raw_flow_task")
def process_raw_flow_task(raw_flow_id: str) -> str:
    """
    [任务职责]：流量处理三阶段流水线的核心逻辑 (V3.2 Pydantic 规范版)。
    1. 提取原始报文。
    2. 计算指纹。
    3. [规范化] 通过 Pydantic 实例操作与 DB 行锁实现统计更新。
    """
    try:
        import uuid
        raw_uuid = uuid.UUID(raw_flow_id)
        
        with Session(engine) as session:
            # 1. 读取原始流量记录
            raw_flow = session.get(RawFlow, raw_uuid)
            if not raw_flow:
                return f"Error: RawFlow {raw_flow_id} not found"
            
            # 2. 路径归一化
            norm_uri = normalize_uri(raw_flow.interface_path)
            
            # 3. 生成去重指纹
            dedup_key = generate_dedup_key(
                service_name=raw_flow.service_name,
                path=norm_uri,
                method=raw_flow.method,
                headers=raw_flow.headers,
                body=raw_flow.body
            )
            
            # 4. 幂等性检查（加行锁）
            # [Why]：with_for_update() 确保两个 Worker 同时处理相同 dedup_key 时，
            # 只有一个能读到行并继续，另一个阻塞等待前者 commit 后再判断，
            # 防止分支 A 中 variant_count += 1 因并发读到旧值而丢失更新。
            statement = select(FilteredFlow).where(
                FilteredFlow.dedup_key == dedup_key
            ).with_for_update()
            existing_filtered = session.exec(statement).first()
            
            if existing_filtered:
                # [分支 A]：发现重复流量 -> 更新现有的精选流量记录及其统计
                # 1. 更新原始记录指纹状态
                raw_flow.deduped = True
                raw_flow.dedup_key = dedup_key
                raw_flow.parsed = True
                session.add(raw_flow)

                # 2. [原子 SQL] 更新精选流量的"捕获时间"和"变体计数"
                # [Why]：SQL 表达式 `variant_count + 1` 由数据库层面执行，
                # 规避 ORM 身份映射缓存导致的并发丢失更新问题
                session.exec(
                    update(FilteredFlow)
                    .where(FilteredFlow.id == existing_filtered.id)
                    .values(
                        variant_count=FilteredFlow.variant_count + 1,
                        captured_at=raw_flow.captured_at,
                    )
                )

                # 3. 以事实表重算当前 endpoint/module 统计（不走脚本，不走读时纠偏）
                endpoint = reconcile_endpoint_stats_from_source(
                    session=session,
                    endpoint_id=existing_filtered.endpoint_id,
                )
                reconcile_module_stats_from_source(session=session, module_id=endpoint.module_id)

                session.commit()
                return f"Duplicate flow detected (Key: {dedup_key}). Timestamp updated & Counter incremented."
            
            # [分支 B]：发现唯一流量 -> 创建记录并双项累加
            endpoint = find_matching_endpoint(session, raw_flow.method, norm_uri, raw_flow.service_name)

            if not endpoint:
                mod = get_or_create_module_by_uri(session, raw_flow.service_name)
                endpoint = ApiEndpoint(
                    method=raw_flow.method,
                    path=norm_uri,
                    name=f"Discovery: {raw_flow.method} {norm_uri}",
                    service_name=raw_flow.service_name,
                    module_id=mod.id,
                    source_type="auto_discovered"
                )
                session.add(endpoint)
                try:
                    # flush 触发 DB 写入；若并发 Worker 抢先插入了相同记录，
                    # 唯一约束会抛 IntegrityError，此时回退并重新查询已存在的行
                    session.flush()
                except IntegrityError:
                    # 另一个 Worker 已在极短窗口内插入了相同的 (method, path, service_name)
                    session.rollback()
                    # 重新查询已存在的接口（此时不再加锁，只读即可）
                    endpoint = session.exec(
                        select(ApiEndpoint).where(
                            ApiEndpoint.method == raw_flow.method,
                            ApiEndpoint.path == norm_uri,
                            ApiEndpoint.service_name == raw_flow.service_name,
                        )
                    ).first()
                    if not endpoint:
                        # 极端情况：查不到则放弃本次流量，避免死循环
                        logger.error(f"无法定位接口 {raw_flow.method} {norm_uri}，放弃处理")
                        return f"Error: endpoint not found after IntegrityError for {raw_flow.method} {norm_uri}"
            
            # 归档精选流量
            filtered_flow = FilteredFlow(
                endpoint_id=endpoint.id,
                raw_flow_id=raw_flow.id,
                captured_at=raw_flow.captured_at,
                method=raw_flow.method,
                original_path=raw_flow.interface_path,
                headers=raw_flow.headers,
                body=raw_flow.body,
                body_size=raw_flow.body_size,
                client_ip=raw_flow.client_ip,
                dedup_key=dedup_key
            )
            session.add(filtered_flow)
            
            # 更新原始表
            raw_flow.deduped = False
            raw_flow.dedup_key = dedup_key
            raw_flow.parsed = True
            session.add(raw_flow)

            # [Why]：先将本次新增的 FilteredFlow 持久化到当前事务可见状态，
            # 再执行重算；否则首次命中时重算可能读不到未 flush 的行，导致计数被写成 0。
            session.flush()
            
            # 以事实表重算当前 endpoint/module 统计，保证一手写入即一致
            endpoint = reconcile_endpoint_stats_from_source(
                session=session,
                endpoint_id=endpoint.id,
            )
            reconcile_module_stats_from_source(session=session, module_id=endpoint.module_id)
            
            session.commit()
            return f"Success: New unique flow archived with key {dedup_key}"
            
    except Exception as e:
        logger.error(f"Error in traffic processing: {e}")
        return f"Error: {str(e)}"

@celery_app.task(name="run_security_scan_task")
def run_security_scan_task(task_id: str) -> str:
    from app.models import SecurityTestTask, SecurityTestReport
    import uuid
    
    try:
        task_uuid = uuid.UUID(task_id)
        with Session(engine) as session:
            task = session.get(SecurityTestTask, task_uuid)
            if not task:
                return "Task not found"
                
            task.status = "running"
            session.add(task)
            session.commit()
            
            asset = session.get(ApiAsset, task.target_asset_id)
            if not asset:
                task.status = "failed"
                session.add(task)
                session.commit()
                return "Asset not found"
                
            scan_result = asyncio.run(run_scan_for_asset(asset, task.payload_type))
            
            report = SecurityTestReport(
                task_id=task.id,
                asset_id=asset.id,
                vulnerability_found=scan_result["vulnerability_found"],
                details=scan_result["details"]
            )
            session.add(report)
            
            task.status = "completed"
            task.finished_at = datetime.now(timezone.utc)
            session.add(task)
            session.commit()
            return f"Scan completed for Task {task_id}. Vuln Found: {report.vulnerability_found}"
            
    except Exception as e:
        logger.error(f"Error in run_security_scan_task: {e}")
        with Session(engine) as session:
            task = session.get(SecurityTestTask, task_uuid)
            if task:
                task.status = "failed"
                task.finished_at = datetime.now(timezone.utc)
                session.add(task)
                session.commit()
        return f"Error: {str(e)}"

@celery_app.task(name="replay_variant_task")
def replay_variant_task(variant_id: str) -> str:
    """
    [任务职责]：根据变体定义执行请求重放，并记录响应结果。
    """
    import uuid
    from datetime import datetime, timezone
    
    variant_uuid = uuid.UUID(variant_id)
    try:
        with Session(engine) as session:
            # 锁定变体记录
            statement = select(Variant).where(Variant.id == variant_uuid).with_for_update()
            variant = session.exec(statement).one()
            
            # 准备请求参数
            # 注意：这里默认使用变体中定义的 URL，如果是非绝对路径可能需要拼接基准地址
            method = variant.method.upper()
            url = variant.url
            headers = variant.headers or {}
            body = variant.body_str
            
            start_time = datetime.now(timezone.utc)
            
            # 执行请求
            try:
                with httpx.Client(timeout=10.0, verify=False) as client:
                    resp = client.request(
                        method=method,
                        url=url,
                        headers=headers,
                        content=body
                    )
                    end_time = datetime.now(timezone.utc)
                    latency = int((end_time - start_time).total_seconds() * 1000)
            except Exception as req_err:
                logger.error(f"Request error in replay: {req_err}")
            
            # 更新变体状态
            variant.last_response_code = resp.status_code if 'resp' in locals() else 0
            variant.last_latency_ms = latency if 'latency' in locals() else 0
            variant.last_replay_at = end_time if 'end_time' in locals() else datetime.now(timezone.utc)
            
            # 保存到历史记录表 (ReplayResult)
            from app.models import ReplayResult
            history = ReplayResult(
                root_flow_id=variant.root_flow_id,
                source_type="variant",
                source_id=variant.id,
                status="success" if 'resp' in locals() else "failed",
                request_method=method,
                request_url=url,
                request_headers=headers,
                request_body=body.encode('utf-8') if body else None,
                response_status=variant.last_response_code,
                response_body=resp.text[:10000].encode('utf-8') if 'resp' in locals() else None,
                latency_ms=variant.last_latency_ms,
                executed_at=variant.last_replay_at,
                error_message=str(req_err) if 'req_err' in locals() else None
            )
            session.add(history)
            session.add(variant)
            session.commit()
            return f"Replay finished for Variant {variant_id}, Status: {variant.last_response_code}"
            
    except Exception as e:
        logger.error(f"Critical error in replay_variant_task: {e}")
        return f"Error: {str(e)}"

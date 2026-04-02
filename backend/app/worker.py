from datetime import datetime, timezone
import re
import asyncio
from celery import Celery
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.core.db import engine
from app.models import (
    ApiAsset, 
    ApiEndpoint, 
    SystemModule, 
    ServiceStatus,
    RawFlow,
    FilteredFlow
)
from app.services.discovery import (
    normalize_uri, 
    generate_dedup_key
)
from app.services.scanner import run_scan_for_asset
import logging

logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL if hasattr(settings, "CELERY_BROKER_URL") else "redis://localhost:6379/0",
    backend=settings.CELERY_RESULT_BACKEND if hasattr(settings, "CELERY_RESULT_BACKEND") else "redis://localhost:6379/0"
)

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
    [逻辑]：确保每一个被识别出的 Service Name 都有对应的逻辑归属。
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
            status=ServiceStatus.active
        )
        session.add(mod)
        session.flush() # 获取 ID 以备后用
        
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
            
            # 4. 幂等性检查
            statement = select(FilteredFlow).where(FilteredFlow.dedup_key == dedup_key)
            existing_filtered = session.exec(statement).first()
            
            if existing_filtered:
                # [分支 A]：发现重复流量 -> 更新现有的精选流量记录及其统计
                # 1. 更新原始记录指纹状态
                raw_flow.deduped = True
                raw_flow.dedup_key = dedup_key
                raw_flow.parsed = True
                session.add(raw_flow)

                # 2. 关键：刷新精选流量的“捕获时间”和“变体计数”
                existing_filtered.captured_at = raw_flow.captured_at
                existing_filtered.variant_count += 1
                session.add(existing_filtered)

                # 3. 同步更新接口级统计 (加锁)
                ep_stmt = select(ApiEndpoint).where(ApiEndpoint.id == existing_filtered.endpoint_id).with_for_update()
                endpoint = session.exec(ep_stmt).one()
                endpoint.total_traffic_count += 1
                endpoint.last_active_at = raw_flow.captured_at
                session.add(endpoint)

                # 4. 同步更新模块全局统计 (加锁)
                mod_stmt = select(SystemModule).where(SystemModule.id == endpoint.module_id).with_for_update()
                module = session.exec(mod_stmt).one()
                module.total_traffic_count += 1
                module.last_active_at = raw_flow.captured_at
                session.add(module)
                
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
            
            # 锁定并更新接口统计 (Unique Flow)
            ep_stmt = select(ApiEndpoint).where(ApiEndpoint.id == endpoint.id).with_for_update()
            endpoint_locked = session.exec(ep_stmt).one()
            endpoint_locked.total_traffic_count += 1
            endpoint_locked.variants_count += 1
            endpoint_locked.last_active_at = raw_flow.captured_at
            session.add(endpoint_locked)

            # 锁定并更新模块统计 (Unique Flow)
            mod_stmt = select(SystemModule).where(SystemModule.id == endpoint.module_id).with_for_update()
            module = session.exec(mod_stmt).one()
            module.total_traffic_count += 1
            module.unique_traffic_count += 1
            module.last_active_at = raw_flow.captured_at
            session.add(module)
            
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

from datetime import datetime, timezone
import json
import re
import asyncio
from celery import Celery
from sqlmodel import Session, select
from app.core.config import settings
from app.core.db import engine
from app.models import (
    ApiAsset, 
    ApiEndpoint, 
    SystemModule, 
    GlobalConfig,
    ServiceStatus,
    RawFlow,
    FilteredFlow
)
from app.services.discovery import (
    normalize_uri, 
    extract_service_name_from_path,
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

def find_matching_endpoint(session: Session, method: str, norm_uri: str) -> ApiEndpoint | None:
    """
    [功能]：查找匹配的 ApiEndpoint。
    [逻辑]：先尝试精确路径匹配，若失败则尝试正则表达式匹配（处理 /users/{id} 这种泛化路径）。
    """
    statement = select(ApiEndpoint).where(ApiEndpoint.method == method, ApiEndpoint.path == norm_uri)
    exact_match = session.exec(statement).first()
    if exact_match:
        return exact_match
        
    endpoints = session.exec(select(ApiEndpoint).where(ApiEndpoint.method == method)).all()
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
    statement = select(SystemModule).where(SystemModule.name == service_name)
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
    [任务职责]：流量处理三阶段流水线的核心逻辑。
    1. 提取原始报文。
    2. 计算去重指纹 (Deduplication Key)。
    3. 判定是否重复。
    4. 实现服务发现与精选库持久化。
    """
    try:
        import uuid
        raw_uuid = uuid.UUID(raw_flow_id)
        
        with Session(engine) as session:
            # 1. 读取原始流量记录
            raw_flow = session.get(RawFlow, raw_uuid)
            if not raw_flow:
                return f"Error: RawFlow {raw_flow_id} not found"
            
            # 2. 路径归一化处理
            norm_uri = normalize_uri(raw_flow.interface_path)
            
            # 3. 生成去重指纹
            dedup_key = generate_dedup_key(
                service_name=raw_flow.service_name,
                path=norm_uri,
                method=raw_flow.method,
                headers=raw_flow.headers,
                body=raw_flow.body
            )
            # [Debug] 打印指纹生成的原始信息
            print(f"[DEBUG_DEDUP] service={raw_flow.service_name}, path={norm_uri}, method={raw_flow.method}, headers={raw_flow.headers}, body={raw_flow.body}")
            
            # 4. 幂等性检查 (Deduplication)
            # 检查精选库中是否已存在该指纹
            statement = select(FilteredFlow).where(FilteredFlow.dedup_key == dedup_key)
            existing_filtered = session.exec(statement).first()
            
            if existing_filtered:
                # 1. 更新原始流量表状态 (标记为已去重)
                raw_flow.deduped = True
                raw_flow.dedup_key = dedup_key
                raw_flow.parsed = True
                session.add(raw_flow)

                # 2. 更新所属服务的总流量计数 (Atomic Increment)
                # 通过已有的已归档资产反查 module_id
                stmt = select(SystemModule).where(SystemModule.id == existing_filtered.endpoint.module_id)
                module = session.exec(stmt).first()
                if module:
                    module.total_traffic_count = SystemModule.total_traffic_count + 1
                    session.add(module)
                
                session.commit()
                return f"Duplicate flow detected (Key: {dedup_key}). Total Traffic Incremented."
            
            # 5. 接口发现与关联 (Interface Discovery)
            # 查找或创建逻辑接口定义
            endpoint = find_matching_endpoint(session, raw_flow.method, norm_uri)
            
            if not endpoint:
                # 若未找到匹配接口，则自动通过服务名创建模块和接口
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
                session.commit()
                session.refresh(endpoint)
            
            # 6. 持久化至精选流量库 (Step 3: 原样接收)
            # 按照用户要求：先不脱敏，原样存储 Header 和 Body
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
            
            # 7. 更新原始流量表状态
            raw_flow.deduped = False
            raw_flow.dedup_key = dedup_key
            raw_flow.parsed = True
            session.add(raw_flow)
            
            # 8. 更新所属服务的活跃时间与统计指标 (Atomic Increment)
            module = session.get(SystemModule, endpoint.module_id)
            if module:
                module.last_active_at = datetime.now(timezone.utc)
                # 原子化累加总流量与唯一流量
                module.total_traffic_count = SystemModule.total_traffic_count + 1
                module.unique_traffic_count = SystemModule.unique_traffic_count + 1
                session.add(module)
            
            session.commit()
            return f"Success: New unique flow archived with key {dedup_key}"
            
    except Exception as e:
        logger.error(f"Error in process_raw_flow_task: {e}")
        return f"Error: {str(e)}"
            
    except Exception as e:
        logger.error(f"Error in process_mirror_traffic_task: {e}")
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

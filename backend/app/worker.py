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
    TrafficRecord, 
    GlobalConfig,
    ServiceStatus
)
from app.services.discovery import normalize_uri, extract_schemas
from app.services.scanner import run_scan_for_asset
import logging

logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL if hasattr(settings, "CELERY_BROKER_URL") else "redis://localhost:6379/0",
    backend=settings.CELERY_RESULT_BACKEND if hasattr(settings, "CELERY_RESULT_BACKEND") else "redis://localhost:6379/0"
)

def find_matching_endpoint(session: Session, method: str, real_uri: str) -> ApiEndpoint | None:
    """
    查找匹配的 ApiEndpoint。首先尝试精确匹配，然后尝试匹配路径变量。
    """
    statement = select(ApiEndpoint).where(ApiEndpoint.method == method, ApiEndpoint.path == real_uri)
    exact_match = session.exec(statement).first()
    if exact_match:
        return exact_match
        
    endpoints = session.exec(select(ApiEndpoint).where(ApiEndpoint.method == method)).all()
    for ep in endpoints:
        pattern = re.sub(r'\{[^}]+\}', r'[^/]+', ep.path)
        if re.match(f"^{pattern}$", real_uri):
            return ep
            
    return None

def get_or_create_module_by_uri(session: Session, uri: str) -> tuple[SystemModule, str]:
    """
    V3.0 增强型服务发现逻辑：
    1. 优先匹配【全局业务配置】中的“上游服务路由映射”
    2. 若无匹配，提取 URI 第一层路径作为服务名
    3. 自动同步责任人 (Owner) 信息
    """
    clean_uri = uri.split('?')[0]
    
    matching_name = None
    matching_owner = "Unknown"
    
    config_statement = select(GlobalConfig).where(GlobalConfig.key == "upstream_service_route_mapping")
    config = session.exec(config_statement).first()
    
    if config and config.value:
        try:
            mappings = json.loads(config.value)
            logger.debug(f"[Discovery] Testing {len(mappings)} mappings for URI: {clean_uri}")
            for item in mappings:
                pattern = item.get("pattern", "").strip()
                # 使用 re.search 增加灵活性，并处理可能的空模式
                if pattern and re.search(pattern, clean_uri):
                    matching_name = item.get("service")
                    matching_owner = item.get("owner", "Unknown")
                    logger.info(f"[Discovery] ✅ Match found (search): Pattern '{pattern}' -> Service: {matching_name}")
                    break
        except Exception as e:
            logger.error(f"解析路由映射配置失败: {e}")
    else:
        logger.debug(f"[Discovery] No mapping configuration found in GlobalConfig.")

    if not matching_name:
        parts = [p for p in clean_uri.split('/') if p]
        if parts:
            matching_name = parts[0]
        else:
            matching_name = "default"
            
    # 再次兜底：如果 matching_name 被意外设置为了包含 "Unknown" 的字符串（来自旧配置等），强制改为 "default"
    if not matching_name or "Unknown" in matching_name:
        matching_name = matching_name or "default"
        # 如果不是明确的 "default"，则保持原样，除非它确实是 "Unknown API"
        if matching_name == "Unknown API":
            matching_name = "default"
            
    service_prefix = f"/{matching_name}" if "/" not in matching_name else None
    
    statement = select(SystemModule).where(SystemModule.name == matching_name)
    mod = session.exec(statement).first()
    
    if not mod:
        mod = SystemModule(
            name=matching_name, 
            service_prefix=service_prefix,
            owner=matching_owner,
            description=f"Auto-generated module for {matching_name} service",
            status=ServiceStatus.active
        )
        session.add(mod)
        session.flush() 
    else:
        if mod.owner == "Unknown" and matching_owner != "Unknown":
            mod.owner = matching_owner
            session.add(mod)
        
    return mod, matching_name

@celery_app.task(name="process_mirror_traffic_task")
def process_mirror_traffic_task(method: str, uri: str, headers: dict, body_str: str, source_ip: str = "") -> str:
    """
    异步处理收集到的流量 (v3.0 增强版)
    """
    try:
        norm_uri = normalize_uri(uri)
        
        with Session(engine) as session:
            endpoint = find_matching_endpoint(session, method, norm_uri)
            
            if not endpoint:
                mod, service_name = get_or_create_module_by_uri(session, norm_uri)
                endpoint = ApiEndpoint(
                    method=method,
                    path=norm_uri,
                    name=f"Auto Discovered {method} {norm_uri}",
                    service_name=service_name,
                    module_id=mod.id
                )
                session.add(endpoint)
                session.commit()
                session.refresh(endpoint)
                session.refresh(mod)
            else:
                mod = session.get(SystemModule, endpoint.module_id)

            if mod:
                mod.total_traffic_count += 1
                mod.last_active_at = datetime.now(timezone.utc)
                session.add(mod)

            record = TrafficRecord(
                endpoint_id=endpoint.id,
                method=method,
                real_uri=uri,
                headers=headers,
                body=body_str,
                source_ip=source_ip
            )
            session.add(record)
            session.commit()
            
            return f"Traffic archived for endpoint: {endpoint.id}"
            
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

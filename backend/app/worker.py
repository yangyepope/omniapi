import json
from datetime import datetime, timezone
from celery import Celery
from sqlmodel import Session, select
from app.core.config import settings
from app.core.db import engine
from app.models import ApiAsset, ApiEndpoint, SystemModule, TrafficRecord
from app.services.discovery import normalize_uri, extract_schemas
from app.services.scanner import run_scan_for_asset
import asyncio
from loguru import logger
import re

# Initialize Celery
# The broker and backend URLs should be provided via environment variables in the container
celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL if hasattr(settings, "CELERY_BROKER_URL") else "redis://localhost:6379/0",
    backend=settings.CELERY_RESULT_BACKEND if hasattr(settings, "CELERY_RESULT_BACKEND") else "redis://localhost:6379/0"
)

def find_matching_endpoint(session: Session, method: str, real_uri: str) -> ApiEndpoint | None:
    """
    查找匹配的 ApiEndpoint。首先尝试精确匹配，然后尝试匹配路径变量。
    例如 real_uri='/api/v1/users/123' -> path='/api/v1/users/{id}'
    """
    # 1. 精确匹配：在数据库中查询方法和路径完全一致的接口定义
    statement = select(ApiEndpoint).where(ApiEndpoint.method == method, ApiEndpoint.path == real_uri)
    # 执行查询并获取第一个精确匹配的结果
    exact_match = session.exec(statement).first()
    # 如果找到精确匹配，则立即返回该接口
    if exact_match:
        return exact_match
        
    # 2. 模式匹配：如果没有精确匹配，则退而求其次进行模式匹配
    # 检索具有相同 HTTP 方法的所有接口定义，以缩小搜索范围
    endpoints = session.exec(select(ApiEndpoint).where(ApiEndpoint.method == method)).all()
    # 遍历检索到的每个接口定义
    for ep in endpoints:
        # 将路径变量（如 {id}）转换为正则表达式模式 [^/]+
        pattern = re.sub(r'\{[^}]+\}', r'[^/]+', ep.path)
        # 检查真实的 URI 是否完全符合生成的正则表达式模式
        if re.match(f"^{pattern}$", real_uri):
            # 如果模式匹配成功，则返回该接口
            return ep
            
    # 如果既没有精确匹配也没有模式匹配，则返回 None
    return None

def get_or_create_module_by_uri(session: Session, uri: str) -> tuple[SystemModule, str]:
    """
    根据 URI 提取微服务名称，并获取或创建对应的 SystemModule。
    例如: /sts/api/login-session/ -> 服务名称为 'sts'
    """
    # 去除查询参数以防万一
    clean_uri = uri.split('?')[0]
    
    # 提取第一段作为微服务名称
    parts = [p for p in clean_uri.split('/') if p]
    if parts:
        service_name = parts[0]
        service_prefix = f"/{service_name}"
    else:
        service_name = "default"
        service_prefix = "/"
        
    # 查询数据库以查找对应的系统模块
    statement = select(SystemModule).where(SystemModule.name == service_name)
    mod = session.exec(statement).first()
    
    # 如果不存在该模块
    if not mod:
        # 创建一个新的 SystemModule 实例
        mod = SystemModule(
            name=service_name, 
            service_prefix=service_prefix,
            description=f"Auto-generated module for {service_name} service"
        )
        session.add(mod)
        session.commit()
        session.refresh(mod)
        
    return mod, service_name

@celery_app.task(name="process_mirror_traffic_task")
def process_mirror_traffic_task(method: str, uri: str, headers: dict, body_str: str, source_ip: str = "") -> str:
    """
    异步处理收集到的流量：
    1. 脱敏敏感字段（待实现）
    2. 匹配已有的 ApiEndpoint (例如来自 Apifox 导入)
    3. 如果不匹配，则归档为对应的微服务模块，并创建一个新的 ApiEndpoint
    4. 将实际的流量请求保存为 TrafficRecord
    """
    try:
        # 标准化 URI（例如移除尾部斜杠或查询参数）
        norm_uri = normalize_uri(uri)
        # TODO: 脱敏 headers 和 body 中的密码或 Token 等敏感信息
        
        # 打开一个新的数据库会话
        with Session(engine) as session:
            # 尝试查找与传入的方法和 URI 匹配的现有 ApiEndpoint
            endpoint = find_matching_endpoint(session, method, norm_uri)
            
            # 如果没有找到匹配的接口（影子 API 场景）
            if not endpoint:
                # 动态获取或创建对应的微服务模块
                mod, service_name = get_or_create_module_by_uri(session, norm_uri)
                # 创建一个新的 ApiEndpoint 来表示这个之前未知的 API
                endpoint = ApiEndpoint(
                    method=method, # 设置 HTTP 方法
                    path=norm_uri, # 设置标准化后的路径
                    name=f"Auto Discovered {method} {norm_uri}", # 生成一个默认名称
                    service_name=service_name, # 设置微服务名称
                    module_id=mod.id # 将其链接到对应的微服务模块
                )
                # 将新接口添加到会话中
                session.add(endpoint)
                # 提交事务以保存新接口
                session.commit()
                # 刷新接口对象以获取其生成的 ID
                session.refresh(endpoint)
                
            # 创建一个新的 TrafficRecord 以对这个特定的 API 请求进行快照（仅追加，不去重）
            record = TrafficRecord(
                endpoint_id=endpoint.id, # 将流量记录链接到匹配或新创建的接口
                method=method, # 记录使用的 HTTP 方法
                real_uri=uri, # 记录确切请求的 URI
                headers=headers, # 存储请求头
                body=body_str, # 存储请求体
                source_ip=source_ip # 记录客户端的真实 IP 地址
            )
            # 将流量记录添加到会话中
            session.add(record)
            # 提交事务以将流量记录保存到数据库
            session.commit()
            
            # 返回包含接口 ID 的成功消息
            return f"Traffic archived for endpoint: {endpoint.id}"
            
    except Exception as e:
        # 记录异步处理过程中发生的任何错误
        logger.error(f"Error in process_mirror_traffic_task: {e}")
        # 返回错误消息
        return f"Error: {str(e)}"

@celery_app.task(name="run_security_scan_task")
def run_security_scan_task(task_id: str) -> str:
    from app.models import SecurityTestTask, SecurityTestReport
    import uuid
    
    try:
        task_uuid = uuid.UUID(task_id)
        with Session(engine) as session:
            # 1. 获取任务
            task = session.get(SecurityTestTask, task_uuid)
            if not task:
                return "Task not found"
                
            task.status = "running"
            session.add(task)
            session.commit()
            
            # 2. 获取目标资产
            asset = session.get(ApiAsset, task.target_asset_id)
            if not asset:
                task.status = "failed"
                session.add(task)
                session.commit()
                return "Asset not found"
                
            # 3. 运行扫描 (Scanner 中的方法是 async 的，在 Celery 中需要用 asyncio 运行)
            # 也可以把 Scanner 改为同步，但由于 httpx 常用异步，我们使用 asyncio.run
            scan_result = asyncio.run(run_scan_for_asset(asset, task.payload_type))
            
            # 4. 保存报告
            report = SecurityTestReport(
                task_id=task.id,
                asset_id=asset.id,
                vulnerability_found=scan_result["vulnerability_found"],
                details=scan_result["details"]
            )
            session.add(report)
            
            # 5. 更新任务状态
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

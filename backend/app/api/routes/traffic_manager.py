from typing import Any # 导入 Any 用于类型提示灵活的字典
from fastapi import APIRouter, HTTPException, Depends # 导入 FastAPI 路由和依赖注入组件
from sqlmodel import select, func # 导入 SQLModel 的查询和聚合函数
from app.api.deps import SessionDep # 导入数据库会话依赖
from app.models import GlobalConfig, SystemModule, ApiEndpoint, FilteredFlow, FilteredFlowPublic, FilteredFlowsPublic, get_datetime_utc # 导入模型与工具函数
import uuid # 导入 uuid 用于处理和提示 UUID 类型

# 创建一个新的 APIRouter 实例，并指定路由前缀和标签
router = APIRouter(prefix="/traffic-manager", tags=["traffic-manager"])

# 定义一个 GET 接口，用于获取当前的全局配置快照
@router.get("/config", summary="Get Global Governance Config")
def get_config(session: SessionDep) -> dict[str, Any]:
    # 预定义核心治理键
    keys = ["traffic_collection_enabled", "loopback_interception_enabled"]
    # 批量查询配置
    statement = select(GlobalConfig).where(GlobalConfig.key.in_(keys))
    configs = session.exec(statement).all()
    
    # 结果字典化，默认值均为 True
    config_map = {c.key: c.value.lower() == "true" for c in configs}
    for key in keys:
        if key not in config_map:
            config_map[key] = True
            
    return config_map

# 定义一个 POST 接口，用于开启或关闭特定的治理功能
@router.post("/config", summary="Update Governance Config")
def update_config(key: str, enabled: bool, session: SessionDep) -> dict[str, Any]:
    # 安全检查：仅允许更新预定义的键
    if key not in ["traffic_collection_enabled", "loopback_interception_enabled"]:
        raise HTTPException(status_code=400, detail="Invalid config key")
        
    # 查询数据库中已有的配置记录
    statement = select(GlobalConfig).where(GlobalConfig.key == key)
    config = session.exec(statement).first()
    
    if not config:
        # 如果不存在，则创建新记录
        config = GlobalConfig(
            key=key, 
            value=str(enabled).lower(), 
            description=f"Governance toggle for {key}",
            updated_at=get_datetime_utc()
        )
        session.add(config)
    else:
        # 如果存在，则更新值并强制物理刷新时间戳
        config.value = str(enabled).lower()
        config.updated_at = get_datetime_utc()
        session.add(config)
        
    session.commit()
    return {"message": "Governance updated", "key": key, "enabled": enabled}

# 定义一个 POST 接口，用于从 Apifox 导出的 JSON 数据中导入 API 定义
@router.post("/import-apifox", summary="Import Apifox API definitions")
def import_apifox(data: dict[str, Any], session: SessionDep) -> dict[str, Any]:
    """
    接收 Apifox 导出的 OpenAPI 格式 JSON。
    为了简化，这里假设 data 中包含 'paths'，并根据 tags 将接口归类到 Module。
    """
    # 从输入的 JSON 数据中提取 'paths' 字典，默认为空字典
    paths = data.get("paths", {})
    # 初始化一个计数器，用于记录新创建的模块数量
    imported_modules = 0
    # 初始化一个计数器，用于记录新创建或更新的接口数量
    imported_endpoints = 0
    
    # 遍历每个路径及其关联的 HTTP 方法
    for path, methods in paths.items():
        # 遍历每个 HTTP 方法及其接口详细信息
        for method, details in methods.items():
            # 将 HTTP 方法字符串转换为大写（例如，'get' 转为 'GET'）
            method_upper = method.upper()
            # 提取 'tags' 列表以确定模块名称；默认为 "Default Module"
            tags = details.get("tags", ["Default Module"])
            # 使用第一个标签作为模块名称，如果标签列表为空则回退到 "Default Module"
            module_name = tags[0] if tags else "Default Module"
            
            # 构建查询语句，查找是否已存在同名模块
            statement = select(SystemModule).where(SystemModule.name == module_name)
            # 执行查询以获取现有的模块
            mod = session.exec(statement).first()
            # 检查模块是否未找到
            if not mod:
                # 创建一个具有指定名称的新 SystemModule 实例
                mod = SystemModule(name=module_name)
                # 将新模块添加到数据库会话中
                session.add(mod)
                # 提交事务以保存模块并生成其 ID
                session.commit()
                # 刷新模块对象以从数据库中获取其新生成的 ID
                session.refresh(mod)
                # 递增导入的模块计数器
                imported_modules += 1
                
            # 构建查询语句，查找是否已存在具有相同方法和路径的接口
            statement = select(ApiEndpoint).where(ApiEndpoint.method == method_upper, ApiEndpoint.path == path)
            # 执行查询以获取现有的接口
            ep = session.exec(statement).first()
            # 检查接口是否不存在
            if not ep:
                # 创建一个新的 ApiEndpoint 实例，并将其链接到当前模块
                ep = ApiEndpoint(
                    method=method_upper, # 设置大写的 HTTP 方法
                    path=path, # 设置标准的 URI 路径
                    name=details.get("summary", f"{method_upper} {path}"), # 使用摘要作为名称，或提供一个后备名称
                    description=details.get("description", ""), # 使用描述，如果没有则留空
                    module_id=mod.id # 将此接口链接到父模块的 ID
                )
                # 将新接口添加到会话中
                session.add(ep)
                # 递增导入的接口计数器
                imported_endpoints += 1
            else:
                # 如果它已经存在（例如，由流量发现自动创建的），则更新它以对齐 Apifox 的定义
                ep.name = details.get("summary", ep.name) # 如果提供了新的摘要，则更新名称
                ep.description = details.get("description", ep.description) # 如果提供了描述，则更新描述
                ep.module_id = mod.id # 将接口重新对齐到正确的模块 ID
                # 将更新后的接口添加到会话中
                session.add(ep)
                
    # 将所有累积的接口创建和更新提交到数据库
    session.commit()
    # 返回总结导入统计信息的成功响应
    return {"message": "Import successful", "modules_added": imported_modules, "endpoints_added": imported_endpoints}

# 定义一个 GET 接口，用于检索特定接口的分页流量记录
@router.get("/endpoints/{endpoint_id}/traffic", response_model=FilteredFlowsPublic, summary="Get traffic for an endpoint")
def get_endpoint_traffic(
    endpoint_id: uuid.UUID, session: SessionDep, skip: int = 0, limit: int = 100
) -> Any:
    """
    按时间倒序查询某个接口下的所有精选流量快照。
    """
    # 计算总记录数
    count_statement = select(func.count()).select_from(FilteredFlow).where(FilteredFlow.endpoint_id == endpoint_id)
    count = session.exec(count_statement).one()
    
    # 检索记录
    statement = (
        select(FilteredFlow)
        .where(FilteredFlow.endpoint_id == endpoint_id)
        .order_by(FilteredFlow.created_at.desc()) # type: ignore
        .offset(skip)
        .limit(limit)
    )
    records = session.exec(statement).all()
    
    # 数据转换：将二进制 Body 显式解码为字符串以适配展示模型
    public_records = []
    for r in records:
        public_records.append(
            FilteredFlowPublic(
                id=r.id,
                endpoint_id=r.endpoint_id,
                method=r.method,
                original_path=r.original_path,
                headers=r.headers,
                body=r.body.decode("utf-8", errors="replace") if r.body else None,
                client_ip=r.client_ip,
                created_at=r.created_at,
                occurrence_count=r.occurrence_count,
                replay_count=r.replay_count
            )
        )
    
    return {"data": public_records, "count": count}

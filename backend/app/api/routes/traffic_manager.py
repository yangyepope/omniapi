from typing import Any # 导入 Any 用于类型提示灵活的字典
from fastapi import APIRouter, HTTPException, Depends # 导入 FastAPI 路由和依赖注入组件
from sqlmodel import select, func # 导入 SQLModel 的查询和聚合函数
from app.api.deps import SessionDep # 导入数据库会话依赖
from app.models import GlobalConfig, SystemModule, ApiEndpoint, TrafficRecord, TrafficRecordPublic, TrafficRecordsPublic # 导入所需的数据库模型
import uuid # 导入 uuid 用于处理和提示 UUID 类型

# 创建一个新的 APIRouter 实例，并指定路由前缀和标签
router = APIRouter(prefix="/traffic-manager", tags=["traffic-manager"])

# 定义一个 GET 接口，用于获取当前的流量采集配置
@router.get("/config", summary="Get Traffic Collection Config")
def get_config(session: SessionDep) -> dict[str, Any]:
    # 构建查询语句，查找流量采集的全局配置键
    statement = select(GlobalConfig).where(GlobalConfig.key == "traffic_collection_enabled")
    # 执行查询并获取第一个匹配的结果
    config = session.exec(statement).first()
    # 返回包含布尔值的字典；如果未找到配置，则默认返回 True
    return {"traffic_collection_enabled": config.value.lower() == "true" if config else True}

# 定义一个 POST 接口，用于开启或关闭流量采集功能
@router.post("/config", summary="Toggle Traffic Collection")
def toggle_config(enabled: bool, session: SessionDep) -> dict[str, Any]:
    # 查询数据库中已有的流量采集配置
    statement = select(GlobalConfig).where(GlobalConfig.key == "traffic_collection_enabled")
    # 执行查询以检索配置记录
    config = session.exec(statement).first()
    # 检查配置记录是否不存在
    if not config:
        # 如果不存在，则使用提供的布尔值（转换为字符串）创建一条新记录
        config = GlobalConfig(key="traffic_collection_enabled", value=str(enabled), description="Enable or disable traffic collection globally")
        # 将新记录添加到数据库会话中
        session.add(config)
    else:
        # 如果存在，则更新现有记录的值
        config.value = str(enabled)
        # 将更新后的记录添加回会话
        session.add(config)
    # 提交事务以将更改保存到数据库
    session.commit()
    # 返回成功消息和新的状态
    return {"message": "Config updated", "traffic_collection_enabled": enabled}

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
@router.get("/endpoints/{endpoint_id}/traffic", response_model=TrafficRecordsPublic, summary="Get traffic for an endpoint")
def get_endpoint_traffic(
    endpoint_id: uuid.UUID, session: SessionDep, skip: int = 0, limit: int = 100
) -> Any:
    """
    按时间倒序查询某个接口下的所有流量快照。
    """
    # 构建查询语句，计算此接口的总流量记录数
    count_statement = select(func.count()).select_from(TrafficRecord).where(TrafficRecord.endpoint_id == endpoint_id)
    # 执行计数查询并检索单个整数结果
    count = session.exec(count_statement).one()
    
    # 构建查询语句以检索实际的流量记录
    statement = (
        select(TrafficRecord) # 从 TrafficRecord 表中选择
        .where(TrafficRecord.endpoint_id == endpoint_id) # 过滤属于所请求接口 ID 的记录
        .order_by(TrafficRecord.created_at.desc()) # type: ignore # 根据创建时间对记录进行降序排序
        .offset(skip) # 跳过指定数量的记录以进行分页
        .limit(limit) # 限制返回记录的最大数量以进行分页
    )
    # 执行查询并获取所有匹配的记录
    records = session.exec(statement).all()
    
    # 返回分页的数据列表和总数
    return {"data": records, "count": count}

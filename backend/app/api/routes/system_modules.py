import uuid
from collections import defaultdict
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import func, select

from app.api.deps import SessionDep
from app.models import (
    ApiEndpoint,
    ApiEndpointPublic,
    ApiEndpointsPublic,
    SourceType,
    SystemModule,
    FilteredFlow, # 替代 TrafficRecord
    FilteredFlowPublic, # 替代 TrafficRecordPublic
    SystemModuleCreate,
    SystemModuleUpdate,
    ServiceStatus,
)

router = APIRouter(prefix="/system-modules", tags=["system-modules"])

EXCLUDED_SERVICE_NAMES = {"default", "unknown api"}
EXCLUDED_PATHS = {"/"}
RECENT_TRAFFIC_LIMIT = 10

class SystemModuleStats(BaseModel):
    id: str
    name: str
    description: str | None
    interfaces: int
    documented: int
    shadow: int
    last_scanned_at: datetime | None
    
    # v3.0 新增持久化统计与元数据字段
    owner: str | None
    status: ServiceStatus
    total_traffic_count: int
    unique_traffic_count: int
    last_active_at: datetime | None
    deprecated_at: datetime | None

class SystemModulesStatsResponse(BaseModel):
    data: list[SystemModuleStats]

class ApiEndpointDetailResponse(BaseModel):
    endpoint: ApiEndpointPublic
    module_name: str
    traffic_count: int
    last_seen_at: datetime | None
    recent_traffic: list[FilteredFlowPublic]

def _clean_service_name(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None

def _should_exclude_endpoint(endpoint: ApiEndpoint, service_name: str) -> bool:
    normalized_service_name = service_name.strip().lower()
    normalized_path = endpoint.path.strip() if endpoint.path else ""
    return (
        normalized_service_name in EXCLUDED_SERVICE_NAMES
        or normalized_path in EXCLUDED_PATHS
    )

@router.get(
    "/",
    response_model=SystemModulesStatsResponse,
    summary="获取所有系统模块的聚合统计逻辑",
)
# [设计意图]：V3.0 版本后，统计数据已实现持久化存储。此接口不再实时聚合流量记录，而是直接从模块表中读取预计算结果，大幅提升万级接口场景下的加载速度。
def get_system_modules_stats(session: SessionDep) -> Any:
    # 一次性获取所有系统模块
    modules = session.exec(select(SystemModule)).all()
    # 为了统计接口数量，仍需要获取接口概况（后续可优化为在模型层冗余接口总数）
    endpoints = session.exec(select(ApiEndpoint)).all()

    # 按模块 ID 对接口进行分组统计
    module_eps_stats = defaultdict(lambda: {"total": 0, "documented": 0, "shadow": 0, "last_scan": None})
    for ep in endpoints:
        stats = module_eps_stats[ep.module_id]
        stats["total"] += 1
        if ep.source_type == SourceType.documented:
            stats["documented"] += 1
        else:
            stats["shadow"] += 1
        
        # 更新该模块的最晚扫描时间（接口创建时间）
        if ep.created_at:
            if stats["last_scan"] is None or ep.created_at > stats["last_scan"]:
                stats["last_scan"] = ep.created_at

    stats_list = []
    for module in modules:
        service_name = _clean_service_name(module.name)
        # 排除内部默认服务
        if not service_name or service_name.lower() in EXCLUDED_SERVICE_NAMES:
            continue

        m_stats = module_eps_stats.get(module.id, {"total": 0, "documented": 0, "shadow": 0, "last_scan": None})

        # 组装响应模型，优先使用持久化字段
        stats = SystemModuleStats(
            id=str(module.id),
            name=module.name,
            description=module.description,
            interfaces=m_stats["total"],
            documented=m_stats["documented"],
            shadow=m_stats["shadow"],
            last_scanned_at=m_stats["last_scan"],
            # v3.0 新增字段映射
            owner=module.owner,
            status=module.status,
            total_traffic_count=module.total_traffic_count,
            unique_traffic_count=module.unique_traffic_count,
            last_active_at=module.last_active_at,
            deprecated_at=module.deprecated_at,
        )
        stats_list.append(stats)

    # 按服务名称字母顺序排序，保持 UI 展示逻辑一致
    stats_list.sort(key=lambda x: x.name)
    return {"data": stats_list}


@router.post("/", response_model=SystemModule, summary="手动创建一个系统模块")
# [设计意图]：允许管理员在流量捕获前，先手动定义业务服务及其责任人。
def create_system_module(module_in: SystemModuleCreate, session: SessionDep) -> Any:
    # 检查重名风险
    existing = session.exec(select(SystemModule).where(SystemModule.name == module_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="服务名称已存在")
    
    db_module = SystemModule.model_validate(module_in)
    session.add(db_module)
    session.commit()
    session.refresh(db_module)
    return db_module


@router.patch("/{module_id}", response_model=SystemModule, summary="更新系统模块信息")
# [设计意图]：支持修改服务名称、责任人或切换状态（Active/Deprecated）。当切换到 Deprecated 时，会自动记录时间。
def update_system_module(module_id: uuid.UUID, module_in: SystemModuleUpdate, session: SessionDep) -> Any:
    db_module = session.get(SystemModule, module_id)
    if not db_module:
        raise HTTPException(status_code=404, detail="模块未找到")
    
    update_data = module_in.model_dump(exclude_unset=True)
    
    # 状态切换逻辑处理
    if "status" in update_data and update_data["status"] != db_module.status:
        if update_data["status"] == ServiceStatus.deprecated:
            db_module.deprecated_at = datetime.now()
        elif update_data["status"] == ServiceStatus.active:
            db_module.deprecated_at = None # 恢复激活时清空弃用时间

    for key, value in update_data.items():
        setattr(db_module, key, value)
    
    session.add(db_module)
    session.commit()
    session.refresh(db_module)
    return db_module


@router.delete("/{module_id}", summary="彻底删除一个系统模块")
# [设计意图]：执行物理删除，级联清理其下的所有接口定义与流量记录。请谨慎操作。
def delete_system_module(module_id: uuid.UUID, session: SessionDep) -> Any:
    db_module = session.get(SystemModule, module_id)
    if not db_module:
        raise HTTPException(status_code=404, detail="模块未找到")
    
    session.delete(db_module)
    session.commit()
    return {"message": "服务模块及关联数据已彻底清理"}


@router.get(
    "/{module_id}/endpoints",
    response_model=ApiEndpointsPublic,
    summary="Get endpoints for a specific module",
)
# [设计意图]：为“接口中心列表页”提供真实分页能力，并支持服务端关键字过滤，避免前端全量拉取后再本地分页带来的性能与一致性问题。
# [参数说明]：module_id 为模块 UUID；skip 为偏移量（从第几条开始）；limit 为分页大小；keyword 为可选搜索词（匹配 path/method/name/description）。
# [注意]：keyword 为空时不做过滤；过滤发生在分页前以保证 count 正确；当模块不存在时必须返回 404，避免前端误判为空列表。
def get_module_endpoints(
    module_id: uuid.UUID,  # 路径参数：当前要查询的模块主键（UUID），用于限定只看该模块下的接口。
    session: SessionDep,  # 依赖注入：数据库会话（由 FastAPI 统一提供），用于执行 SQLModel 查询。
    skip: int = 0,  # 查询参数：分页偏移量，表示“从第几条开始取”（0 表示从首条开始）。
    limit: int = 100,  # 查询参数：分页大小，表示“最多返回多少条记录”。
    keyword: str | None = None,  # 查询参数：可选关键字，用于服务端模糊过滤接口字段。
) -> Any:
    module = session.get(SystemModule, module_id)  # 先按主键读取模块实体，确保模块存在再继续查接口。
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")  # 模块不存在直接返回 404，避免把“错误模块”伪装成“空列表”。

    service_name = _clean_service_name(module.name)  # 规范化模块名称（去空白并处理空字符串），避免后续过滤条件失真。
    if not service_name:
        return {"data": [], "count": 0}  # 模块名不可用时无法做有效排除/分组，直接返回空分页结果。

    statement = select(ApiEndpoint).where(ApiEndpoint.module_id == module_id)  # 构建查询：先拉取该模块下的原始接口集合。
    all_endpoints = session.exec(statement).all()  # 执行查询并获取列表（后续在内存中做业务过滤、排序与分页）。

    valid_endpoints = [
        ep  # 当前遍历到的接口对象。
        for ep in all_endpoints  # 遍历该模块下所有候选接口。
        if not _should_exclude_endpoint(ep, service_name)  # 排除默认服务名/根路径等“噪声接口”，保证展示结果干净。
    ]  # 得到业务可见的“有效接口列表”。

    # 将搜索词做规范化处理（去掉首尾空白并统一小写），确保查询行为稳定且大小写不敏感。
    normalized_keyword = (keyword or "").strip().lower()  # None 与空字符串统一处理，避免分支逻辑重复。
    # 仅当 keyword 非空时执行过滤：这样可以避免无意义遍历，并保持“空搜索词=不过滤”的语义。
    if normalized_keyword:
        valid_endpoints = [
            ep  # 当前遍历到的有效接口对象。
            for ep in valid_endpoints  # 在“已排除噪声后”的集合上继续做关键字过滤。
            # 在 path/method/name/description 四个字段中做包含匹配，覆盖“按路径/方法/描述搜索”的常见场景。
            if normalized_keyword
            in " ".join([ep.path, ep.method, ep.name or "", ep.description or ""]).lower()  # 把多字段拼接成单字符串统一匹配，兼顾可读性与维护成本。
        ]  # 更新为“关键字过滤后”的结果集。

    valid_endpoints.sort(
        key=lambda x: (
            0 if x.source_type == SourceType.documented else 1,  # 先让 documented（人工登记）优先展示，提高可维护接口可见性。
            x.path,  # 再按路径字典序排序，便于用户快速定位并形成稳定展示顺序。
        )
    )  # 原地排序，避免额外内存拷贝。

    paginated_endpoints = valid_endpoints[skip : skip + limit]  # 最后一步才分页：保证 count 反映的是“过滤后总量”。

    return {
        # 返回当前页数据（由 skip/limit 截取后的子集）。
        "data": paginated_endpoints,  # 当前页记录，供前端表格渲染。
        # 返回过滤后的总数（而不是当前页条数），供前端计算总页数与分页按钮。
        "count": len(valid_endpoints),  # 总记录数（过滤后），用于前端分页器展示“共 N 条”并计算总页数。
    }  # 按 ApiEndpointsPublic 响应模型返回标准分页结构。


@router.get(
    "/{module_id}/endpoints/{endpoint_id}",
    response_model=ApiEndpointDetailResponse,
    summary="Get details and recent traffic for a specific endpoint",
)
def get_module_endpoint_detail(
    module_id: uuid.UUID,
    endpoint_id: uuid.UUID,
    session: SessionDep,
) -> Any:
    module = session.get(SystemModule, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    endpoint = session.get(ApiEndpoint, endpoint_id)
    if not endpoint or endpoint.module_id != module_id:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    traffic_statement = (
        select(FilteredFlow)
        .where(FilteredFlow.endpoint_id == endpoint_id)
        .order_by(FilteredFlow.created_at.desc()) # type: ignore
        .limit(RECENT_TRAFFIC_LIMIT)
    )
    records = session.exec(traffic_statement).all()

    count_statement = (
        select(func.count())
        .select_from(FilteredFlow)
        .where(FilteredFlow.endpoint_id == endpoint_id)
    )
    traffic_count = session.exec(count_statement).one()

    # 数据格式转换 (bytes -> str)
    recent_traffic = []
    for r in records:
        recent_traffic.append(
            FilteredFlowPublic(
                id=r.id,
                endpoint_id=r.endpoint_id,
                method=r.method,
                original_path=r.original_path,
                headers=r.headers,
                body=r.body.decode("utf-8", errors="replace") if r.body else None,
                client_ip=r.client_ip,
                created_at=r.created_at,
                variant_count=r.variant_count,
                replay_count=r.replay_count
            )
        )

    last_seen_at = None
    if recent_traffic:
        last_seen_at = recent_traffic[0].created_at

    return {
        "endpoint": endpoint,
        "module_name": module.name,
        "traffic_count": traffic_count,
        "last_seen_at": last_seen_at,
        "recent_traffic": recent_traffic,
    }

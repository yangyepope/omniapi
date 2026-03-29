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
    TrafficRecord,
    TrafficRecordPublic,
)

router = APIRouter(prefix="/system-modules", tags=["system-modules"])

EXCLUDED_SERVICE_NAMES = {"default"}
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

class SystemModulesStatsResponse(BaseModel):
    data: list[SystemModuleStats]

class ApiEndpointDetailResponse(BaseModel):
    endpoint: ApiEndpointPublic
    module_name: str
    traffic_count: int
    last_seen_at: datetime | None
    recent_traffic: list[TrafficRecordPublic]

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
    summary="Get aggregated stats for all system modules",
)
def get_system_modules_stats(session: SessionDep) -> Any:
    modules = session.exec(select(SystemModule)).all()
    endpoints = session.exec(select(ApiEndpoint)).all()

    module_endpoints = defaultdict(list)
    for ep in endpoints:
        module_endpoints[ep.module_id].append(ep)

    stats_list = []
    for module in modules:
        service_name = _clean_service_name(module.name)
        if not service_name or service_name.lower() in EXCLUDED_SERVICE_NAMES:
            continue

        module_eps = module_endpoints.get(module.id, [])
        valid_eps = [
            ep for ep in module_eps if not _should_exclude_endpoint(ep, service_name)
        ]

        total_interfaces = len(valid_eps)
        if total_interfaces == 0:
            continue

        documented_count = sum(
            1 for ep in valid_eps if ep.source_type == SourceType.documented
        )
        shadow_count = sum(
            1 for ep in valid_eps if ep.source_type == SourceType.auto_discovered
        )

        last_scanned_at = max(
            (ep.created_at for ep in valid_eps if ep.created_at), default=None
        )

        stats = SystemModuleStats(
            id=str(module.id),
            name=service_name,
            description=module.description,
            interfaces=total_interfaces,
            documented=documented_count,
            shadow=shadow_count,
            last_scanned_at=last_scanned_at,
        )
        stats_list.append(stats)

    stats_list.sort(key=lambda x: x.name)
    return {"data": stats_list}


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
        select(TrafficRecord)
        .where(TrafficRecord.endpoint_id == endpoint_id)
        .order_by(TrafficRecord.created_at.desc()) # type: ignore
        .limit(RECENT_TRAFFIC_LIMIT)
    )
    recent_traffic = session.exec(traffic_statement).all()

    count_statement = (
        select(func.count())
        .select_from(TrafficRecord)
        .where(TrafficRecord.endpoint_id == endpoint_id)
    )
    traffic_count = session.exec(count_statement).one()

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

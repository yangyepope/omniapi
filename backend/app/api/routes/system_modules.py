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
def get_module_endpoints(
    module_id: uuid.UUID,
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    module = session.get(SystemModule, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    service_name = _clean_service_name(module.name)
    if not service_name:
        return {"data": [], "count": 0}

    statement = select(ApiEndpoint).where(ApiEndpoint.module_id == module_id)
    all_endpoints = session.exec(statement).all()

    valid_endpoints = [
        ep for ep in all_endpoints if not _should_exclude_endpoint(ep, service_name)
    ]

    valid_endpoints.sort(
        key=lambda x: (
            0 if x.source_type == SourceType.documented else 1,
            x.path,
        )
    )

    paginated_endpoints = valid_endpoints[skip : skip + limit]

    return {
        "data": paginated_endpoints,
        "count": len(valid_endpoints),
    }


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

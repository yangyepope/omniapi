import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import SessionDep, get_current_active_superuser
from app.models import Variant, VariantPublic, User, BaselineResult
from app.services.replay import ReplayEngine

router = APIRouter()

@router.post(
    "/baseline/{flow_id}",
    response_model=BaselineResult,
    summary="Execute Baseline Replay",
    description="Replay the original captured flow to get a baseline response for DIFF comparison."
)
def execute_baseline(
    flow_id: uuid.UUID,
    session: SessionDep,
    current_user: Annotated[User, Depends(get_current_active_superuser)]
) -> BaselineResult:
    """
    [接口职责]：执行流量基准重放。
    [Gevent 对齐]：内部是同步调用，移除 async 以启用 FastAPI 线程池分配。
    """
    try:
        result = ReplayEngine.execute_baseline_by_flow_id(flow_id, session)
        return BaselineResult(**result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post(
    "/{variant_id}",
    response_model=VariantPublic,
    summary="Execute Replay for Variant",
    description="Trigger an asynchronous-ish HTTP request to replay a captured variant and update its state."
)
def execute_replay(
    variant_id: uuid.UUID,
    session: SessionDep,
    current_user: Annotated[User, Depends(get_current_active_superuser)]
) -> Variant:
    """
    [接口职责]：执行单点重放。
    [Gevent 对齐]：内部是同步执行，交由 FastAPI 线程池并发处理，防止阻塞主事件循环。
    """
    try:
        updated_variant = ReplayEngine.execute_variant(variant_id, session)
        return updated_variant
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Replay execution failed: {str(e)}"
        )

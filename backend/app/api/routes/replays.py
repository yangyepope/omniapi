from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import Variant, VariantPublic, User
from app.services.replay import ReplayEngine

router = APIRouter()

@router.post(
    "/{variant_id}",
    response_model=VariantPublic,
    summary="Execute Replay for Variant",
    description="Trigger an asynchronous-ish HTTP request to replay a captured variant and update its state."
)
async def execute_replay(
    variant_id: uuid.UUID,
    session: SessionDep,
    current_user: Annotated[User, Depends(get_current_active_superuser)]
) -> Variant:
    """
    [接口职责]：执行单点重放。
    [业务约束]：目前仅由同步请求完成，后续可扩展为异步 Task。
    """
    try:
        updated_variant = await ReplayEngine.execute_variant(variant_id, session)
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

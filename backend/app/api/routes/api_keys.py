import secrets
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ApiKey,
    ApiKeyCreate,
    ApiKeyPublic,
    ApiKeysPublic,
    Message,
)

router = APIRouter(prefix="/api-keys", tags=["api-keys"])

@router.get("/", response_model=ApiKeysPublic)
def read_api_keys(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve own API keys.
    """
    count_statement = select(func.count()).select_from(ApiKey).where(ApiKey.user_id == current_user.id)
    count = session.exec(count_statement).one()

    statement = (
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    api_keys = session.exec(statement).all()

    return ApiKeysPublic(data=api_keys, count=count)

@router.post("/", response_model=ApiKeyPublic)
def create_api_key(
    *, session: SessionDep, current_user: CurrentUser, api_key_in: ApiKeyCreate
) -> Any:
    """
    Create new API key.
    """
    # Generate a random key
    # Using a prefix like "sk-" is common practice
    key_content = f"sk-{secrets.token_urlsafe(32)}"

    api_key = ApiKey.model_validate(
        api_key_in,
        update={"user_id": current_user.id, "key": key_content}
    )
    session.add(api_key)
    session.commit()
    session.refresh(api_key)
    return api_key

@router.delete("/{id}", response_model=Message)
def delete_api_key(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Delete an API key.
    """
    api_key = session.get(ApiKey, id)
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    if api_key.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(api_key)
    session.commit()
    return Message(message="API key deleted successfully")

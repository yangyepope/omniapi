from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import (
    APIKeyHeader,
    OAuth2PasswordBearer,
)
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session, select

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.models import ApiKey, TokenPayload, User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)

reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token", auto_error=False
)

api_key_header = APIKeyHeader(
    name="X-API-Key",
    auto_error=False,
    description="API Key (use X-API-Key header, not Authorization: Bearer)",
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_user_or_apikey(
    session: SessionDep,
    token_oauth: Annotated[str | None, Depends(reusable_oauth2_optional)] = None,
    api_key: Annotated[str | None, Depends(api_key_header)] = None,
) -> User:
    """
    Get user from either OAuth2 JWT token or API Key.
    尝试从 OAuth2 JWT 令牌或 API Key 获取当前用户。
    """
    # 优先尝试使用 OAuth2 的 token (通常是登录后的 JWT)
    token = token_oauth

    # 如果没有 OAuth2 token，但有 API Key，则使用 API Key
    if not token and api_key:
        token = api_key

    # 如果两者都没有提供，抛出 401 未认证异常
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. 尝试将 token 解析为 JWT (系统登录用户)
    try:
        # 使用密钥解码 token
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        # 验证 payload 格式
        token_data = TokenPayload(**payload)
        # 从数据库查找对应用户
        user = session.get(User, token_data.sub)
        # 如果用户存在且处于激活状态，验证成功，直接返回用户
        if user and user.is_active:
            return user
    except (InvalidTokenError, ValidationError):
        pass  # 解析失败，说明不是有效的 JWT，继续尝试检查是否为 API Key

    # 2. 尝试将 token 视为 API Key (第三方调用)
    # 查找数据库中匹配且激活的 API Key
    statement = select(ApiKey).where(ApiKey.key == token).where(ApiKey.is_active)
    api_key_obj = session.exec(statement).first()

    # 如果找到了对应的 API Key
    if api_key_obj:
        # 查找该 API Key 归属的用户
        user = session.get(User, api_key_obj.user_id)
        # 如果用户存在且处于激活状态，验证成功，返回该用户
        if user and user.is_active:
            # TODO: 这里可以增加调用次数统计逻辑
            return user

    # 如果 JWT 和 API Key 都验证失败，抛出 403 禁止访问异常
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials",
    )


CurrentUserOrApiKey = Annotated[User, Depends(get_current_user_or_apikey)]


def get_current_user_by_apikey(
    session: SessionDep,
    api_key: Annotated[str | None, Depends(api_key_header)] = None,
) -> User:
    """
    Get user from API Key only.
    仅通过 API Key 获取当前用户。
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "APIKey"},
        )

    token = api_key

    # 查找数据库中匹配且激活的 API Key
    statement = select(ApiKey).where(ApiKey.key == token).where(ApiKey.is_active)
    api_key_obj = session.exec(statement).first()

    # 如果找到了对应的 API Key
    if api_key_obj:
        # 查找该 API Key 归属的用户
        user = session.get(User, api_key_obj.user_id)
        # 如果用户存在且处于激活状态，验证成功，返回该用户
        if user and user.is_active:
            # TODO: 这里可以增加调用次数统计逻辑
            return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials",
    )


CurrentUserByApiKey = Annotated[User, Depends(get_current_user_by_apikey)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


def get_token_validity(token: TokenDep) -> str:
    """
    Validate that the token is a valid system-issued token.
    Does not require user lookup, just signature and expiration verification.
    Returns the valid token string.
    """
    try:
        jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        return token
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

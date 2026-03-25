from collections.abc import (
    Generator,  # Generator：用于声明 yield 形式的依赖注入返回类型（DB Session）
)
from typing import (
    Annotated,  # Annotated：FastAPI 推荐的依赖注入类型标注方式（可读性更好）
)

import jwt  # PyJWT：用于解码/校验系统签发的 JWT（登录态）
from fastapi import (  # Depends：依赖注入；HTTPException：抛出 HTTP 错误；status：状态码常量
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (  # FastAPI 安全组件：定义 OAuth2 Bearer 与 API Key Header
    APIKeyHeader,  # API Key 头：从指定 header 读取 key
    OAuth2PasswordBearer,  # OAuth2 Bearer：从 Authorization: Bearer <token> 读取 token
)
from jwt.exceptions import (
    InvalidTokenError,  # JWT 解码失败的异常类型（签名/过期/格式错误等）
)
from pydantic import ValidationError  # Pydantic 校验异常：TokenPayload 解析失败时触发
from sqlmodel import Session, select  # SQLModel：Session 数据库会话；select 构造查询

from app.core import security  # 安全相关工具：包含 JWT 算法常量等
from app.core.config import settings  # 全局配置：包含 SECRET_KEY、API 前缀等
from app.core.db import engine  # 数据库引擎：用于创建 Session
from app.models import ApiKey, TokenPayload, User  # 数据模型：API Key、JWT 载荷、用户

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
    with Session(
        engine
    ) as session:  # 用 SQLModel Session 包一层上下文：请求结束自动关闭连接
        yield session  # yield 形式依赖：把 session 交给路由函数使用


SessionDep = Annotated[Session, Depends(get_db)]  # 依赖别名：注入数据库会话（Session）
TokenDep = Annotated[
    str, Depends(reusable_oauth2)
]  # 依赖别名：注入必填的 OAuth2 Bearer token


def get_current_user(session: SessionDep) -> User:
    """
    【开发环境临时修改】跳过鉴权，直接返回首个超级管理员或第一个用户。
    """
    user = session.exec(select(User).where(User.email == settings.FIRST_SUPERUSER)).first()
    if not user:
        user = session.exec(select(User)).first()
    if not user:
        raise HTTPException(status_code=404, detail="No users found in database")
    return user

    # --- 原鉴权逻辑（开发阶段暂时注释） ---
    # try:
    #     payload = jwt.decode(
    #         token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
    #     )
    #     token_data = TokenPayload(**payload)
    # except (InvalidTokenError, ValidationError):
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Could not validate credentials",
    #     )
    # user = session.get(User, token_data.sub)
    # if not user:
    #     raise HTTPException(status_code=404, detail="User not found")
    # if not user.is_active:
    #     raise HTTPException(status_code=400, detail="Inactive user")
    # return user


CurrentUser = Annotated[
    User, Depends(get_current_user)
]  # 依赖别名：注入“当前登录用户”（仅 JWT）


def get_current_user_or_apikey(
    session: SessionDep,
) -> User:
    """
    Get user from either OAuth2 JWT token or API Key.
    【开发环境临时修改】跳过鉴权，直接复用 get_current_user。
    """
    return get_current_user(session)

    # --- 原鉴权逻辑（开发阶段暂时注释） ---
    # token = token_oauth
    # if not token and api_key:
    #     token = api_key
    # if not token:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Not authenticated",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )
    # try:
    #     payload = jwt.decode(
    #         token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
    #     )
    #     token_data = TokenPayload(**payload)
    #     user = session.get(User, token_data.sub)
    #     if user and user.is_active:
    #         return user
    # except (InvalidTokenError, ValidationError):
    #     pass
    # statement = select(ApiKey).where(ApiKey.key == token).where(ApiKey.is_active)
    # api_key_obj = session.exec(statement).first()
    # if api_key_obj:
    #     user = session.get(User, api_key_obj.user_id)
    #     if user and user.is_active:
    #         return user
    # raise HTTPException(
    #     status_code=status.HTTP_403_FORBIDDEN,
    #     detail="Could not validate credentials",
    # )


CurrentUserOrApiKey = Annotated[
    User, Depends(get_current_user_or_apikey)
]  # 依赖别名：JWT 或 API Key 二选一


def get_current_user_by_apikey(
    session: SessionDep,
) -> User:
    """
    Get user from API Key only.
    【开发环境临时修改】跳过鉴权，直接复用 get_current_user。
    """
    return get_current_user(session)

    # --- 原鉴权逻辑（开发阶段暂时注释） ---
    # if not api_key:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Not authenticated",
    #         headers={"WWW-Authenticate": "APIKey"},
    #     )
    # token = api_key
    # statement = select(ApiKey).where(ApiKey.key == token).where(ApiKey.is_active)
    # api_key_obj = session.exec(statement).first()
    # if api_key_obj:
    #     user = session.get(User, api_key_obj.user_id)
    #     if user and user.is_active:
    #         return user
    # raise HTTPException(
    #     status_code=status.HTTP_403_FORBIDDEN,
    #     detail="Could not validate credentials",
    # )


CurrentUserByApiKey = Annotated[
    User, Depends(get_current_user_by_apikey)
]  # 依赖别名：仅允许 API Key


def get_current_active_superuser(current_user: CurrentUser) -> User:
    """
    【开发环境临时修改】跳过超管校验。
    """
    return current_user

    # --- 原鉴权逻辑（开发阶段暂时注释） ---
    # if not current_user.is_superuser:
    #     raise HTTPException(
    #         status_code=403,
    #         detail="The user doesn't have enough privileges",
    #     )
    # return current_user


def get_token_validity(token: TokenDep) -> str:
    """
    Validate that the token is a valid system-issued token.
    Does not require user lookup, just signature and expiration verification.
    Returns the valid token string.
    """
    try:  # 只做 token 本身的校验：不查库、不校验用户状态
        jwt.decode(  # 解码成功代表签名/算法/过期校验通过
            token,  # Bearer token
            settings.SECRET_KEY,  # 签名密钥
            algorithms=[security.ALGORITHM],  # 允许算法
        )
        return token  # 返回原 token：供下游继续使用
    except (
        InvalidTokenError,
        ValidationError,
    ):  # token 无效或 payload 结构不符合 TokenPayload
        raise HTTPException(  # 返回 403：凭证无效
            status_code=status.HTTP_403_FORBIDDEN,  # 403 Forbidden
            detail="Could not validate credentials",  # 错误详情
        )

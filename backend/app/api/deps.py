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


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:  # 尝试解码/校验 JWT（签名、算法、过期等）
        payload = jwt.decode(  # 解码 JWT：成功会得到 payload 字典
            token,  # 从 Authorization Bearer 里拿到的 token 字符串
            settings.SECRET_KEY,  # 服务端签名密钥：必须与签发时一致
            algorithms=[security.ALGORITHM],  # 允许的算法列表：防止算法降级攻击
        )
        token_data = TokenPayload(**payload)  # 载荷结构化：校验 sub/exp 等字段类型
    except (InvalidTokenError, ValidationError):  # JWT 无效或载荷结构不符合预期
        raise HTTPException(  # 统一返回 403：凭证无效（不泄露细节）
            status_code=status.HTTP_403_FORBIDDEN,  # 403 Forbidden
            detail="Could not validate credentials",  # 错误详情
        )
    user = session.get(User, token_data.sub)  # 通过 sub（用户 ID）查询数据库用户
    if not user:  # 用户不存在（例如被删除）
        raise HTTPException(status_code=404, detail="User not found")  # 404 Not Found
    if not user.is_active:  # 用户被禁用
        raise HTTPException(status_code=400, detail="Inactive user")  # 400 Bad Request
    return user  # 返回当前登录用户对象


CurrentUser = Annotated[
    User, Depends(get_current_user)
]  # 依赖别名：注入“当前登录用户”（仅 JWT）


def get_current_user_or_apikey(
    session: SessionDep,
    token_oauth: Annotated[str | None, Depends(reusable_oauth2_optional)] = None,
    api_key: Annotated[str | None, Depends(api_key_header)] = None,
) -> User:
    """
    Get user from either OAuth2 JWT token or API Key.
    尝试从 OAuth2 JWT 令牌或 API Key 获取当前用户。
    """
    # 优先尝试使用 OAuth2 的 token (通常是登录后的 JWT)  # JWT 登录态优先级高于 API Key
    token = token_oauth  # 先把可选的 JWT token 取出来

    # 如果没有 OAuth2 token，但有 API Key，则使用 API Key  # 允许第三方通过 X-API-Key 调用
    if not token and api_key:  # 两种凭证都可能为空，这里做兜底选择
        token = api_key  # 复用变量 token：后面统一走“先尝试 JWT，再尝试 API Key”的流程

    # 如果两者都没有提供，抛出 401 未认证异常  # 这类错误表示“没带凭证”，不是“凭证无效”
    if not token:  # token 为空说明既没带 Authorization Bearer，也没带 X-API-Key
        raise HTTPException(  # 返回 401：要求客户端提供认证信息
            status_code=status.HTTP_401_UNAUTHORIZED,  # 401 Unauthorized
            detail="Not authenticated",  # 错误详情
            headers={
                "WWW-Authenticate": "Bearer"
            },  # 兼容 Swagger：提示 Bearer 认证方式
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
    except (InvalidTokenError, ValidationError):  # JWT 校验失败或结构不对
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


CurrentUserOrApiKey = Annotated[
    User, Depends(get_current_user_or_apikey)
]  # 依赖别名：JWT 或 API Key 二选一


def get_current_user_by_apikey(
    session: SessionDep,
    api_key: Annotated[str | None, Depends(api_key_header)] = None,
) -> User:
    """
    Get user from API Key only.
    仅通过 API Key 获取当前用户。
    """
    if not api_key:  # 没带 X-API-Key 头：直接 401
        raise HTTPException(  # 返回 401：要求客户端提供 API Key
            status_code=status.HTTP_401_UNAUTHORIZED,  # 401 Unauthorized
            detail="Not authenticated",  # 错误详情
            headers={
                "WWW-Authenticate": "APIKey"
            },  # 提示认证方案是 APIKey（非 Bearer）
        )

    token = api_key  # 统一命名：把 header 的 api_key 当作 token 来校验

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


CurrentUserByApiKey = Annotated[
    User, Depends(get_current_user_by_apikey)
]  # 依赖别名：仅允许 API Key


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:  # 当前用户不是超管：禁止访问
        raise HTTPException(  # 返回 403：权限不足
            status_code=403,  # 403 Forbidden
            detail="The user doesn't have enough privileges",  # 错误详情
        )
    return current_user  # 超管校验通过：返回当前用户


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

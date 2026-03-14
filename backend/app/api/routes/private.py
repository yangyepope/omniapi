from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import UserCreate, UserPublic
from app.services.private_user_service import (
    UserAlreadyExistsError,
    create_user_for_internal_test,
)

# 这个模块只放“路由层”相关内容：
# - 定义 APIRouter
# - 定义 endpoint（请求/响应模型、鉴权依赖、HTTP 错误码映射等）
# 具体“业务逻辑/数据库读写”放到 app/services 下的 service 中，便于复用与测试。

# 注意：private 路由是否真正对外暴露由更上层的路由注册控制（见 app/api/main.py）。
router = APIRouter(tags=["private"], prefix="/private")


@router.post(
    "/users/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def create_user(user_in: UserCreate, session: SessionDep) -> Any:
    """
    创建用户（仅内部测试使用）。

    路由层的职责：
    - 接收并校验请求体（UserCreate）
    - 绑定鉴权依赖（必须是超管）
    - 调用 service 层完成实际创建
    - 将 service 层的业务异常映射为 HTTP 错误响应
    """
    try:
        # 将“查重 + 创建”的业务逻辑下沉到 service 层，路由层只负责组装输入与处理异常映射。
        user = create_user_for_internal_test(session=session, user_in=user_in)
        return user
    except UserAlreadyExistsError:
        # 业务异常 -> HTTP 响应：这里使用 400 表示请求不合法（邮箱已存在）。
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        ) from None

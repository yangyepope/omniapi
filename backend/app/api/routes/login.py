from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core import security
from app.core.config import settings
from app.models import Message, NewPassword, Token, UserPublic, UserUpdate
from app.utils import (
    generate_password_reset_token,
    generate_reset_password_email,
    send_email,
    verify_password_reset_token,
)

# 创建登录相关路由组
router = APIRouter(tags=["login"])


@router.post("/login/access-token")
def login_access_token(
    session: SessionDep, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    兼容 OAuth2 的 Token 登录接口，获取供后续请求使用的访问令牌（Access Token）。
    """
    # 验证用户名（邮箱）和密码
    user = crud.authenticate(
        session=session, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="邮箱或密码不正确")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="用户未激活")
    
    # 设置 Token 过期时间
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # 返回生成的 Token
    return Token(
        access_token=security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
    )


@router.post("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    测试访问令牌是否有效。如果有效则返回当前用户信息。
    """
    return current_user


@router.post("/password-recovery/{email}")
def recover_password(email: str, session: SessionDep) -> Message:
    """
    密码恢复接口。向指定邮箱发送重置密码的邮件。
    """
    user = crud.get_user_by_email(session=session, email=email)

    # 始终返回相同的响应以防止恶意枚举邮箱攻击
    # 仅当用户确实存在时才实际发送邮件
    if user:
        password_reset_token = generate_password_reset_token(email=email)
        email_data = generate_reset_password_email(
            email_to=user.email, email=email, token=password_reset_token
        )
        send_email(
            email_to=user.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return Message(
        message="如果该邮箱已注册，我们将向其发送密码恢复链接"
    )


@router.post("/reset-password/")
def reset_password(session: SessionDep, body: NewPassword) -> Message:
    """
    重置密码接口。需要提供有效的重置 Token 和新密码。
    """
    # 验证 Token 并解析出邮箱
    email = verify_password_reset_token(token=body.token)
    if not email:
        raise HTTPException(status_code=400, detail="无效的 Token")
    
    user = crud.get_user_by_email(session=session, email=email)
    if not user:
        # 不要暴露用户不存在的事实 - 统一返回无效的 Token 错误
        raise HTTPException(status_code=400, detail="无效的 Token")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="用户未激活")
        
    # 更新用户密码
    user_in_update = UserUpdate(password=body.new_password)
    crud.update_user(
        session=session,
        db_user=user,
        user_in=user_in_update,
    )
    return Message(message="密码更新成功")


@router.post(
    "/password-recovery-html-content/{email}",
    dependencies=[Depends(get_current_active_superuser)],
    response_class=HTMLResponse,
)
def recover_password_html_content(email: str, session: SessionDep) -> Any:
    """
    获取密码恢复邮件的 HTML 内容（仅超级管理员可调用，用于调试）。
    """
    user = crud.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="系统中不存在该用户。",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )

    return HTMLResponse(
        content=email_data.html_content, headers={"subject:": email_data.subject}
    )


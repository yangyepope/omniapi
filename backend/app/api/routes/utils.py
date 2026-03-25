from fastapi import APIRouter, Depends
from pydantic.networks import EmailStr

from app.api.deps import get_current_active_superuser
from app.models import Message
from app.utils import generate_test_email, send_email

# 创建 utils 相关的路由组
router = APIRouter(prefix="/utils", tags=["utils"])


@router.post(
    "/test-email/",
    dependencies=[Depends(get_current_active_superuser)],  # 依赖注入：仅超级管理员可以调用
    status_code=201,
)
def test_email(email_to: EmailStr) -> Message:
    """
    发送测试邮件
    """
    # 生成测试邮件的主题和内容
    email_data = generate_test_email(email_to=email_to)
    # 调用邮件发送工具发出邮件
    send_email(
        email_to=email_to,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Test email sent")


@router.get("/health-check/")
async def health_check() -> bool:
    # 简单的健康检查接口，直接返回 True 表示服务在线
    return True


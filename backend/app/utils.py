import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import emails  # type: ignore # 导入第三方邮件库
import jwt  # 导入 JWT 库，用于生成和验证 Token
from jinja2 import Template  # 导入 Jinja2，用于渲染 HTML 模板
from jwt.exceptions import InvalidTokenError  # 导入 JWT 验证异常类

from app.core import security
from app.core.config import settings

# 初始化基础日志配置
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# 定义邮件数据结构：包含 HTML 正文和主题
@dataclass
class EmailData:
    html_content: str
    subject: str


def render_email_template(*, template_name: str, context: dict[str, Any]) -> str:
    # 根据模板文件名找到模板的绝对路径并读取内容
    template_str = (
        Path(__file__).parent / "email-templates" / "build" / template_name
    ).read_text()
    # 使用传入的上下文字典渲染 Jinja2 模板
    html_content = Template(template_str).render(context)
    return html_content


def send_email(
    *,
    email_to: str,
    subject: str = "",
    html_content: str = "",
) -> None:
    # 确保邮件功能在配置中已开启
    assert settings.emails_enabled, "未提供邮件相关的配置变量"
    # 构建邮件对象，包含主题、发件人和正文
    message = emails.Message(
        subject=subject,
        html=html_content,
        mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
    )
    # 准备 SMTP 服务器配置
    smtp_options = {"host": settings.SMTP_HOST, "port": settings.SMTP_PORT}
    if settings.SMTP_TLS:
        smtp_options["tls"] = True  # 启用 TLS
    elif settings.SMTP_SSL:
        smtp_options["ssl"] = True  # 启用 SSL
    if settings.SMTP_USER:
        smtp_options["user"] = settings.SMTP_USER
    if settings.SMTP_PASSWORD:
        smtp_options["password"] = settings.SMTP_PASSWORD
    # 发送邮件并记录响应结果
    response = message.send(to=email_to, smtp=smtp_options)
    logger.info(f"发送邮件结果: {response}")


def generate_test_email(email_to: str) -> EmailData:
    # 生成测试邮件的主题
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - 测试邮件"
    # 渲染测试邮件的 HTML 模板
    html_content = render_email_template(
        template_name="test_email.html",
        context={"project_name": settings.PROJECT_NAME, "email": email_to},
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_reset_password_email(email_to: str, email: str, token: str) -> EmailData:
    # 生成重置密码邮件的主题和链接
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - 用户 {email} 的密码恢复"
    link = f"{settings.FRONTEND_HOST}/reset-password?token={token}"
    # 渲染密码恢复模板
    html_content = render_email_template(
        template_name="reset_password.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": email,
            "email": email_to,
            "valid_hours": settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS,
            "link": link,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_new_account_email(
    email_to: str, username: str, password: str
) -> EmailData:
    # 生成新账号通知邮件的主题
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - 用户 {username} 的新账号"
    # 渲染新账号模板
    html_content = render_email_template(
        template_name="new_account.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": username,
            "password": password,
            "email": email_to,
            "link": settings.FRONTEND_HOST,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_password_reset_token(email: str) -> str:
    # 计算 Token 过期时间
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    # 编码 JWT Token：包含过期时间、生效时间和受体(邮件)
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email},
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> str | None:
    try:
        # 解码并验证 Token 的签名和过期时间
        decoded_token = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        return str(decoded_token["sub"])  # 返回 Token 中包含的邮箱地址
    except InvalidTokenError:
        # Token 无效或已过期时返回 None
        return None

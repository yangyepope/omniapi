from datetime import (  # 生成 JWT 过期时间、处理时区（统一用 UTC）
    datetime,
    timedelta,
    timezone,
)
from typing import Any  # subject 允许传入任意类型（最终会转换为字符串写入 JWT）

import jwt  # PyJWT：用于 JWT 的编码（签发）与解码（验证）
from pwdlib import PasswordHash  # 密码哈希封装：支持多种算法与透明升级
from pwdlib.hashers.argon2 import Argon2Hasher  # Argon2：推荐的现代密码哈希算法
from pwdlib.hashers.bcrypt import (
    BcryptHasher,  # Bcrypt：兼容/备用哈希算法（常见于历史数据）
)

from app.core.config import settings  # 读取 SECRET_KEY 等安全配置（JWT 签名密钥）

password_hash = PasswordHash(  # 统一的密码哈希器：支持 verify 时自动识别算法并按需升级
    (  # 哈希算法链：先使用 Argon2；同时兼容验证旧的 Bcrypt 哈希
        Argon2Hasher(),  # 首选：新密码生成/升级到 Argon2
        BcryptHasher(),  # 兼容：验证旧 Bcrypt 哈希（验证后可返回建议升级的哈希）
    )  # 算法列表结束
)  # PasswordHash 构造结束


ALGORITHM = "HS256"  # JWT 签名算法：HMAC-SHA256（对称密钥）


def create_access_token(subject: str | Any, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta  # 计算过期时间（UTC，避免时区偏差）
    to_encode = {"exp": expire, "sub": str(subject)}  # JWT payload：exp 过期时间、sub 主体（用户标识）
    encoded_jwt = jwt.encode(  # 使用 SECRET_KEY 对 payload 进行签名生成 JWT 字符串
        to_encode,  # 待编码的 payload
        settings.SECRET_KEY,  # 签名密钥（必须保密）
        algorithm=ALGORITHM,  # 指定签名算法
    )  # encode 结束
    return encoded_jwt  # 返回可用于 Authorization Bearer 的 token


def verify_password(
    plain_password: str, hashed_password: str
) -> tuple[bool, str | None]:
    return password_hash.verify_and_update(  # 校验密码，并在需要时返回“升级后的新哈希”
        plain_password,  # 用户输入的明文密码
        hashed_password,  # 数据库存储的哈希（可能是 Argon2 或 Bcrypt）
    )  # 返回 (是否匹配, 新哈希或 None)


def get_password_hash(password: str) -> str:
    return password_hash.hash(password)  # 对明文密码进行哈希化（默认使用 Argon2）

import uuid  # UUID：用于主键/外键类型，以及生成默认的 UUID v4
from datetime import (  # datetime：时间字段；timezone：显式使用 UTC 时区
    datetime,
    timezone,
)
from typing import (  # Any：放宽类型以兼容第三方库；cast：显式类型断言（给类型检查器用）
    Any,
    cast,
)

from pydantic import (
    EmailStr,  # EmailStr：带 email 格式校验的字符串类型（请求体/模型字段）
)
from sqlalchemy import (
    DateTime,  # DateTime：SQLAlchemy 的时间列类型（这里用于带时区的时间）
)
from sqlmodel import (  # SQLModel：模型基类；Field：字段声明；Relationship：关系声明
    Field,
    Relationship,
    SQLModel,
)


def get_datetime_utc() -> (
    datetime
):  # 统一生成“当前 UTC 时间”的函数（常用于 default_factory）
    return datetime.now(timezone.utc)  # 返回带 UTC 时区的当前时间（避免本地时区歧义）


# Shared properties  # 用户模型的“公共字段”（创建/更新/响应会复用这些字段）
class UserBase(SQLModel):  # UserBase：用户的基础属性集合（不包含密码/哈希等敏感字段）
    email: EmailStr = Field(
        unique=True, index=True, max_length=255
    )  # 用户邮箱：唯一 + 索引 + 长度限制
    is_active: bool = True  # 是否激活：禁用用户时置 False（登录校验会拦截）
    is_superuser: bool = False  # 是否超管：决定能否访问后台管理类接口
    full_name: str | None = Field(
        default=None, max_length=255
    )  # 用户姓名：可选字段（用于展示）


# Properties to receive via API on creation  # 创建用户时 API 需要接收的字段
class UserCreate(
    UserBase
):  # UserCreate：创建用户请求体（含明文 password，写库时会被哈希化）
    password: str = Field(
        min_length=8, max_length=128
    )  # 明文密码：只在创建/更新密码时出现，不会对外返回


class UserRegister(
    SQLModel
):  # UserRegister：注册（signup）请求体（对外开放时通常字段更少）
    email: EmailStr = Field(max_length=255)  # 注册邮箱：必填，长度限制
    password: str = Field(min_length=8, max_length=128)  # 注册密码：必填，长度限制
    full_name: str | None = Field(default=None, max_length=255)  # 注册姓名：可选


# Properties to receive via API on update, all are optional  # 更新用户时 API 需要接收的字段（一般允许部分更新）
class UserUpdate(UserBase):  # UserUpdate：超管更新任意用户的请求体（字段通常允许不传）
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore  # 邮箱：可选；type:ignore 用于兼容 SQLModel/EmailStr 的类型检查细节
    password: str | None = Field(
        default=None, min_length=8, max_length=128
    )  # 密码：可选；若提供则会被更新并重新哈希


class UserUpdateMe(
    SQLModel
):  # UserUpdateMe：用户更新“自己的资料”的请求体（通常不允许改权限字段）
    full_name: str | None = Field(default=None, max_length=255)  # 自己的姓名：可选更新
    email: EmailStr | None = Field(
        default=None, max_length=255
    )  # 自己的邮箱：可选更新（需要做唯一性校验）


class UpdatePassword(SQLModel):  # UpdatePassword：更新密码请求体（需要旧密码 + 新密码）
    current_password: str = Field(
        min_length=8, max_length=128
    )  # 当前密码（用于验证操作者确实知道旧密码）
    new_password: str = Field(min_length=8, max_length=128)  # 新密码（写库时会哈希化）


# Database model, database table inferred from class name  # 数据库模型（table=True 表示映射成真实表）
class User(UserBase, table=True):  # User：用户表（继承 UserBase，并补充数据库专属字段）
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True
    )  # 主键：UUID v4，作为用户唯一标识
    hashed_password: (
        str  # 密码哈希：永远不对外返回；由 crud.create_user/更新密码逻辑写入
    )
    created_at: datetime | None = Field(  # 创建时间：默认当前 UTC 时间
        default_factory=get_datetime_utc,  # 默认值工厂：插入时自动生成 UTC 时间
        sa_type=DateTime(timezone=True),  # type: ignore  # 列类型：带时区的 DateTime（type:ignore 解决类型检查差异）
    )  # created_at 字段声明结束
    items: list["Item"] = Relationship(  # items 关系：一个用户拥有多个 Item
        back_populates="owner",  # 与 Item.owner 相互指向
        cascade_delete=True,  # 级联删除：删用户时可级联删除关联 Item（SQLModel 层面）
    )  # items 关系声明结束
    api_keys: list["ApiKey"] = Relationship(  # api_keys 关系：一个用户拥有多个 ApiKey
        back_populates="user",  # 与 ApiKey.user 相互指向
        cascade_delete=True,  # 级联删除：删用户时可级联删除关联 ApiKey
    )  # api_keys 关系声明结束


# Properties to return via API, id is always required  # 对外返回的用户字段（不含敏感字段）
class UserPublic(UserBase):  # UserPublic：API 响应模型（用于返回用户信息给前端/调用方）
    id: uuid.UUID  # 用户 ID：响应里必须包含
    created_at: datetime | None = None  # 创建时间：可选返回（对外展示用）


class UsersPublic(SQLModel):  # UsersPublic：用户列表响应模型（列表 + 总数）
    data: list[UserPublic]  # 用户列表数据
    count: int  # 总数量（用于分页显示）


# Shared properties  # Item 的公共字段
class ItemBase(SQLModel):  # ItemBase：Item 的基础属性（创建/更新/响应都会复用）
    title: str = Field(min_length=1, max_length=255)  # 标题：必填，至少 1 个字符
    description: str | None = Field(default=None, max_length=255)  # 描述：可选


# Properties to receive on item creation  # 创建 Item 的请求体
class ItemCreate(ItemBase):  # ItemCreate：创建时复用 ItemBase 的字段即可
    pass  # 不新增额外字段，保持与 ItemBase 一致


# Properties to receive on item update  # 更新 Item 的请求体（通常允许部分更新）
class ItemUpdate(ItemBase):  # ItemUpdate：更新时字段可选
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore  # title 可选更新；type:ignore 处理继承字段的类型检查细节


# Database model, database table inferred from class name  # 数据库模型：Item 表
class Item(ItemBase, table=True):  # Item：映射到数据库的 item 表
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)  # 主键：UUID v4
    created_at: datetime | None = Field(  # 创建时间：默认当前 UTC 时间
        default_factory=get_datetime_utc,  # 默认值工厂：插入时生成
        sa_type=DateTime(timezone=True),  # type: ignore  # 列类型：带时区时间
    )  # created_at 字段声明结束
    owner_id: uuid.UUID = Field(  # 外键：所属用户 ID
        foreign_key="user.id",  # 指向 user 表的 id 列
        nullable=False,  # 必须归属某个用户
        ondelete="CASCADE",  # 删除用户时级联删除其 item（数据库层面的 on delete cascade）
    )  # owner_id 字段声明结束
    owner: User | None = Relationship(  # owner 关系：Item 属于一个 User
        back_populates="items"  # 与 User.items 相互指向
    )  # owner 关系声明结束


# Properties to return via API, id is always required  # 对外返回的 Item 字段
class ItemPublic(ItemBase):  # ItemPublic：Item 的响应模型（不一定与数据库列完全一致）
    id: uuid.UUID  # Item ID：响应里必须包含
    owner_id: uuid.UUID  # 所属用户 ID：用于权限/展示
    created_at: datetime | None = None  # 创建时间：可选返回


class ItemsPublic(SQLModel):  # ItemsPublic：Item 列表响应模型
    data: list[ItemPublic]  # Item 列表
    count: int  # 总数（用于分页）


# Generic message  # 通用消息响应
class Message(SQLModel):  # Message：只返回一个 message 字段（常用于删除/更新成功提示）
    message: str  # 消息文本


# JSON payload containing access token  # 登录成功后返回的 Token 响应
class Token(SQLModel):  # Token：OAuth2/JWT 登录接口返回结构
    access_token: str  # 访问令牌（JWT 字符串）
    token_type: str = (
        "bearer"  # token 类型：通常固定为 bearer（配合 Authorization: Bearer xxx）
    )


# Contents of JWT token  # JWT 的 payload 结构（服务端解码后校验用）
class TokenPayload(SQLModel):  # TokenPayload：JWT payload 中我们关心的字段集合
    sub: str | None = None  # subject：通常放用户 ID（字符串形式的 UUID）


class NewPassword(SQLModel):  # NewPassword：找回密码/重置密码使用的请求体
    token: str  # 重置密码 token（通常是一次性的）
    new_password: str = Field(min_length=8, max_length=128)  # 新密码：长度限制


# API Key Models  # API Key 相关的数据模型（用于第三方调用或给用户创建/管理 Key）


# --- 基类：定义共同字段 ---
# 这是一个基础模型类，包含了 API Key 相关的通用字段，其他模型会继承这个类以复用这些字段定义
class ApiKeyBase(SQLModel):
    # API Key 的名称，类型为字符串或 None，默认值为 None，最大长度为 255 个字符
    name: str | None = Field(default=None, max_length=255)
    # API Key 的描述信息，类型为字符串或 None，默认值为 None，最大长度为 500 个字符
    description: str | None = Field(default=None, max_length=500)  # 👈 新增：备注
    # 标记 API Key 是否激活可用，默认为 True（可用）
    is_active: bool = True
    # API Key 的调用速率限制，类型为整数，默认值为 100（例如：每分钟 100 次）
    rate_limit: int = Field(default=100)  # 👈 新增：每分钟限流次数


# --- 创建用：用户提交时填什么 ---
# 用于创建 API Key 的数据模型，继承自 ApiKeyBase
# 用户在创建 API Key 时，只需要提供 ApiKeyBase 中定义的字段（如 name, description 等）
class ApiKeyCreate(ApiKeyBase):
    pass  # 创建时不新增字段，复用 ApiKeyBase 定义即可


# --- 更新用：用户修改时能改什么 ---
# 用于更新 API Key 的数据模型，继承自 ApiKeyBase
# 这里重新定义了字段，主要是为了允许部分更新（字段类型变为可选），用户可以选择性地修改某些属性
class ApiKeyUpdate(SQLModel):
    # 是否激活状态，可选更新
    is_active: bool | None = None
    # 名称，可选更新，最大长度 255
    name: str | None = Field(default=None, max_length=255)
    # 描述信息，可选更新
    description: str | None = None
    # 速率限制，可选更新
    rate_limit: int | None = None


# --- 数据库模型：真正的表结构 ---
# 这是映射到数据库表的模型类，table=True 表示这不仅仅是一个数据模型，还是一个数据库表定义
class ApiKey(ApiKeyBase, table=True):
    # 指定数据库中的表名为 "apikey"
    __tablename__ = "apikey"
    # 主键 ID，使用 UUID 类型，默认值为生成的 UUID v4，作为表的主键
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # 实际的 API Key 字符串，必须唯一，建立索引以加快查询速度，最大长度 64
    key: str = Field(unique=True, index=True, max_length=64)

    # 统计类字段（不需要用户填，数据库自维护）
    # 记录该 API Key 被调用的总次数，默认为 0
    total_calls: int = Field(default=0)  # 👈 新增：总调用次数
    # 记录最后一次使用的时间，默认为 None，使用带时区的 DateTime 类型
    last_used_at: datetime | None = Field(
        default=None,
        sa_type=cast(Any, DateTime(timezone=True)),
    )  # 👈 新增：最后使用时间
    # 记录创建时间，默认值为当前 UTC 时间，使用带时区的 DateTime 类型
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=cast(Any, DateTime(timezone=True)),
    )

    # 关联关系
    # 外键关联到 User 表的 id 字段，nullable=False 表示必须归属于一个用户
    # ondelete="CASCADE" 表示当关联的用户被删除时，该 API Key 也会被级联删除
    user_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    # 定义与 User 模型的关系，back_populates="api_keys" 表示 User 模型中有一个 api_keys 属性指向这里
    user: User | None = Relationship(back_populates="api_keys")


# --- 输出用：API 返回给前端展示什么 ---
# 用于 API 响应的数据模型，定义了返回给前端的数据结构
# 继承自 ApiKeyBase，包含了基础字段，并补充了 ID、Key 值、统计信息等只读字段
class ApiKeyPublic(ApiKeyBase):
    # API Key 的唯一标识 ID
    id: uuid.UUID
    # API Key 的具体值（通常只在创建时返回一次，或者在管理界面显示部分）
    key: str
    # 总调用次数，展示给客户看他跑了多少流量
    total_calls: int  # 👈 展示给客户看他跑了多少流量
    # 最后使用时间
    last_used_at: datetime | None = None
    # 创建时间
    created_at: datetime | None = None
    # 所属用户的 ID
    user_id: uuid.UUID


# 用于返回 API Key 列表的数据模型
class ApiKeysPublic(SQLModel):
    # 包含 ApiKeyPublic 对象列表的数据字段
    data: list[ApiKeyPublic]
    # 总数量，用于分页等显示
    count: int

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
import sqlalchemy
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


from enum import Enum

# -----------------------------------------------------------------------------
# Common Enums
# -----------------------------------------------------------------------------
class SourceType(str, Enum):
    auto_discovered = "auto_discovered"  # 由流量自动发现
    documented = "documented"            # 从标准文档导入
    mocked = "mocked"                    # 模拟/测试数据
    zombie = "zombie"                    # 长期无流量的僵尸接口

class EndpointLevel(str, Enum):
    p0 = "p0"
    p1 = "p1"
    p2 = "p2"
    p3 = "p3"

# -----------------------------------------------------------------------------
# API Directory & Traffic Models (DDD)
# -----------------------------------------------------------------------------

# 1. System Module (上游系统模块)
class SystemModuleBase(SQLModel):
    # 模块的名称（对应微服务名称，例如 'sts', 'authz'），建立索引以便快速查询
    name: str = Field(max_length=255, index=True, unique=True)
    # 微服务路由前缀，例如 '/sts'
    service_prefix: str | None = Field(default=None, max_length=100)
    # 模块的可选描述信息
    description: str | None = Field(default=None, max_length=1024)

class SystemModule(SystemModuleBase, table=True):
    # 系统模块的主键 UUID
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # 模块创建的时间戳，默认为当前 UTC 时间
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=cast(Any, DateTime(timezone=True)),
    )
    # 与 API 接口定义的关联关系，如果模块被删除则级联删除关联的接口
    endpoints: list["ApiEndpoint"] = Relationship(
        back_populates="module",
        cascade_delete=True,
    )

class SystemModulePublic(SystemModuleBase):
    # 在公共 API 响应中暴露的 ID
    id: uuid.UUID
    # 在公共 API 响应中暴露的创建时间戳
    created_at: datetime | None

class SystemModulesPublic(SQLModel):
    # 公共模块表示的列表
    data: list[SystemModulePublic]
    # 用于分页的总模块数量
    count: int

# 2. API Endpoint (接口定义)
class ApiEndpointBase(SQLModel):
    # HTTP 方法（例如 GET, POST），建立索引以便查询
    method: str = Field(max_length=10, index=True)
    # 泛化后的 URI 路径（例如 /api/v1/users/{id}），建立索引以便匹配
    path: str = Field(max_length=512, index=True) 
    # 接口等级：p0/p1/p2/p3，默认 p3
    level: EndpointLevel = Field(default=EndpointLevel.p3, index=True)
    # API 接口的可选名称或摘要
    name: str | None = Field(default=None, max_length=255)
    # API 接口的可选详细描述
    description: str | None = Field(default=None, max_length=1024)
    # 归属的微服务名称，通过请求路径（如 /sts/...）反推提取
    service_name: str | None = Field(default=None, max_length=100, index=True)
    # 接口的来源状态：限制为 SourceType 枚举中的值
    source_type: SourceType = Field(default=SourceType.auto_discovered, index=True)
    # 将此接口链接到特定 SystemModule 的外键
    module_id: uuid.UUID | None = Field(default=None, foreign_key="systemmodule.id")

class ApiEndpoint(ApiEndpointBase, table=True):
    # API 接口定义的主键 UUID
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # 接口定义创建的时间戳，默认为当前 UTC 时间
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=cast(Any, DateTime(timezone=True)),
    )
    # 指向父模块的反向关联关系
    module: SystemModule | None = Relationship(back_populates="endpoints")
    # 与该接口关联的所有流量记录的关系，允许级联删除
    traffic_records: list["TrafficRecord"] = Relationship(
        back_populates="endpoint",
        cascade_delete=True,
    )
    # --- v3.0 新增关系 ---
    # 与该接口关联的精选流量（去重后的永久存储）
    # 建立此关系的目的是为了在资产管理界面能够直接下钻查看该接口捕获到的所有典型报文
    filtered_flows: list["FilteredFlow"] = Relationship(
        back_populates="endpoint",
        cascade_delete=True,
    )

class ApiEndpointPublic(ApiEndpointBase):
    # 在公共 API 响应中暴露的 ID
    id: uuid.UUID
    # 在公共 API 响应中暴露的创建时间戳
    created_at: datetime | None

class ApiEndpointsPublic(SQLModel):
    # 公共接口表示的列表
    data: list[ApiEndpointPublic]
    # 用于分页的总接口数量
    count: int

# 3. Traffic Record (单次流量快照)
class TrafficRecordBase(SQLModel):
    # 将此流量记录链接到其定义的 ApiEndpoint 的外键
    endpoint_id: uuid.UUID | None = Field(default=None, foreign_key="apiendpoint.id")
    # 此特定请求中使用的 HTTP 方法
    method: str = Field(max_length=10)
    # 实际请求的真实 URI（例如 /api/v1/users/123）
    real_uri: str = Field(max_length=1024)
    # 在数据库中作为 JSON 列存储的请求头
    headers: dict[str, Any] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    # 作为文本列存储的请求体，以容纳大型 Payload
    body: str | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.Text))
    # 发起请求的客户端的真实 IP 地址
    source_ip: str | None = Field(default=None, max_length=50)

class TrafficRecord(TrafficRecordBase, table=True):
    # 流量记录的主键 UUID
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # 捕获流量记录的时间戳，默认为当前 UTC 时间
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=cast(Any, DateTime(timezone=True)),
    )
    # 指向匹配的 ApiEndpoint 的反向关联关系
    endpoint: ApiEndpoint | None = Relationship(back_populates="traffic_records")

class TrafficRecordPublic(TrafficRecordBase):
    # 在公共 API 响应中暴露的 ID
    id: uuid.UUID
    # 在公共 API 响应中暴露的创建时间戳
    created_at: datetime | None

class TrafficRecordsPublic(SQLModel):
    # 公共流量记录表示的列表
    data: list[TrafficRecordPublic]
    # 用于分页的总流量记录数量
    count: int

# 4. Global Config (全局配置，如流量采集开关)
class GlobalConfigBase(SQLModel):
    # 唯一的配置键，建立索引以便快速查找
    key: str = Field(max_length=255, unique=True, index=True)
    # 作为字符串存储的配置值
    value: str = Field(max_length=1024)
    # 说明此配置键控制什么内容的可选描述
    description: str | None = Field(default=None, max_length=512)

class GlobalConfig(GlobalConfigBase, table=True):
    # 配置记录的主键 UUID
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # 最后更新配置的时间戳，默认为当前 UTC 时间
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=cast(Any, DateTime(timezone=True)),
    )

# -----------------------------------------------------------------------------
# Legacy API Asset & Security Test Models (To be migrated/adapted later)
# -----------------------------------------------------------------------------

# Shared properties for ApiAsset
class ApiAssetBase(SQLModel):
    method: str = Field(max_length=10, index=True)
    uri_pattern: str = Field(max_length=512, index=True)
    params_schema: dict[str, Any] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    header_schema: dict[str, Any] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    last_seen_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True), # type: ignore
    )

class ApiAssetCreate(ApiAssetBase):
    pass

class ApiAssetUpdate(SQLModel):
    params_schema: dict[str, Any] | None = None
    header_schema: dict[str, Any] | None = None
    last_seen_at: datetime | None = None

class ApiAsset(ApiAssetBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True), # type: ignore
    )

class ApiAssetPublic(ApiAssetBase):
    id: uuid.UUID
    created_at: datetime | None

class ApiAssetsPublic(SQLModel):
    data: list[ApiAssetPublic]
    count: int

# Shared properties for SecurityTestTask
class SecurityTestTaskBase(SQLModel):
    target_asset_id: uuid.UUID = Field(foreign_key="apiasset.id")
    status: str = Field(default="pending", max_length=50) # pending, running, completed, failed
    payload_type: str = Field(max_length=50) # sqli, xss, etc.

class SecurityTestTaskCreate(SecurityTestTaskBase):
    pass

class SecurityTestTask(SecurityTestTaskBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True), # type: ignore
    )
    finished_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True), # type: ignore
    )

# Shared properties for SecurityTestReport
class SecurityTestReportBase(SQLModel):
    task_id: uuid.UUID = Field(foreign_key="securitytesttask.id")
    asset_id: uuid.UUID = Field(foreign_key="apiasset.id")
    vulnerability_found: bool = Field(default=False)
    details: dict[str, Any] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))

class SecurityTestReportCreate(SecurityTestReportBase):
    pass

class SecurityTestReport(SecurityTestReportBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True), # type: ignore
    )

class SecurityTestReportPublic(SecurityTestReportBase):
    id: uuid.UUID
    created_at: datetime | None

class SecurityTestReportsPublic(SQLModel):
    data: list[SecurityTestReportPublic]
    count: int


# =============================================================================
# v3.0 流量管理与重放攻击测试核心模型 (Hybrid Integration)
# =============================================================================

# 1. 原始流量表 (RawFlow)
# 作用：临时存储来自 Nginx Mirror 的所有原始请求报文
# 设计意图：作为流量摄入的“缓冲区”，仅保留 3-7 天，用于后续的异步解析与去重逻辑
class RawFlow(SQLModel, table=True):
    # 指定数据库中的真实表名，保持与 database-init.sql 一致
    __tablename__ = "raw_flows"
    # 主键 ID，使用 UUID v4 保证分布式环境下的唯一性，避免 ID 预测攻击
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # 服务标识，冗余存储以便在未关联到具体接口前进行按服务筛选
    service_id: str = Field(max_length=64, index=True)
    # 流量捕获的时间戳，必须带时区以支持全球时区对齐分析
    captured_at: datetime = Field(
        sa_type=cast(Any, DateTime(timezone=True)),
        index=True
    )
    # HTTP 方法名（GET/POST等），建立索引以加速基于动作类型的搜索
    method: str = Field(max_length=10)
    # 原始完整 URL，用于后续的路径归一化匹配引擎处理
    url: str = Field(sa_column=sqlalchemy.Column(sqlalchemy.Text))
    # 请求头，使用 JSONB 存储以便支持灵活的 Key-Value 检索
    headers: dict[str, Any] | None = Field(
        default=None,
        sa_column=sqlalchemy.Column(sqlalchemy.JSON)
    )
    # 请求体原文，使用 LargeBinary 存储以兼容二进制或多媒体 Payload 的内容
    body: bytes | None = Field(
        default=None,
        sa_column=sqlalchemy.Column(sqlalchemy.LargeBinary)
    )
    # 记录 Payload 的原始大小，用于列表展示及大报文初步过滤
    body_size: int | None = Field(default=0)
    # 客户端 IP，用于来源追溯及异常流量/CC 攻击风险分析
    client_ip: str | None = Field(default=None, max_length=50)
    # 标记位：是否已被解析模块处理，用于异步队列的状态转换追踪
    parsed: bool = Field(default=False, index=True)
    # 标记位：是否已完成去重检查，防止同一报文被重复存入精选库
    deduped: bool = Field(default=False, index=True)
    # 去重的指纹键（通常是特定字段的 MD5），用于快速判断幂等性
    dedup_key: str | None = Field(default=None, max_length=32, index=True)
    # 记录入库时间，与捕获时间分离，用于监控摄入管道的延迟状况
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=cast(Any, DateTime(timezone=True))
    )
    # TTL 过期时间，由后台任务定时清理此前的旧数据，保持存储成本可控
    expire_at: datetime | None = Field(
        default=None,
        sa_type=cast(Any, DateTime(timezone=True)),
        index=True
    )

# 2. 精选流量表 (FilteredFlow)
# 作用：永久保存的典型请求模板，去重后的业务代表，挂载在 Interface/Endpoint 下
# 设计意图：构建 API 资产的案例库，为后续的变体生成和渗透测试提供高质量的基础素材
class FilteredFlow(SQLModel, table=True):
    # 表名定义，强调其“经过筛选”的永久性特征
    __tablename__ = "filtered_flows"
    # 主键 ID
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # 核心外键：关联到现有的 ApiEndpoint，建立从物理报文到逻辑接口的链接
    endpoint_id: uuid.UUID = Field(foreign_key="apiendpoint.id", index=True, ondelete="CASCADE")
    # 关联回原始流量 ID，用于追溯分析去重的来源样板
    raw_flow_id: uuid.UUID | None = Field(default=None)
    # 典型报文的首捕获时间
    captured_at: datetime = Field(sa_type=cast(Any, DateTime(timezone=True)))
    # 标准 HTTP 方法
    method: str = Field(max_length=10)
    # 原始请求路径（包含 Query），保留原始样貌以支持参数模板提取
    original_path: str = Field(sa_column=sqlalchemy.Column(sqlalchemy.Text))
    # 经过过滤清洗（剔除 Token/时间戳等）后的标准请求头
    headers: dict[str, Any] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    # 请求体原文，用于重现业务逻辑的 Payload
    body: bytes | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.LargeBinary))
    # 体积统计
    body_size: int | None = Field(default=0)
    # 捕获来源 IP
    client_ip: str | None = Field(default=None, max_length=50)
    # 对应的去重指纹，确保持久库中对同一接口的同一形态报文绝不重复
    dedup_key: str | None = Field(default=None, max_length=32)
    # 反向关联到逻辑接口定义，实现资产管理界面的级联展示
    endpoint: "ApiEndpoint" = Relationship(back_populates="filtered_flows")
    # 记录入库时间
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=cast(Any, DateTime(timezone=True)))
    
    # 统计字段冗余，用于在列表页展示变体丰富度，避免 JOIN 高开销
    variant_count: int = Field(default=0)
    # 统计被引用重放执行的历史次数
    replay_count: int = Field(default=0)
    
    # 关联变体模型，支持基于精选流量衍生出的多种攻击载荷
    variants: list["Variant"] = Relationship(back_populates="root_flow", cascade_delete=True)
    # 关联标签模型，支持用户进行个性化的案例标记（如“高危”、“核心流程”）
    tags: list["FlowTag"] = Relationship(back_populates="flow", cascade_delete=True)

# 3. 流量标签表 (FlowTag)
# 作用：精选流量的元数据标记，支持跨维度的分类检索
class FlowTag(SQLModel, table=True):
    # 表名定义
    __tablename__ = "flow_tags"
    # 简单自增主键
    id: int | None = Field(default=None, primary_key=True)
    # 关联到的精选流量 ID
    flow_id: uuid.UUID = Field(foreign_key="filtered_flows.id", ondelete="CASCADE")
    # 标签内容（例如：已验证、SQLI 触发点、敏感数据泄露）
    tag: str = Field(max_length=64, index=True)
    # 创建时间
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=cast(Any, DateTime(timezone=True)))
    
    # 反向关联到流量对象
    flow: FilteredFlow = Relationship(back_populates="tags")

# 4. 变体表 (Variant)
# 作用：基于原始流量修改生成的“攻击载荷”或“测试样本”
# 设计意图：支持多级 Fork，记录从一个普通报文演变为恶意载荷的全过程（Fork Chain）
class Variant(SQLModel, table=True):
    # 表名定义
    __tablename__ = "variants"
    # 变体唯一标识
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # 标识是从原始流量变来的，还是从另一个变体 Fork 出来的
    source_type: str = Field(max_length=20) # 'flow' 或 'variant'
    # 指向父级对象的 ID，构建变体演进树
    source_id: uuid.UUID = Field(index=True)
    # 冗余记录最顶层的根流量 ID，方便直接根据流量查看所有衍生出的变体
    root_flow_id: uuid.UUID = Field(foreign_key="filtered_flows.id", ondelete="CASCADE")
    # 存存储完整的演变链条路径（JSON 数组），如 [flow_id, variant_1_id, variant_2_id]
    fork_chain: list[uuid.UUID] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    # 变体的人类可读名称（或攻击类型名称）
    name: str = Field(max_length=256)
    # 对该变体设计意图的详细描述
    description: str | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.Text))
    # 记录修改规则的流水，定义如何从源变到现，用于审计和自动化批量生成
    transformations: list[dict[str, Any]] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    
    # 变体执行时的最终请求字段集合
    method: str = Field(max_length=10)
    url: str = Field(sa_column=sqlalchemy.Column(sqlalchemy.Text))
    headers: dict[str, Any] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    body: bytes | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.LargeBinary))
    
    # 该变体被实际执行测试的频率统计
    replay_count: int = Field(default=0)
    # 创建时间戳
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=cast(Any, DateTime(timezone=True)))
    
    # 与根流量的逻辑关联
    root_flow: FilteredFlow = Relationship(back_populates="variants")

# 5. 重放任务表 (ReplayTask)
# 作用：管理批量重放攻击执行周期
# 设计意图：支持并发控制、频率限制以及完整的任务状态跟踪，实现大规模自动化测试
class ReplayTask(SQLModel, table=True):
    # 表名定义
    __tablename__ = "replay_tasks"
    # 任务唯一 ID
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # 任务名称（如：核心系统压力测试、接口模糊测试-2026）
    name: str | None = Field(default=None, max_length=256)
    # 任务执行模式（单条/批量/按比例抽样等），决定执行引擎的行为逻辑
    task_type: str = Field(max_length=20) # single/batch/proportional etc
    # 重放请求发往的目标服务器基础地址
    target_url: str = Field(sa_column=sqlalchemy.Column(sqlalchemy.Text))
    # 最大并发请求数，用于防止测试任务压垮下游微服务
    concurrency: int = Field(default=10)
    # 请求之间强制开启的间隔时间（毫秒），用于模拟人类行为或规避流控
    interval_ms: int = Field(default=0)
    # 单次 HTTP 请求的超时截断时间
    timeout_ms: int = Field(default=30000)
    # 存储任务的数据源配置（如哪些流量被选中、经过何种全局转换规则）
    source_config: dict[str, Any] = Field(sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    # 任务状态（等待、运行中、已完成、失败、人工取消）
    status: str = Field(default="pending", max_length=20)
    
    # 进度统计：总计执行数、成功数、失败数
    total_count: int = Field(default=0)
    completed_count: int = Field(default=0)
    failed_count: int = Field(default=0)
    
    # 生命周期时间点追踪
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=cast(Any, DateTime(timezone=True)))
    started_at: datetime | None = Field(default=None, sa_type=cast(Any, DateTime(timezone=True)))
    completed_at: datetime | None = Field(default=None, sa_type=cast(Any, DateTime(timezone=True)))
    # 若任务执行层面发生异常，在此记录详细堆栈
    error_message: str | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.Text))
    
    # 关联该任务产生的所有执行细节结果
    results: list["ReplayResult"] = Relationship(back_populates="task", cascade_delete=True)

# 6. 重放执行结果表 (ReplayResult)
# 作用：记录每一次具体的 HTTP 请求执行详情，用于后续的安全性判定和响应对比
class ReplayResult(SQLModel, table=True):
    # 表名定义
    __tablename__ = "replay_results"
    # 执行结果唯一 ID
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # 所属任务 ID，用于聚合分析整次任务的成功率
    task_id: uuid.UUID = Field(foreign_key="replay_tasks.id", ondelete="CASCADE")
    # 标记是针对哪类对象进行的重放
    source_type: str = Field(max_length=20) # flow 或 variant
    # 对象 ID
    source_id: uuid.UUID = Field(index=True)
    # 执行时的响应状态（成功/失败/超时/连接错误）
    status: str = Field(max_length=20)
    
    # --- 记录执行时的物理报文快照，作为原始证据 ---
    request_method: str | None = Field(default=None, max_length=10)
    request_url: str | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.Text))
    request_headers: dict[str, Any] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    request_body: bytes | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.LargeBinary))
    
    # --- 记录目标服务的真实返回，用于漏洞挖掘 ---
    response_status: int | None = Field(default=None)
    response_headers: dict[str, Any] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    # 响应体报文，限制存储大小，仅用于查看特征点，不在 DB 中存储海量数据
    response_body: bytes | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.LargeBinary))
    # 报文体积
    response_size: int | None = Field(default=0)
    # 响应延迟，毫秒级，用于性能基准对比
    latency_ms: int | None = Field(default=0)
    # 具体执行爆发的时间
    executed_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=cast(Any, DateTime(timezone=True)))
    # 详细错误描述
    error_message: str | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.Text))
    
    # 建立与任务对象的逻辑链接
    task: ReplayTask = Relationship(back_populates="results")

# 7. 归一化规则配置表 (NormalizationRule)
# 作用：定义 URL 路径归一化的计算规则（如把 /users/1 转换为 /users/{id}）
# 设计意图：使不同变体路径能自动聚合到逻辑接口上，实现资产的自动发现与分类
class NormalizationRule(SQLModel, table=True):
    # 表名定义
    __tablename__ = "normalization_rules"
    # 自增 ID
    id: int | None = Field(default=None, primary_key=True)
    # 规则名称，如“标准 UUID 匹配”
    name: str = Field(max_length=128)
    # 类型标识（内置固化规则或用户自定义规则）
    rule_type: str = Field(default="custom", max_length=20) # builtin/custom
    # 用于识别路径变量的正则表达式模板
    pattern: str = Field(max_length=512)
    # 替换后的占位符，如 {uuid}
    replacement: str = Field(max_length=128)
    # 匹配优先级，数字越小越先被执行，用于多重规则竞态处理
    priority: int = Field(default=100, index=True)
    # 是否启用的全局开关
    enabled: bool = Field(default=True, index=True)
    # 系统内置规则不允许被物理删除，仅允许禁用，确保解析引擎基准稳定
    deletable: bool = Field(default=True)
    
    # 记录元数据，用于审计
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=cast(Any, DateTime(timezone=True)))
    updated_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=cast(Any, DateTime(timezone=True)))

# 8. 全局系统配置表 (SystemConfig - v3.0 版)
# 作用：持久化系统的各种运行阈值（如清理周期、重放默认值等）
class SystemConfig(SQLModel, table=True):
    # 表名定义
    __tablename__ = "system_configs"
    # 自增 ID
    id: int | None = Field(default=None, primary_key=True)
    # 全局唯一 Key，如 'raw_flow_ttl_days'
    config_key: str = Field(max_length=128, unique=True, index=True)
    # 配置值，统一以字符串存储，应用层按 need 转换
    config_value: str | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.Text))
    # 原始数据类型（string/int/bool/json），辅助应用层转换
    value_type: str = Field(default="string", max_length=20)
    # 描述该配置对系统的影响
    description: str | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.Text))
    # 更新记录
    updated_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=cast(Any, DateTime(timezone=True)))
    # 记录由谁（或哪个服务）进行的更新
    updated_by: str | None = Field(default=None, max_length=128)

# 9. 高级操作日志表 (OperationLog)
# 作用：记录关键增删改查动作，满足合规与安全审计要求
class OperationLog(SQLModel, table=True):
    # 表名定义
    __tablename__ = "operation_logs"
    # 唯一日志 ID
    id: int | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.BigInteger, primary_key=True))
    # 动作类型 (如 delete_flow, start_task 等)
    operation_type: str = Field(max_length=64, index=True)
    # 操作目标的类型 (flow, interface, task 等)
    target_type: str | None = Field(default=None, max_length=64)
    # 操作目标的 UUID 或 ID
    target_id: str | None = Field(default=None, max_length=64)
    # 请求报文详情快照（JSON 形式，剔除敏感值）
    request_data: dict[str, Any] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    # 操作后的返回快照
    response_data: dict[str, Any] | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.JSON))
    # 操作是否最终成功的标记
    success: bool = Field(default=True)
    # 若失败，记录详细的阻断或错误原因
    error_message: str | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.Text))
    # 执行者的用户名或 ID
    operator: str | None = Field(default=None, max_length=128)
    # 访问者 IP
    client_ip: str | None = Field(default=None, max_length=50)
    # 请求头中的 UA 信息，用于设备定位
    user_agent: str | None = Field(default=None, sa_column=sqlalchemy.Column(sqlalchemy.Text))
    # 日志落盘时间
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=cast(Any, DateTime(timezone=True)))

import secrets
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ApiKey,
    ApiKeyCreate,
    ApiKeyPublic,
    ApiKeysPublic,
    Message,
)

# 创建 API 路由，设置前缀为 "/api-keys"
# tags=["api-keys"] 用于在 Swagger UI 文档中将这些接口归类到 "api-keys" 组
router = APIRouter(prefix="/api-keys", tags=["api-keys"])


# --- 获取 API Key 列表 ---
@router.get("/", response_model=ApiKeysPublic)
def read_api_keys(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve own API keys.
    获取当前用户拥有的所有 API Key。
    """
    # 1. 查询总数
    # 使用 select(func.count()) 构建查询语句，统计 ApiKey 表中的记录数
    # .where(ApiKey.user_id == current_user.id) 限制只统计当前用户的 Key
    count_statement = (
        select(func.count())
        .select_from(ApiKey)
        .where(ApiKey.user_id == current_user.id)
    )
    # 执行查询并获取唯一的计数值
    count = session.exec(count_statement).one()

    # 2. 查询具体数据（分页）
    # 构建查询语句：
    # - select(ApiKey): 选择 ApiKey 模型的所有字段
    # - .where(...): 筛选属于当前用户的记录
    # - .offset(skip): 跳过前 skip 条记录（用于分页）
    # - .limit(limit): 限制返回 limit 条记录（用于分页）
    statement = (
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    # 执行查询，返回所有符合条件的 ApiKey 对象列表
    api_keys = session.exec(statement).all()

    # 3. 返回结果
    # 将查询到的数据列表和总数封装到 ApiKeysPublic 模型中返回
    # ApiKeysPublic 是为了统一列表接口的返回格式（包含 data 和 count）
    return ApiKeysPublic(data=api_keys, count=count)


# --- 创建新的 API Key ---
@router.post("/", response_model=ApiKeyPublic)
def create_api_key(
    *, session: SessionDep, current_user: CurrentUser, api_key_in: ApiKeyCreate
) -> Any:
    """
    Create new API key.
    为当前用户创建一个新的 API Key。
    """
    # 1. 生成随机 Key 字符串
    # secrets.token_urlsafe(32) 生成一个包含 32 字节随机熵的安全 URL 字符串
    # 加上 "sk-" 前缀是行业惯例（Secret Key），方便识别和扫描工具检测
    key_content = f"sk-{secrets.token_urlsafe(32)}"

    # 2. 创建数据库模型实例
    # ApiKey.model_validate 使用 api_key_in 中的数据（如 name, description）来初始化 ApiKey 对象
    # update 参数用于补充或覆盖字段：
    # - user_id: 强制关联到当前操作的用户
    # - key: 设置刚才生成的随机 Key 字符串
    api_key = ApiKey.model_validate(
        api_key_in, update={"user_id": current_user.id, "key": key_content}
    )

    # 3. 保存到数据库
    # 将新对象添加到会话中
    session.add(api_key)
    # 提交事务，保存更改
    session.commit()
    # 刷新对象，从数据库重新加载数据（获取自动生成的 ID、创建时间等字段）
    session.refresh(api_key)

    # 4. 返回新创建的对象
    return api_key


# --- 删除 API Key ---
@router.delete("/{id}", response_model=Message)
def delete_api_key(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Delete an API key.
    根据 ID 删除指定的 API Key。
    """
    # 1. 查找目标 Key
    # 根据 ID 从数据库中获取 ApiKey 对象
    api_key = session.get(ApiKey, id)

    # 2. 检查是否存在
    if not api_key:
        # 如果找不到，返回 404 错误
        raise HTTPException(status_code=404, detail="API key not found")

    # 3. 权限检查
    # 确保要删除的 Key 属于当前用户
    # 防止用户通过 ID 删除别人的 Key
    if api_key.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # 4. 执行删除
    # 从会话中标记该对象为删除状态
    session.delete(api_key)
    # 提交事务，物理删除数据
    session.commit()

    # 5. 返回成功消息
    # 使用通用的 Message 模型返回操作结果
    return Message(message="API key deleted successfully")

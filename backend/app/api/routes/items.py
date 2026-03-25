import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Item, ItemCreate, ItemPublic, ItemsPublic, ItemUpdate, Message

# 创建 items 路由组
router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=ItemsPublic)
def read_items(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    获取物品列表。
    超级管理员可以获取所有物品，普通用户只能获取自己创建的物品。
    """

    if current_user.is_superuser:
        # 如果是超级管理员，查询所有物品的总数
        count_statement = select(func.count()).select_from(Item)
        count = session.exec(count_statement).one()
        # 查询所有物品列表并按创建时间倒序分页返回
        statement = (
            select(Item).order_by(col(Item.created_at).desc()).offset(skip).limit(limit)
        )
        items = session.exec(statement).all()
    else:
        # 如果是普通用户，只查询归属为当前用户的物品总数
        count_statement = (
            select(func.count())
            .select_from(Item)
            .where(Item.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        # 查询当前用户的物品列表并按创建时间倒序分页返回
        statement = (
            select(Item)
            .where(Item.owner_id == current_user.id)
            .order_by(col(Item.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
        items = session.exec(statement).all()

    return ItemsPublic(data=items, count=count)


@router.get("/{id}", response_model=ItemPublic)
def read_item(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    通过 ID 获取单个物品。
    """
    # 按主键获取物品
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail="未找到该物品")
    # 权限校验：如果不是超级管理员，必须是该物品的所有者
    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="权限不足")
    return item


@router.post("/", response_model=ItemPublic)
def create_item(
    *, session: SessionDep, current_user: CurrentUser, item_in: ItemCreate
) -> Any:
    """
    创建新物品。
    """
    # 验证传入数据并强制将所有者设为当前用户
    item = Item.model_validate(item_in, update={"owner_id": current_user.id})
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.put("/{id}", response_model=ItemPublic)
def update_item(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    item_in: ItemUpdate,
) -> Any:
    """
    更新已有物品。
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail="未找到该物品")
    # 权限校验
    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="权限不足")
    # 更新字段
    update_dict = item_in.model_dump(exclude_unset=True)
    item.sqlmodel_update(update_dict)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{id}")
def delete_item(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    删除物品。
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail="未找到该物品")
    # 权限校验
    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="权限不足")
    session.delete(item)
    session.commit()
    return Message(message="物品删除成功")


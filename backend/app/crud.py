import uuid
from typing import Any

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import Item, ItemCreate, User, UserCreate, UserUpdate


def create_user(*, session: Session, user_create: UserCreate) -> User:
    # 验证传入的用户数据，并将明文密码转换为哈希值存入更新字典中
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    # 将新用户对象添加到会话中
    session.add(db_obj)
    # 提交事务以保存到数据库
    session.commit()
    # 刷新对象以获取数据库生成的 ID 等默认字段
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    # 导出请求中的用户数据，排除未设置的字段
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    # 如果更新数据中包含密码，则计算其哈希值并准备更新
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    # 使用新数据和额外的哈希密码更新数据库用户对象
    db_user.sqlmodel_update(user_data, update=extra_data)
    # 标记对象为已修改
    session.add(db_user)
    # 提交修改
    session.commit()
    # 刷新对象获取最新状态
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    # 构建查询语句：根据邮箱查找用户
    statement = select(User).where(User.email == email)
    # 执行查询并返回第一条记录，如果没有则返回 None
    session_user = session.exec(statement).first()
    return session_user


# 当用户未找到时使用的虚拟哈希值，用于防止时间旁路攻击
# 这是一个随机密码的 Argon2 哈希值，用于确保无论邮箱是否存在，比对时间都差不多
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    # 根据邮箱获取用户
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        # 防止时间旁路攻击：即使用户不存在，也执行一次密码哈希验证
        # 这样可以确保无论邮箱是否存在，响应时间都是相似的
        verify_password(password, DUMMY_HASH)
        return None
    # 验证密码是否匹配，并获取可能更新后的哈希值（如果哈希算法参数升级）
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        # 密码错误，返回 None
        return None
    # 如果安全策略升级导致哈希值更新，则保存新的哈希值
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    # 验证物品数据，并强制将 owner_id 设为当前用户的 ID
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    # 添加到会话
    session.add(db_item)
    # 提交事务保存数据
    session.commit()
    # 刷新获取数据库生成的 ID
    session.refresh(db_item)
    return db_item

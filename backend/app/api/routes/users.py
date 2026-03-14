import uuid  # 用于声明/解析用户 ID（UUID）类型参数，例如 /users/{user_id}
from typing import (
    Any,  # FastAPI 路由函数常用返回类型占位（实际返回由 response_model 规范化）
)

from fastapi import (  # 路由声明、依赖注入与 HTTP 错误响应
    APIRouter,
    Depends,
    HTTPException,
)
from sqlmodel import (  # SQLModel/SQLAlchemy：构造查询、删除、排序与聚合
    col,
    delete,
    func,
    select,
)

from app import (
    crud,  # 项目的 CRUD 层：封装常用的数据库读写逻辑（create/update/auth 等）
)
from app.api.deps import (  # 路由依赖：提供 DB Session、当前用户、权限校验等
    CurrentUser,  # 依赖：从请求 JWT 中解析出当前登录用户，并校验用户处于激活态
    SessionDep,  # 依赖：注入数据库会话 Session（请求级生命周期）
    get_current_active_superuser,  # 依赖：校验当前用户必须为超管（is_superuser=True）
)
from app.core.config import settings  # 全局配置：例如 API 前缀、邮件开关等
from app.core.security import (  # 安全相关：密码哈希与密码校验
    get_password_hash,  # 将明文新密码哈希化后存储
    verify_password,  # 校验“输入的旧密码”与“数据库里存的哈希密码”是否匹配
)
from app.models import (  # Pydantic/SQLModel 数据模型：请求体/响应体/数据库表模型
    Item,  # 数据库表：Item（用于删除用户时清理其关联数据）
    Message,  # 通用响应模型：仅返回 message 字段
    UpdatePassword,  # 请求体：更新密码（需要 current_password 与 new_password）
    User,  # 数据库表：User
    UserCreate,  # 请求体：创建用户（后台/超管创建，包含 password/is_active/is_superuser/full_name）
    UserPublic,  # 响应体：对外暴露的用户字段（不包含 hashed_password）
    UserRegister,  # 请求体：注册用户（对外开放的 signup，字段更少）
    UsersPublic,  # 响应体：用户列表（data + count）
    UserUpdate,  # 请求体：更新任意用户（超管）
    UserUpdateMe,  # 请求体：更新当前用户自己的资料（不含权限字段）
)
from app.utils import (  # 工具函数：邮件模板与发送
    generate_new_account_email,  # 生成“新账号创建成功”的邮件内容（主题+HTML）
    send_email,  # 发送邮件
)

# 声明 users 模块的路由器：
# - prefix="/users" 表示本文件所有 endpoint 都以 /users 开头
# - tags=["users"] 用于 Swagger 文档分组展示
router = APIRouter(prefix="/users", tags=["users"])  # 用户管理相关的所有接口入口


@router.get(  # 声明一个 GET 路由（读取用户列表）
    "/",  # 路径：GET /users/
    dependencies=[Depends(get_current_active_superuser)],  # 依赖：必须是超管才可调用
    response_model=UsersPublic,  # 响应模型：规范返回 data（用户列表）+ count（总数）
)  # 装饰器闭合
def read_users(  # 路由函数：读取用户列表（超管功能）
    session: SessionDep,  # 依赖注入：数据库会话
    skip: int = 0,  # 查询参数：跳过前 N 条（分页偏移）
    limit: int = 100,  # 查询参数：最多返回多少条（分页大小）
) -> Any:  # 返回值由 response_model=UsersPublic 约束，这里用 Any 作为实现层签名
    """# 函数文档字符串开始
    Retrieve users.  # 英文：获取用户列表（超管）
    """  # 函数文档字符串结束

    # 1) 先统计总数：用于前端分页显示（例如“共 X 条”）
    count_statement = select(func.count()).select_from(
        User
    )  # SELECT COUNT(*) FROM user
    count = session.exec(count_statement).one()  # 执行查询并取出唯一的计数值

    # 2) 再查询实际数据：按创建时间倒序 + offset/limit 分页
    statement = (  # 构造 SELECT 查询（多行写法便于阅读）
        select(User)  # SELECT * FROM user
        .order_by(
            col(User.created_at).desc()
        )  # ORDER BY created_at DESC（最新创建的排前面）
        .offset(skip)  # OFFSET：跳过前 skip 条
        .limit(limit)  # LIMIT：最多取 limit 条
    )  # 查询语句构造结束
    users = session.exec(statement).all()  # 执行查询并拉取所有结果到列表

    # 3) 返回统一格式：data 为用户列表，count 为总数
    return UsersPublic(data=users, count=count)  # FastAPI 会按 UsersPublic 序列化输出


@router.post(  # 声明一个 POST 路由（创建用户：后台/超管）
    "/",  # 路径：POST /users/
    dependencies=[
        Depends(get_current_active_superuser)
    ],  # 依赖：必须是超管才可创建（防止随意创建）
    response_model=UserPublic,  # 响应模型：返回创建后的用户公开信息
)  # 装饰器闭合
def create_user(  # 路由函数：创建新用户（超管入口，区别于注册）
    *,  # 强制后续参数使用关键字传参，避免调用时位置参数误传
    session: SessionDep,  # 依赖注入：数据库会话
    user_in: UserCreate,  # 请求体：创建用户需要的字段（见 app/models.py 的 UserCreate）
) -> Any:  # 返回由 response_model=UserPublic 规范
    """# 函数文档字符串开始
    Create new user.  # 英文：创建新用户（超管）
    """  # 函数文档字符串结束
    # 1) 邮箱查重：避免触发数据库 unique 约束错误，同时给出更友好的错误提示
    user = crud.get_user_by_email(
        session=session, email=user_in.email
    )  # 按 email 查找用户
    if user:  # 如果查到用户，说明邮箱已存在
        raise HTTPException(  # 抛出 400：客户端请求不合法（重复邮箱）
            status_code=400,  # HTTP 状态码：400 Bad Request
            detail="The user with this email already exists in the system.",  # 错误详情
        )  # HTTPException 构造结束

    # 2) 真正创建：复用 crud.create_user（内部会做密码哈希等标准化处理）
    user = crud.create_user(
        session=session, user_create=user_in
    )  # 写入数据库并返回 User 实体

    # 3) 可选：如果系统启用了邮件，并且 email 存在，则发送“新账号创建”邮件
    if settings.emails_enabled and user_in.email:  # 邮件总开关 + 目标邮箱非空
        email_data = generate_new_account_email(  # 生成邮件内容（主题、HTML 等）
            email_to=user_in.email,  # 收件人
            username=user_in.email,  # 邮件里展示的用户名（这里用邮箱）
            password=user_in.password,  # 邮件里可能包含初始密码（注意：仅用于内部创建场景）
        )  # 邮件内容构造结束
        send_email(  # 发送邮件（真正的 SMTP 投递）
            email_to=user_in.email,  # 收件人
            subject=email_data.subject,  # 邮件主题
            html_content=email_data.html_content,  # 邮件 HTML 正文
        )  # 发送结束
    return user  # 返回创建后的用户（FastAPI 会按 UserPublic 序列化）


@router.patch(  # 声明一个 PATCH 路由（更新“我自己”的资料）
    "/me",  # 路径：PATCH /users/me
    response_model=UserPublic,  # 响应模型：返回更新后的用户公开信息
)  # 装饰器闭合
def update_user_me(  # 路由函数：更新当前登录用户自己的 profile
    *,  # 强制关键字传参
    session: SessionDep,  # 依赖注入：数据库会话
    user_in: UserUpdateMe,  # 请求体：允许修改的字段（full_name/email）
    current_user: CurrentUser,  # 依赖注入：当前登录用户（已完成 JWT 校验 + active 校验）
) -> Any:  # 返回由 UserPublic 规范
    """# 文档字符串开始
    Update own user.  # 英文：更新自己的用户信息
    """  # 文档字符串结束

    # 1) 如果用户想修改 email，需要做“邮箱唯一性”检查
    if user_in.email:  # 只有传了 email 才检查（不传则保持不变）
        existing_user = crud.get_user_by_email(  # 按新邮箱查找是否已有用户占用
            session=session,  # 传入 DB session
            email=user_in.email,  # 要检查的新邮箱
        )  # 查找结束
        if (  # 如果存在占用该邮箱的用户，并且不是“我自己”，就不允许修改
            existing_user  # 查到有人占用
            and existing_user.id != current_user.id  # 但占用者不是当前用户本人
        ):  # 条件结束
            raise HTTPException(  # 抛出 409：冲突（资源唯一性冲突更语义化）
                status_code=409,  # HTTP 409 Conflict
                detail="User with this email already exists",  # 错误详情
            )  # HTTPException 结束

    # 2) 将请求体中“实际传入的字段”提取出来（exclude_unset=True：未传入的不改）
    user_data = user_in.model_dump(exclude_unset=True)  # 只拿到用户想改的字段
    current_user.sqlmodel_update(user_data)  # 将字段更新到 ORM 对象（仅修改内存态）
    session.add(current_user)  # 将对象加入 session（标记为待提交）
    session.commit()  # 提交事务，持久化到数据库
    session.refresh(current_user)  # 从数据库刷新一次，拿到最终落库后的状态
    return current_user  # 返回更新后的用户


@router.patch(  # 声明一个 PATCH 路由（更新“我自己”的密码）
    "/me/password",  # 路径：PATCH /users/me/password
    response_model=Message,  # 响应模型：仅返回提示信息
)  # 装饰器闭合
def update_password_me(  # 路由函数：更新当前登录用户的密码
    *,  # 强制关键字传参
    session: SessionDep,  # 依赖注入：数据库会话
    body: UpdatePassword,  # 请求体：包含 current_password 与 new_password
    current_user: CurrentUser,  # 依赖注入：当前登录用户
) -> Any:  # 返回由 Message 规范
    """# 文档字符串开始
    Update own password.  # 英文：更新自己的密码
    """  # 文档字符串结束
    # 1) 校验旧密码是否正确：防止被盗号后直接改密码锁号
    verified, _ = (
        verify_password(  # verify_password 通常返回 (是否匹配, 是否需要升级哈希参数等)
            body.current_password,  # 用户输入的旧密码（明文）
            current_user.hashed_password,  # 数据库中存的密码哈希
        )
    )  # 校验结束
    if not verified:  # 旧密码不匹配
        raise HTTPException(status_code=400, detail="Incorrect password")  # 直接拒绝

    # 2) 防御性校验：新旧密码不能相同（避免“改了等于没改”）
    if body.current_password == body.new_password:  # 新旧密码一致
        raise HTTPException(  # 抛出 400：请求不合法
            status_code=400,  # 400 Bad Request
            detail="New password cannot be the same as the current one",  # 错误详情
        )  # HTTPException 结束

    # 3) 生成新密码哈希并写回数据库
    hashed_password = get_password_hash(body.new_password)  # 将新密码哈希化
    current_user.hashed_password = (
        hashed_password  # 覆盖用户对象的 hashed_password 字段
    )
    session.add(current_user)  # 标记更新
    session.commit()  # 提交事务
    return Message(message="Password updated successfully")  # 返回成功提示


@router.get(  # 声明一个 GET 路由（读取“我自己”的信息）
    "/me",  # 路径：GET /users/me
    response_model=UserPublic,  # 响应模型：返回当前用户公开信息
)  # 装饰器闭合
def read_user_me(  # 路由函数：获取当前用户信息
    current_user: CurrentUser,  # 依赖注入：当前登录用户
) -> Any:  # 返回由 UserPublic 规范
    """# 文档字符串开始
    Get current user.  # 英文：获取当前用户
    """  # 文档字符串结束
    return current_user  # 直接返回依赖解析出的用户对象


@router.delete(  # 声明一个 DELETE 路由（删除“我自己”的账号）
    "/me",  # 路径：DELETE /users/me
    response_model=Message,  # 响应模型：返回提示信息
)  # 装饰器闭合
def delete_user_me(  # 路由函数：删除当前登录用户自己
    session: SessionDep,  # 依赖注入：数据库会话
    current_user: CurrentUser,  # 依赖注入：当前登录用户
) -> Any:  # 返回由 Message 规范
    """# 文档字符串开始
    Delete own user.  # 英文：删除自己的用户
    """  # 文档字符串结束
    # 1) 业务规则：超管不允许自删（避免把系统最后一个超管删掉导致无人管理）
    if current_user.is_superuser:  # 如果当前用户是超管
        raise HTTPException(  # 抛出 403：禁止操作
            status_code=403,  # 403 Forbidden
            detail="Super users are not allowed to delete themselves",  # 错误详情
        )  # HTTPException 结束
    # 2) 删除用户并提交
    session.delete(current_user)  # 删除当前用户记录（级联行为由模型关系决定）
    session.commit()  # 提交事务
    return Message(message="User deleted successfully")  # 返回删除成功


@router.post(  # 声明一个 POST 路由（用户注册入口）
    "/signup",  # 路径：POST /users/signup
    response_model=UserPublic,  # 响应模型：注册成功后返回用户公开信息
)  # 装饰器闭合
def register_user(  # 路由函数：注册新用户（无需登录）
    session: SessionDep,  # 依赖注入：数据库会话
    user_in: UserRegister,  # 请求体：注册用户需要的字段（见 app/models.py 的 UserRegister）
) -> Any:  # 返回由 UserPublic 规范
    """# 文档字符串开始
    Create new user without the need to be logged in.  # 英文：无需登录即可创建用户（注册）
    """  # 文档字符串结束
    # 1) 邮箱查重：注册同样需要 email 唯一
    user = crud.get_user_by_email(session=session, email=user_in.email)  # 按 email 查找
    if user:  # 如果存在，说明注册邮箱已被使用
        raise HTTPException(  # 抛出 400：请求不合法（重复邮箱）
            status_code=400,  # 400 Bad Request
            detail="The user with this email already exists in the system",  # 错误详情
        )  # HTTPException 结束

    # 2) 将注册模型转成创建模型：
    #    UserRegister 字段更少（主要面向公网注册），UserCreate 字段更全（后台创建）。
    user_create = UserCreate.model_validate(user_in)  # 复用 pydantic 的校验与字段映射

    # 3) 真正创建用户（密码哈希等由 crud.create_user 处理）
    user = crud.create_user(session=session, user_create=user_create)  # 写库并返回用户
    return user  # 返回注册后的用户


@router.get(  # 声明一个 GET 路由（通过 user_id 获取用户信息）
    "/{user_id}",  # 路径：GET /users/{user_id}
    response_model=UserPublic,  # 响应模型：用户公开信息
)  # 装饰器闭合
def read_user_by_id(  # 路由函数：按 ID 读取用户
    user_id: uuid.UUID,  # 路径参数：用户 ID（UUID）
    session: SessionDep,  # 依赖注入：数据库会话
    current_user: CurrentUser,  # 依赖注入：当前登录用户（用于鉴权）
) -> Any:  # 返回由 UserPublic 规范
    """# 文档字符串开始
    Get a specific user by id.  # 英文：按 ID 获取某个用户
    """  # 文档字符串结束
    # 1) 按主键查询用户
    user = session.get(User, user_id)  # session.get 会按主键查找，找不到返回 None

    # 2) 如果查的是自己，直接允许返回（普通用户可查看自己的信息）
    if user == current_user:  # 同一个对象/同一个 id
        return user  # 允许

    # 3) 如果查的不是自己，则要求必须是超管（普通用户不允许查看别人的资料）
    if not current_user.is_superuser:  # 非超管
        raise HTTPException(  # 抛出 403：权限不足
            status_code=403,  # 403 Forbidden
            detail="The user doesn't have enough privileges",  # 错误详情
        )  # HTTPException 结束

    # 4) 超管场景下，若用户不存在则返回 404
    if user is None:  # 没找到
        raise HTTPException(status_code=404, detail="User not found")  # 404 Not Found
    return user  # 返回目标用户


@router.patch(  # 声明一个 PATCH 路由（更新任意用户：超管入口）
    "/{user_id}",  # 路径：PATCH /users/{user_id}
    dependencies=[
        Depends(get_current_active_superuser)
    ],  # 依赖：必须是超管才可更新别人
    response_model=UserPublic,  # 响应模型：返回更新后的用户公开信息
)  # 装饰器闭合
def update_user(  # 路由函数：超管更新某个用户
    *,  # 强制关键字传参
    session: SessionDep,  # 依赖注入：数据库会话
    user_id: uuid.UUID,  # 路径参数：目标用户 ID
    user_in: UserUpdate,  # 请求体：更新字段（全部可选，未传的不更新）
) -> Any:  # 返回由 UserPublic 规范
    """# 文档字符串开始
    Update a user.  # 英文：更新用户（超管）
    """  # 文档字符串结束

    # 1) 先确认目标用户存在
    db_user = session.get(User, user_id)  # 按主键获取用户
    if not db_user:  # 如果不存在
        raise HTTPException(  # 抛出 404：目标不存在
            status_code=404,  # 404 Not Found
            detail="The user with this id does not exist in the system",  # 错误详情
        )  # HTTPException 结束

    # 2) 如果更新包含 email，需要做唯一性校验（避免把邮箱改成别人的）
    if user_in.email:  # 只有传了 email 才需要查重
        existing_user = crud.get_user_by_email(
            session=session, email=user_in.email
        )  # 查新邮箱
        if (
            existing_user and existing_user.id != user_id
        ):  # 存在占用者且不是目标用户本人
            raise HTTPException(  # 抛出 409：冲突
                status_code=409,  # 409 Conflict
                detail="User with this email already exists",  # 错误详情
            )  # HTTPException 结束

    # 3) 执行更新：复用 crud.update_user（集中处理字段更新策略）
    db_user = crud.update_user(
        session=session, db_user=db_user, user_in=user_in
    )  # 更新并返回
    return db_user  # 返回更新后的用户


@router.delete(  # 声明一个 DELETE 路由（删除任意用户：超管入口）
    "/{user_id}",  # 路径：DELETE /users/{user_id}
    dependencies=[Depends(get_current_active_superuser)],  # 依赖：必须是超管
)  # 装饰器闭合
def delete_user(  # 路由函数：超管删除某个用户
    session: SessionDep,  # 依赖注入：数据库会话
    current_user: CurrentUser,  # 依赖注入：当前登录用户（用于禁止自删）
    user_id: uuid.UUID,  # 路径参数：目标用户 ID
) -> Message:  # 返回 Message（这里直接写明具体模型，而不是 Any）
    """# 文档字符串开始
    Delete a user.  # 英文：删除用户（超管）
    """  # 文档字符串结束
    # 1) 查目标用户是否存在
    user = session.get(User, user_id)  # 按主键查用户
    if not user:  # 不存在
        raise HTTPException(status_code=404, detail="User not found")  # 404 Not Found

    # 2) 业务规则：超管也不允许删除自己（避免误删导致无法管理系统）
    if user == current_user:  # 目标用户就是当前用户
        raise HTTPException(  # 抛出 403：禁止
            status_code=403,  # 403 Forbidden
            detail="Super users are not allowed to delete themselves",  # 错误详情
        )  # HTTPException 结束

    # 3) 先删除该用户拥有的 Item（避免外键约束/孤儿数据）
    statement = delete(Item).where(
        col(Item.owner_id) == user_id
    )  # DELETE FROM item WHERE owner_id = :user_id
    session.exec(statement)  # 执行批量删除（SQL 级）

    # 4) 再删除用户本身
    session.delete(user)  # 删除 user 记录
    session.commit()  # 提交事务（同时提交 item 删除与 user 删除）
    return Message(message="User deleted successfully")  # 返回成功提示

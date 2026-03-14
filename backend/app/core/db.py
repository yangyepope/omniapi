from sqlmodel import Session, create_engine, select  # SQLModel：会话、引擎与查询构造

from app import crud  # CRUD 层：封装用户创建等数据库写入逻辑
from app.core.config import settings  # 配置：数据库 DSN、首个超管账号信息
from app.models import User, UserCreate  # ORM 模型与创建输入模型

engine = create_engine(  # 创建数据库引擎：应用全局复用（连接池等由引擎管理）
    str(settings.SQLALCHEMY_DATABASE_URI)  # 由 settings 计算出的 SQLAlchemy DSN
)


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # Tables should be created with Alembic migrations  # 推荐：使用 Alembic 管理建表/变更
    # But if you don't want to use migrations, create  # 如果不使用迁移，也可以在运行时建表
    # the tables un-commenting the next lines  # 取消注释下面几行即可创建表结构
    # from sqlmodel import SQLModel  # 引入 SQLModel 以便访问 metadata

    # This works because the models are already imported and registered from app.models  # 前提：模型已 import 注册
    # SQLModel.metadata.create_all(engine)  # 可选：直接按 metadata 创建所有表（不推荐用于生产）

    user = (  # 查询“首个超级管理员”是否已存在
        session.exec(  # 执行 SQLModel 查询
            select(User).where(  # 构造 SELECT ... WHERE email = FIRST_SUPERUSER
                User.email == settings.FIRST_SUPERUSER  # 从配置读取首个超管邮箱
            )
        ).first()  # 取第一条匹配记录（不存在则为 None）
    )
    if not user:  # 如果不存在首个超管，则自动初始化创建
        user_in = UserCreate(  # 构造创建用户的输入对象（会在 CRUD 层做哈希等处理）
            email=settings.FIRST_SUPERUSER,  # 超管邮箱来自配置（.env）
            password=settings.FIRST_SUPERUSER_PASSWORD,  # 超管初始密码来自配置（.env）
            is_superuser=True,  # 标记为超级管理员（拥有最高权限）
        )
        user = crud.create_user(  # 调用 CRUD 创建用户并写入数据库
            session=session,  # 复用传入的数据库会话（由调用方控制事务边界）
            user_create=user_in,  # 创建输入
        )

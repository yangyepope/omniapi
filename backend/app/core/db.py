from sqlmodel import Session, create_engine, select  # 导入 SQLModel 的会话、引擎创建函数和查询构造器

from app import crud  # 导入 CRUD 操作模块
from app.core.config import settings  # 导入全局配置
from app.models import User, UserCreate  # 导入用户相关的数据库模型

# 根据配置中的数据库 URI 创建全局同步数据库引擎
engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


# 确保在初始化数据库之前已经导入了所有的 SQLModel 模型 (app.models)
# 否则，SQLModel 可能会无法正确初始化关系 (relationships)
# 更多详细信息请参考: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # 数据库表应当通过 Alembic 迁移脚本来创建
    # 但如果你不想使用迁移脚本，可以通过取消注释以下代码来直接建表
    # from sqlmodel import SQLModel

    # 这之所以能工作，是因为在 app.models 中已经导入并注册了这些模型
    # SQLModel.metadata.create_all(engine)

    # 查询数据库，检查是否已存在首个超级管理员
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    
    # 如果不存在，则自动创建一个超级管理员账户
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,  # 配置中的超级管理员邮箱
            password=settings.FIRST_SUPERUSER_PASSWORD,  # 配置中的超级管理员密码
            is_superuser=True,  # 标记为超级管理员
        )
        # 调用 CRUD 方法将用户写入数据库
        user = crud.create_user(session=session, user_create=user_in)


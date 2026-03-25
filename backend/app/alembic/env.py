import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# 获取 Alembic 配置对象
# 它提供了对正在使用的 .ini 文件中值的访问。
config = context.config

# 根据配置文件解释 Python 日志记录。
# 这行代码基本上设置了日志记录器。
assert config.config_file_name is not None
fileConfig(config.config_file_name)

# 导入应用的 SQLModel 和配置
from app.models import SQLModel  # noqa
from app.core.config import settings # noqa

# 将目标元数据设置为 SQLModel 的元数据，用于支持“自动生成”迁移
target_metadata = SQLModel.metadata

def get_url():
    # 从应用配置中获取数据库连接 URL
    return str(settings.SQLALCHEMY_DATABASE_URI)


def run_migrations_offline():
    """在“离线”模式下运行迁移。

    这仅使用一个 URL 来配置上下文，而不是一个引擎 (Engine)，
    尽管在这里使用引擎也是可以接受的。通过跳过引擎的创建，
    我们甚至不需要 DBAPI 可用。

    这里对 context.execute() 的调用会将给定的字符串输出到脚本输出中。
    """
    url = get_url()
    context.configure(
        url=url, target_metadata=target_metadata, literal_binds=True, compare_type=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """在“在线”模式下运行迁移。

    在这种情况下，我们需要创建一个引擎 (Engine)
    并将连接与上下文相关联。
    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata, compare_type=True
        )

        with context.begin_transaction():
            context.run_migrations()


# 判断当前是离线还是在线模式，并执行相应的迁移函数
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()


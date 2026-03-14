import os  # os.getenv：读取环境变量开关（例如是否允许在 production 环境跑测试）
from collections.abc import (
    Generator,  # Generator：用于 pytest fixture 的 yield 形式返回类型
)

import pytest  # pytest：测试框架（fixture/exit 等能力）
from fastapi.testclient import (
    TestClient,  # TestClient：用于在单元测试里调用 FastAPI 应用
)
from sqlalchemy import event  # event：SQLAlchemy 事件钩子（用于自动重建 SAVEPOINT）
from sqlalchemy.engine import (
    Connection,  # Connection：数据库连接对象（用于手动控制事务边界）
)
from sqlmodel import Session  # Session：SQLModel 会话（底层基于 SQLAlchemy Session）

from app.api.deps import (
    get_db,  # get_db：FastAPI 的 DB 依赖（测试里会 override 成“同一个会话”）
)
from app.core.config import (
    settings,  # settings：读取 ENVIRONMENT 等配置，用于测试安全保护
)
from app.core.db import (  # engine：全局数据库引擎；init_db：初始化必要数据（如首个超管）
    engine,
    init_db,
)
from app.main import app  # app：FastAPI 应用实例（用于 TestClient）
from tests.utils.user import (  # 测试辅助：通过用户邮箱获取鉴权头（Bearer token）
    authentication_token_from_email,
)
from tests.utils.utils import (  # 测试辅助：获取超管鉴权头
    get_superuser_token_headers,
)

# --------------------------------------------------------------------------------------
# 测试安全保护：默认禁止在 production 环境运行测试
# --------------------------------------------------------------------------------------
# 背景：测试过程中会创建用户、API Key、Item 等数据；如果误连生产库，哪怕不“删表”，
#       也可能污染生产数据。因此这里做硬防护：除非显式允许，否则直接终止测试。
if (
    settings.ENVIRONMENT == "production"
    and os.getenv("ALLOW_TESTS_IN_PRODUCTION") != "1"
):
    pytest.exit(  # 直接退出 pytest（returncode=2 表示“用例/环境配置问题”）
        "Refusing to run tests with ENVIRONMENT=production. "
        "Set ALLOW_TESTS_IN_PRODUCTION=1 to override.",
        returncode=2,
    )


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    # DB fixture：为“每个测试用例”提供一个独立事务隔离的 Session
    #
    # 目标：不删除原有表/原有数据，只让测试用例写入的数据在用例结束后自动回滚。
    #
    # 核心做法：
    # 1) 手动拿一个 Connection，并开启外层事务（outer transaction）
    # 2) 在 Session 上开启 SAVEPOINT（nested transaction）
    # 3) 通过 SQLAlchemy 事件，在业务代码调用 session.commit() 后自动重建 SAVEPOINT
    # 4) 用例结束时回滚外层事务 -> 清理掉本用例产生的所有变更（包括“已 commit 的变更”）
    connection: Connection = engine.connect()  # 从连接池获取一个连接（用完必须 close）
    outer_transaction = connection.begin()  # 开启外层事务：用例结束统一 rollback

    session = Session(
        bind=connection
    )  # 用同一个 connection 创建 Session（确保所有写入走同一事务）
    session.begin_nested()  # 开启 SAVEPOINT：拦截业务代码内部的 session.commit()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(session_in: Session, transaction: object) -> None:
        # 当 nested transaction 结束后（通常是业务代码调用了 session.commit()），
        # 需要立刻开启新的 SAVEPOINT，以保证后续的 commit 仍然不会提交外层事务。
        #
        # 注意：这里不直接引用具体 Transaction 类型，避免版本差异导致类型/属性不一致。
        try:
            is_nested = bool(getattr(transaction, "nested", False))
        except Exception:
            is_nested = False
        if is_nested:
            session_in.begin_nested()

    # 覆盖 FastAPI 的 get_db 依赖：让接口请求使用“同一个 Session”，从而受事务回滚保护。
    def _override_get_db() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_db] = (
        _override_get_db  # 设置 override（当前测试用例生效）
    )

    # 初始化必要数据（例如首个超管）：即便内部调用 commit，也会被 SAVEPOINT 截获
    init_db(session)

    try:
        yield session  # 把 Session 交给测试用例（也供其他 fixture 依赖使用）
    finally:
        # 清理 override：避免污染后续测试（尤其是不同连接/不同 Session）
        app.dependency_overrides.pop(get_db, None)

        # 关闭会话：释放 ORM 资源（不等同于关闭 connection）
        session.close()

        # 回滚外层事务：清掉本测试用例写入的所有数据（即“只清测试数据”）
        outer_transaction.rollback()

        # 关闭连接：归还连接池
        connection.close()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    # client fixture：模块级复用一个 TestClient（节省启动成本）
    #
    # 注意：DB 事务隔离在 db fixture 里做（function scope），
    #       每个测试用例运行前会覆盖 get_db，运行后会清理 override。
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    # superuser_token_headers：获取超管的 Bearer token 头（用于需要超管权限的接口测试）
    return get_superuser_token_headers(client)


@pytest.fixture(scope="function")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    # normal_user_token_headers：获取普通用户的 Bearer token 头
    #
    # 这里依赖 db fixture 的原因：
    # - authentication_token_from_email 会涉及用户创建/登录；
    # - 需要这些写入受“测试用例事务回滚”保护，避免污染真实数据。
    return authentication_token_from_email(
        client=client,  # 用 TestClient 调接口完成登录
        email=settings.EMAIL_TEST_USER,  # 测试用户邮箱（来自配置）
        db=db,  # 用例级 Session（用例结束会回滚）
    )

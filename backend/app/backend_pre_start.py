import logging  # 标准库 logging：输出“等待 DB 就绪”的日志（配合容器启动排障）

from sqlalchemy import Engine  # Engine：SQLAlchemy 引擎类型（用于声明 init 入参类型）
from sqlmodel import (  # Session：数据库会话；select：构造一个最简单的查询
    Session,
    select,
)
from tenacity import (  # tenacity：重试库（用于在 DB 未就绪时自动重试）
    after_log,  # after_log：每次重试后记录日志
    before_log,  # before_log：每次重试前记录日志
    retry,  # retry：重试装饰器
    stop_after_attempt,  # stop_after_attempt：达到最大尝试次数后停止
    wait_fixed,  # wait_fixed：固定间隔等待后再重试
)

from app.core.db import engine  # engine：项目全局数据库引擎（连接到 compose 中的 db）

logging.basicConfig(
    level=logging.INFO
)  # 设置默认日志级别为 INFO（确保容器里能看到关键日志）
logger = logging.getLogger(__name__)  # 获取当前模块的 logger（用于输出重试与错误信息）

max_tries = (
    60 * 5
)  # 最大重试次数：按每秒一次计算，约 5 分钟（避免 DB 启动慢导致服务直接失败）
wait_seconds = 1  # 每次重试的等待秒数：固定 1 秒（减少启动期间的抖动与压力）


@retry(
    stop=stop_after_attempt(max_tries),  # 达到 max_tries 次尝试后停止并抛出最后一次异常
    wait=wait_fixed(wait_seconds),  # 每次失败后固定等待 wait_seconds 再重试
    before=before_log(logger, logging.INFO),  # 每次尝试前记录 INFO 日志（可见正在重试）
    after=after_log(
        logger, logging.WARN
    ),  # 每次失败后记录 WARN 日志（可见失败原因与重试节奏）
)
def init(db_engine: Engine) -> None:
    # 这个函数的目的：仅“探活”数据库连接是否可用，并不做任何数据迁移/初始化/备份。  # 只要 select(1) 能跑通，就认为 DB 已就绪
    try:  # 捕获连接/执行失败的异常，并交给 tenacity 触发重试
        with Session(db_engine) as session:  # 基于传入引擎创建一次会话（用完自动关闭）
            # Try to create session to check if DB is awake  # 通过最简单的查询验证 DB 可响应
            session.exec(
                select(1)
            )  # 执行 SELECT 1：不依赖任何业务表，成本低且不会改动数据
    except Exception as e:  # 任何异常（网络/认证/DB 未启动/连接数耗尽等）都进入重试流程
        logger.error(e)  # 记录错误日志：便于在容器日志中定位为什么连不上 DB
        raise e  # 重新抛出异常：tenacity 需要异常来判断“本次失败，需要重试”


def main() -> None:
    # main：脚本入口，常用于容器 prestart 阶段。  # 只负责等待 DB 就绪，不做任何“初始化数据”的写入
    logger.info("Initializing service")  # 输出启动探活日志：便于在部署日志中看到进度
    init(engine)  # 调用探活逻辑：必要时会自动重试最多约 5 分钟
    logger.info(
        "Service finished initializing"
    )  # DB 已就绪：后续步骤（迁移/初始化）才会开始


if __name__ == "__main__":
    main()  # 允许以 `python app/backend_pre_start.py` 方式直接运行（例如 scripts/prestart.sh）

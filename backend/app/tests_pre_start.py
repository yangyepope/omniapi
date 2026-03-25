import logging  # 导入日志模块

from sqlalchemy import Engine  # 导入 SQLAlchemy 引擎类型
from sqlmodel import Session, select  # 导入 SQLModel 会话和查询构造器
from tenacity import after_log, before_log, retry, stop_after_attempt, wait_fixed  # 导入重试库 tenacity 相关的装饰器和控制组件

from app.core.db import engine  # 导入全局数据库引擎

# 配置基础日志级别为 INFO
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

max_tries = 60 * 5  # 最大重试次数：5 分钟（每次 1 秒，共 300 次）
wait_seconds = 1  # 每次重试等待时间：1 秒


# 使用 tenacity 设置重试策略
@retry(
    stop=stop_after_attempt(max_tries),  # 超过最大尝试次数则停止
    wait=wait_fixed(wait_seconds),  # 固定等待指定秒数
    before=before_log(logger, logging.INFO),  # 每次尝试前记录 INFO 级别日志
    after=after_log(logger, logging.WARN),  # 每次尝试后（如果失败）记录 WARN 级别日志
)
def init(db_engine: Engine) -> None:
    try:
        # 尝试创建一个会话并执行一个简单的查询（SELECT 1），以检查数据库是否已经唤醒并可连接
        with Session(db_engine) as session:
            session.exec(select(1))
    except Exception as e:
        # 如果抛出异常，说明数据库暂不可用，记录错误并重新抛出触发 tenacity 重试
        logger.error(e)
        raise e


def main() -> None:
    logger.info("正在初始化服务连接")  # 记录服务初始化开始
    init(engine)  # 调用 init 函数并传入引擎开始检查连接
    logger.info("服务初始化检查完成")  # 记录服务初始化完成


if __name__ == "__main__":
    # 如果作为主脚本运行，则执行 main 函数
    main()


import logging  # 导入日志模块

from sqlmodel import Session  # 导入 SQLModel 的会话管理类

from app.core.db import engine, init_db  # 导入数据库引擎和初始化函数

# 配置基础日志级别为 INFO
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init() -> None:
    # 使用数据库引擎创建一个新的会话上下文
    with Session(engine) as session:
        # 调用初始化函数，通常用于创建表或初始超级管理员账号
        init_db(session)


def main() -> None:
    logger.info("开始创建初始数据")  # 记录开始日志
    init()  # 执行初始化逻辑
    logger.info("初始数据创建完成")  # 记录完成日志


if __name__ == "__main__":
    # 如果直接运行此脚本，则执行主函数
    main()


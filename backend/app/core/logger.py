import logging
import sys  # sys.stderr 用作日志输出流（容器/终端能直接看到）
from typing import (
    Any,  # 返回类型注解：setup_logger 返回 logger 对象（loguru 的类型较宽）
)

from loguru import logger  # 第三方日志库：比标准 logging 更易用、格式更灵活

from app.core.config import (
    settings,  # 读取运行环境配置：决定日志级别（local/debug vs production/info）
)


class _InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except Exception:
            level = record.levelno
        logger.bind(logger_name=record.name).opt(exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logger() -> Any:
    logger.remove()  # 移除 loguru 默认 handler：避免重复输出/格式不一致

    # Custom format  # 自定义控制台输出格式：时间、级别、位置与消息
    # Time | Level | File:Line | Message  # 输出字段示例说明（便于阅读日志）
    log_format = (  # loguru 的 format 支持颜色标签与占位符
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "  # 精确到毫秒的时间戳
        "<level>{level: <8}</level> | "  # 日志级别，左对齐固定宽度，便于对齐阅读
        "<cyan>{extra[logger_name]}</cyan> - "  # 标准 logging 的 logger 名（如 httpx/uvicorn/app.services...）
        "<level>{message}</level>"  # 正文消息（颜色随级别变化）
    )  # format 字符串拼接结束

    logger.configure(extra={"logger_name": "app"})  # 为未 bind 的 loguru 日志提供默认 logger_name

    # Add console handler  # 添加控制台 handler：输出到 stderr，适合容器日志采集
    logger.add(  # 注册一个新的日志输出目标（sink）
        sys.stderr,  # 输出流：标准错误输出（与 stdout 分离，便于区分）
        format=log_format,  # 使用上面定义的自定义格式
        level="INFO" if settings.ENVIRONMENT == "production" else "DEBUG",  # 生产更克制，本地更详细
        enqueue=True,  # 异步队列写入：多线程/多进程场景更安全（uvicorn/reload 等）
        colorize=True,  # 在支持的终端启用颜色（容器日志里也可能可见）
    )  # handler 配置结束

    # Optional: Add file handler for persistence  # 可选：写入文件以便长期保留（当前默认关闭）
    # logger.add(  # 如果需要落盘日志，可启用该 handler
    #     "logs/app.log",  # 日志文件路径（相对路径以工作目录为准）
    #     rotation="500 MB",  # 分割策略：单文件达到 500MB 自动切分
    #     retention="10 days",  # 保留策略：保留 10 天后清理旧日志
    #     level="INFO",  # 文件日志级别：通常与生产一致
    #     format=log_format,  # 复用同一格式
    #     enqueue=True  # 异步写入，避免 IO 阻塞请求处理
    # )  # 文件 handler 配置结束

    level = "INFO" if settings.ENVIRONMENT == "production" else "DEBUG"
    logging.basicConfig(handlers=[_InterceptHandler()], level=0, force=True)
    for name in (
        "uvicorn",
        "uvicorn.error",
        "uvicorn.access",
        "fastapi",
        "httpx",
        "httpcore",
        "h11",
    ):
        logging_logger = logging.getLogger(name)
        logging_logger.handlers = [_InterceptHandler()]
        logging_logger.propagate = False
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("h11").setLevel(logging.WARNING)
    logging.getLogger().setLevel(level)

    return logger  # 返回配置好的 logger（便于其他模块按需引用）


# Initialize logger  # 模块加载时即初始化 logger：保证应用启动后立刻使用统一日志格式
setup_logger()  # 调用初始化：注册 handler（避免在 main 中遗漏调用）

import logging  # 标准库 logging：uvicorn/httpx 等第三方库默认都基于它输出日志
import sys  # sys.stderr 用作日志输出流（容器/终端能直接看到）
from typing import (
    Any,  # 返回类型注解：setup_logger 返回 logger 对象（loguru 的类型较宽）
)

from loguru import logger  # 第三方日志库：比标准 logging 更易用、格式更灵活

from app.core.config import (
    settings,  # 读取运行环境配置：决定日志级别（local/debug vs production/info）
)


class _InterceptHandler(logging.Handler):
    # 标准 logging -> loguru 的桥接 handler：把所有 logging 体系的日志转发到 loguru 输出
    def emit(self, record: logging.LogRecord) -> None:
        # record 是标准 logging 的一条日志记录：包含 level/name/message/异常栈等
        level: (
            str | int
        )  # loguru 支持字符串级别名或数值级别，这里显式标注以满足 mypy 严格检查
        try:
            level = logger.level(record.levelname).name  # 优先使用 loguru 已知的级别名
        except Exception:
            level = record.levelno  # 兜底：使用数值级别（避免遇到自定义级别时报错）
        logger.bind(  # 给 loguru 注入额外字段：用于 format 中显示原始 logger 名
            logger_name=record.name  # 例如 "httpx"、"uvicorn.access"、"app.services.xxx"
        ).opt(  # opt 用于携带异常信息等（不改变原始 message）
            exception=record.exc_info  # 如果 logging 记录了异常，这里会让 loguru 打印堆栈
        ).log(  # 用 loguru 统一输出（颜色/格式由下面 logger.add 控制）
            level,  # 日志级别（名称或数值）
            "{}",  # 使用占位符承载 message，避免 message 内包含 {..} 时触发 loguru 的 format 解析异常
            record.getMessage(),  # 标准 logging 的最终渲染消息（已完成 % 格式化）
        )


def setup_logger() -> Any:
    logger.remove()  # 移除 loguru 默认 handler：避免重复输出/格式不一致
    logger.level("TRACE", color="<cyan>")
    logger.level("DEBUG", color="<blue>")
    logger.level("INFO", color="<green>")
    logger.level("SUCCESS", color="<green>")
    logger.level("WARNING", color="<yellow>")
    logger.level("ERROR", color="<red>")
    logger.level("CRITICAL", color="<RED><bold>")
    log_format = (
        "<white>{time:YYYY-MM-DD HH:mm:ss.SSSSSS}</white> | "
        "<level>{level: <8}</level> | "
        "<cyan>{extra[logger_name]}</cyan> - "
        "<level>{message}</level>"
    )

    logger.configure(
        extra={"logger_name": "app"}
    )  # 为未 bind 的 loguru 日志提供默认 logger_name

    # Add console handler  # 添加控制台 handler：输出到 stderr，适合容器日志采集
    logger.add(  # 注册一个新的日志输出目标（sink）
        sys.stderr,  # 输出流：标准错误输出（与 stdout 分离，便于区分）
        format=log_format,
        level="INFO"
        if settings.ENVIRONMENT == "production"
        else "DEBUG",  # 生产更克制，本地更详细
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

    level = (
        "INFO" if settings.ENVIRONMENT == "production" else "DEBUG"
    )  # 环境级别开关：生产 INFO，本地 DEBUG
    logging.basicConfig(  # 重新配置标准 logging：把根 logger 的 handler 替换为拦截器
        handlers=[_InterceptHandler()],  # 所有 logging 输出统一转发到 loguru
        level=0,  # 让具体 logger 自己决定级别（避免根 logger 过早过滤）
        force=True,  # 强制覆盖已有 basicConfig（避免 uvicorn 等先初始化导致无效）
    )
    for name in (
        "uvicorn",
        "uvicorn.error",
        "uvicorn.access",
        "fastapi",
        "httpx",
        "httpcore",
        "h11",
    ):
        logging_logger = logging.getLogger(name)  # 取到对应命名空间的 logger
        logging_logger.handlers = [_InterceptHandler()]  # 覆盖 handler：确保走 loguru
        logging_logger.propagate = False  # 禁止向上传播到根 logger，避免重复输出

    noisy_level = (  # httpx 底层组件的输出控制：按环境决定是否打开 DEBUG 明细
        logging.WARNING if settings.ENVIRONMENT == "production" else logging.DEBUG
    )
    logging.getLogger("httpcore").setLevel(
        noisy_level
    )  # httpcore：请求收发过程（DEBUG 很啰嗦）
    logging.getLogger("h11").setLevel(
        noisy_level
    )  # h11：HTTP/1.1 协议细节（DEBUG 很啰嗦）
    logging.getLogger().setLevel(
        level
    )  # 设置根 logger 的可见级别（你提到的那行就是这里控制）

    return logger  # 返回配置好的 logger（便于其他模块按需引用）


# Initialize logger  # 模块加载时即初始化 logger：保证应用启动后立刻使用统一日志格式
setup_logger()  # 调用初始化：注册 handler（避免在 main 中遗漏调用）

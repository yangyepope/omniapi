import sys

from loguru import logger

from app.core.config import settings


def setup_logger():
    logger.remove()  # Remove default handler

    # Custom format
    # Time | Level | File:Line | Message
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )

    # Add console handler
    logger.add(
        sys.stderr,
        format=log_format,
        level="INFO" if settings.ENVIRONMENT == "production" else "DEBUG",
        enqueue=True,
        colorize=True
    )

    # Optional: Add file handler for persistence
    # logger.add(
    #     "logs/app.log",
    #     rotation="500 MB",
    #     retention="10 days",
    #     level="INFO",
    #     format=log_format,
    #     enqueue=True
    # )

    return logger

# Initialize logger
setup_logger()

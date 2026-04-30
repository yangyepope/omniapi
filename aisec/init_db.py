"""
init_db: 在 omniapi 主 PG 实例上创建 aisec_audit 库 + 表结构。

用法：
    python -m aisec.init_db

环境变量：
    AI_AUDIT_POSTGRES_DSN     目标库连接串
    POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_SERVER, POSTGRES_PORT
                              用于 maintenance 连接（创建库）
"""
import asyncio
import logging
import os
import re
from pathlib import Path

import asyncpg

from aisec.config import DEFAULT_SCHEMA_FILE, get_settings

logger = logging.getLogger(__name__)
SCHEMA_FILE: Path = DEFAULT_SCHEMA_FILE


def _parse_target_db_name(dsn: str) -> str:
    m = re.search(r"/([^/?]+)(?:\?|$)", dsn)
    if not m:
        raise ValueError(f"cannot parse db name from DSN: {dsn}")
    return m.group(1)


async def _ensure_database(target_db: str) -> None:
    user = os.environ["POSTGRES_USER"]
    password = os.environ["POSTGRES_PASSWORD"]
    host = os.environ.get("POSTGRES_SERVER", "db")
    port = int(os.environ.get("POSTGRES_PORT", "5432"))

    conn = await asyncpg.connect(
        user=user, password=password, host=host, port=port, database="postgres"
    )
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", target_db
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{target_db}"')
            logger.info("created database: %s", target_db)
        else:
            logger.info("database already exists: %s", target_db)
    finally:
        await conn.close()


async def _apply_schema(dsn: str) -> None:
    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute(sql)
        logger.info("schema applied: %s", SCHEMA_FILE)
    finally:
        await conn.close()


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    dsn = get_settings().AI_AUDIT_POSTGRES_DSN
    target_db = _parse_target_db_name(dsn)
    await _ensure_database(target_db)
    await _apply_schema(dsn)


if __name__ == "__main__":
    asyncio.run(main())

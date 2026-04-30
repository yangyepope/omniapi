"""异步 Neo4j 客户端（v3.0 §2.4 / §2.5）。"""
import logging
from typing import Any, Iterable, Optional

from neo4j import AsyncGraphDatabase
from neo4j._async.driver import AsyncDriver

from aisec.config import get_settings

logger = logging.getLogger(__name__)

_driver: Optional[AsyncDriver] = None


async def get_driver() -> AsyncDriver:
    global _driver
    if _driver is None:
        s = get_settings()
        _driver = AsyncGraphDatabase.driver(
            s.NEO4J_URI, auth=(s.NEO4J_USER, s.NEO4J_PASSWORD)
        )
        logger.info("neo4j driver initialized: %s", s.NEO4J_URI)
    return _driver


async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


async def run_query(
    cypher: str,
    params: Optional[dict[str, Any]] = None,
) -> list[dict[str, Any]]:
    s = get_settings()
    driver = await get_driver()
    async with driver.session(database=s.NEO4J_DATABASE) as session:
        result = await session.run(cypher, params or {})
        return [dict(record) async for record in result]


async def run_write(
    cypher: str,
    params: Optional[dict[str, Any]] = None,
) -> None:
    s = get_settings()
    driver = await get_driver()
    async with driver.session(database=s.NEO4J_DATABASE) as session:
        await session.execute_write(lambda tx: tx.run(cypher, params or {}))


async def run_write_batch(
    cypher: str,
    rows: Iterable[dict[str, Any]],
    batch_size: int = 500,
) -> int:
    """批量执行同一 Cypher，rows 元素作为 row 注入（cypher 内通过 UNWIND $rows 引用）。"""
    s = get_settings()
    driver = await get_driver()
    written = 0
    batch: list[dict[str, Any]] = []
    async with driver.session(database=s.NEO4J_DATABASE) as session:
        async def _flush(items: list[dict[str, Any]]) -> None:
            nonlocal written
            if not items:
                return
            await session.execute_write(
                lambda tx: tx.run(f"UNWIND $rows AS row {cypher}", {"rows": items})
            )
            written += len(items)

        for r in rows:
            batch.append(r)
            if len(batch) >= batch_size:
                await _flush(batch)
                batch = []
        await _flush(batch)
    return written

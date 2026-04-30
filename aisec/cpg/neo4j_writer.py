"""
将 CPG 节点写入 Neo4j（v3.0 §2.4）。

写入策略：
- 节点统一打 service 标签 + 属性 commit
- 节点种类：CONTROLLER / METHOD / FILE / SQL_SINK / FEIGN_CALL
- 关系：CALLS（METHOD→METHOD）/ ROUTE（CONTROLLER→METHOD）/ SQL_OF（METHOD→SQL_SINK）

新一次扫描重建时按 service 先删后写。
"""
import logging
from typing import Any

from aisec.cpg.neo4j_client import run_query, run_write, run_write_batch

logger = logging.getLogger(__name__)


async def reset_service_subgraph(service_name: str) -> None:
    await run_write(
        "MATCH (n {service: $service}) DETACH DELETE n",
        {"service": service_name},
    )
    logger.info("neo4j reset service subgraph: %s", service_name)


async def write_controllers(
    service: str, commit: str, controllers: list[dict[str, Any]]
) -> int:
    """controllers 元素：{signature, cls, method, http_method, path, file, line}"""
    if not controllers:
        return 0
    return await run_write_batch(
        f"""
        MERGE (c:CONTROLLER {{service: '{service}', signature: row.signature}})
        SET c.cls = row.cls, c.method = row.method,
            c.http_method = row.http_method, c.path = row.path,
            c.file = row.file, c.line = row.line, c.commit = '{commit}'
        """,
        controllers,
    )


async def write_methods(
    service: str, commit: str, methods: list[dict[str, Any]]
) -> int:
    """methods 元素：{signature, cls, name, file, line}"""
    if not methods:
        return 0
    return await run_write_batch(
        f"""
        MERGE (m:METHOD {{service: '{service}', signature: row.signature}})
        SET m.cls = row.cls, m.name = row.name,
            m.file = row.file, m.line = row.line, m.commit = '{commit}'
        """,
        methods,
    )


async def write_calls(service: str, calls: list[dict[str, Any]]) -> int:
    """calls 元素：{caller_signature, callee_signature}"""
    if not calls:
        return 0
    return await run_write_batch(
        f"""
        MATCH (caller:METHOD {{service: '{service}', signature: row.caller_signature}})
        MATCH (callee:METHOD {{service: '{service}', signature: row.callee_signature}})
        MERGE (caller)-[:CALLS]->(callee)
        """,
        calls,
    )


async def write_sql_sinks(service: str, sinks: list[dict[str, Any]]) -> int:
    """sinks 元素：{owner_signature, file, line, sql_pattern, has_injection_risk, kind}"""
    if not sinks:
        return 0
    return await run_write_batch(
        f"""
        MATCH (m:METHOD {{service: '{service}', signature: row.owner_signature}})
        MERGE (s:SQL_SINK {{service: '{service}', file: row.file, line: row.line}})
        SET s.sql_pattern = row.sql_pattern,
            s.has_injection_risk = row.has_injection_risk,
            s.kind = row.kind
        MERGE (m)-[:SQL_OF]->(s)
        """,
        sinks,
    )


async def write_feign_calls(service: str, edges: list[dict[str, Any]]) -> int:
    """edges 元素：{caller_signature, target_service, target_method, file, line}"""
    if not edges:
        return 0
    return await run_write_batch(
        f"""
        MATCH (m:METHOD {{service: '{service}', signature: row.caller_signature}})
        MERGE (f:FEIGN_CALL {{service: '{service}',
                              target_service: row.target_service,
                              target_method: row.target_method}})
        SET f.file = row.file, f.line = row.line
        MERGE (m)-[:FEIGN_OF]->(f)
        """,
        edges,
    )


async def commit_recorded(service: str, commit: str) -> bool:
    """跨扫描判断：Neo4j 中是否已存在该 service+commit 的 CPG。"""
    rows = await run_query(
        "MATCH (m {service: $service, commit: $commit}) RETURN count(m) AS cnt",
        {"service": service, "commit": commit},
    )
    return bool(rows and rows[0]["cnt"] > 0)

"""
Activity 5：从 Neo4j 提取 Source→Sink 调用链 / 数据流（v3.0 §2.2）。
"""
import logging
from typing import Any

from aisec.cpg.neo4j_client import run_query

logger = logging.getLogger(__name__)

_CYPHER_CHAIN = """
MATCH (c:CONTROLLER {service: $service, signature: $signature})
OPTIONAL MATCH path = (c)-[:CALLS|FEIGN_OF*1..6]->(target)
WHERE target:METHOD OR target:SQL_SINK OR target:FEIGN_CALL
WITH c, path, target
RETURN
    c.signature AS controller,
    c.path AS endpoint_path,
    c.http_method AS http_method,
    [n IN nodes(path) | coalesce(n.signature, n.target_method, n.kind)] AS chain,
    target.file AS sink_file,
    coalesce(target.line, 0) AS sink_line,
    labels(target) AS target_labels,
    coalesce(target.sql_pattern, target.target_service, '') AS sink_extra
LIMIT 200
"""


async def query_chains_for_service(
    service: str,
    endpoints: list[dict[str, Any]],
) -> dict[str, Any]:
    context: dict[str, list[dict[str, Any]]] = {}
    critical_files: set[str] = set()
    joern_paths: list[dict[str, Any]] = []

    for ep in endpoints:
        sig = ep.get("signature") or f"{ep.get('cls','')}.{ep.get('method','')}"
        path_key = ep.get("path") or sig
        endpoint_label = f"{ep.get('http_method','ANY')} {path_key}"

        rows = await run_query(_CYPHER_CHAIN, {"service": service, "signature": sig})
        if not rows:
            continue

        chains_for_ep: list[dict[str, Any]] = []
        for r in rows:
            target_labels = r.get("target_labels") or []
            sink_kind = (
                "sql_sink" if "SQL_SINK" in target_labels
                else "feign_call" if "FEIGN_CALL" in target_labels
                else "method"
            )
            chain = r.get("chain") or []
            if r.get("sink_file"):
                critical_files.add(r["sink_file"])

            entry = {
                "endpoint": endpoint_label,
                "chain": chain,
                "sink_kind": sink_kind,
                "sink_file": r.get("sink_file") or "",
                "sink_line": int(r.get("sink_line") or 0),
                "sink_extra": r.get("sink_extra") or "",
            }
            chains_for_ep.append(entry)

            joern_paths.append(
                {
                    "service_name": service,
                    "endpoint": endpoint_label,
                    "sink_method": chain[-1] if chain else "<unknown>",
                    "source_kind": "controller_param",
                    "call_chain": [str(c) for c in chain],
                    "file_path": r.get("sink_file") or "",
                    "line_number": int(r.get("sink_line") or 0),
                    "snippet": r.get("sink_extra") or "",
                }
            )
        if chains_for_ep:
            context[endpoint_label] = chains_for_ep

    logger.info(
        "call_chain query: service=%s endpoints=%d chains=%d files=%d",
        service, len(endpoints), len(joern_paths), len(critical_files),
    )
    return {
        "context": context,
        "critical_files": sorted(critical_files),
        "joern_paths": joern_paths,
    }


async def query_chains_all(
    discovered: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    neo4j_context: dict[str, dict[str, list[dict[str, Any]]]] = {}
    critical_files: dict[str, list[str]] = {}
    joern_paths: list[dict[str, Any]] = []

    for service, endpoints in discovered.items():
        out = await query_chains_for_service(service, endpoints)
        neo4j_context[service] = out["context"]
        critical_files[service] = out["critical_files"]
        joern_paths.extend(out["joern_paths"])

    return {
        "neo4j_context": neo4j_context,
        "critical_files": critical_files,
        "joern_paths": joern_paths,
    }

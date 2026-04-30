"""
Activity 2 编排（v3.0 §2.6）：

Step 1: Joern 通过 joern-runner 构建 CPG（HTTP 调用，长任务）
Step 2: call_chain_resolver 解析 MyBatis XML / JPA @Query / Feign
Step 3: regex 预扫描定位 4 类特殊模式
Step 4: Claude 兜底精读补充节点

输出：cpg_artifact 包含本服务下所有可写入 Neo4j 的节点。
"""
import logging
from pathlib import Path
from typing import Any

from temporalio import activity

from aisec.cpg.joern_client import JoernClient
from aisec.cpg.prescanner import prescan_files
from aisec.cpg.resolver import resolve_service_directory
from aisec.cpg.supplement import supplement_special_files

logger = logging.getLogger(__name__)


async def build_service_cpg(
    service_name: str,
    src_dir: str,
    commit_hash: str,
    *,
    heartbeat: bool = True,
) -> dict[str, Any]:
    if heartbeat:
        activity.heartbeat(f"build_cpg.start {service_name}")

    root = Path(src_dir)

    # ── Step 1: Joern HTTP ──
    joern = JoernClient()
    joern_result: dict[str, Any] = {}
    try:
        joern_result = await joern.analyze(service_name, src_dir, commit_hash)
    except Exception as exc:  # noqa: BLE001
        logger.exception("joern analyze failed: service=%s err=%s", service_name, exc)
    if heartbeat:
        activity.heartbeat(f"build_cpg.joern_done {service_name}")

    joern_nodes = joern_result.get("nodes") or {}
    joern_paths = joern_result.get("paths") or []

    # ── Step 2: call_chain_resolver ──
    resolver_out = await resolve_service_directory(root)
    if heartbeat:
        activity.heartbeat(f"build_cpg.resolver_done {service_name}")

    # ── Step 3: regex 预扫描 ──
    prescan = prescan_files([root])
    special_files = sorted({fp for fps in prescan.values() for fp in fps})
    if heartbeat:
        activity.heartbeat(
            f"build_cpg.prescan_done {service_name} hits={len(special_files)}"
        )

    # ── Step 4: Claude 兜底 ──
    supplement_nodes = await supplement_special_files(
        special_files, description=f"service={service_name}"
    )
    if heartbeat:
        activity.heartbeat(
            f"build_cpg.supplement_done {service_name} nodes={len(supplement_nodes)}"
        )

    # ── 合并 sql_sinks / feign_calls ──
    sql_sinks: list[dict[str, Any]] = []
    seen: set[tuple[str, str, int]] = set()

    def _add_sink(item: dict[str, Any]) -> None:
        key = (
            item.get("file", ""),
            item.get("owner_signature", ""),
            int(item.get("line", 0) or 0),
        )
        if key in seen:
            return
        seen.add(key)
        sql_sinks.append(item)

    for item in resolver_out.get("sql_sinks", []) or []:
        _add_sink(item)
    for item in joern_nodes.get("sql_sinks", []) or []:
        _add_sink(item)
    for n in supplement_nodes:
        if n.type != "sql_sink":
            continue
        _add_sink(
            {
                "kind": "claude_supplement",
                "owner_signature": f"{Path(n.file).stem}.{n.method}",
                "file": n.file,
                "line": 0,
                "sql_pattern": n.sql_pattern or "",
                "has_injection_risk": bool(n.has_injection_risk),
            }
        )

    feign_calls: list[dict[str, Any]] = []
    for item in resolver_out.get("feign_calls", []) or []:
        feign_calls.append(item)
    for item in joern_nodes.get("feign_calls", []) or []:
        feign_calls.append(item)

    return {
        "service_name": service_name,
        "commit_hash": commit_hash,
        "nodes": {
            "endpoints": joern_nodes.get("endpoints", []),
            "controllers": joern_nodes.get("controllers", []),
            "methods": joern_nodes.get("methods", []),
            "calls": joern_nodes.get("calls", []),
            "sql_sinks": sql_sinks,
            "feign_calls": feign_calls,
        },
        "joern_paths": joern_paths,
        "diagnostics": {
            "resolver_errors": resolver_out.get("diagnostics", []),
            "prescan_hits": {k: len(v) for k, v in prescan.items()},
            "supplement_count": len(supplement_nodes),
        },
    }

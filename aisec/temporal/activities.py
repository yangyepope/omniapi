"""
8 个 Activity 函数（v3.0 §2.2）。

设计原则：
- 每个 Activity 幂等
- IO 边界清晰：所有 GitLab / Joern / Neo4j / Claude / DB 调用都在 Activity 内完成
- 入参 / 出参 JSON-serializable Pydantic 模型
- 异常向上抛出，由 Workflow 重试策略处理
"""
import logging
import uuid as _uuid
from pathlib import Path
from typing import Any

from temporalio import activity

from aisec.config import get_settings, source_cache_dir  # noqa: F401
from aisec.cpg.builder import build_service_cpg
from aisec.cpg.call_chain import query_chains_all
from aisec.cpg.discover import discover_for_services
from aisec.cpg.module_discovery import discover_modules, services_to_rebuild
from aisec.cpg.neo4j_writer import (
    commit_recorded,
    reset_service_subgraph,
    write_calls,
    write_controllers,
    write_feign_calls,
    write_methods,
    write_sql_sinks,
)
from aisec.db.repository import AuditRepository
from aisec.db.traffic_publisher import TrafficPublisher
from aisec.gitlab.client import GitLabClient
from aisec.models.scan import ScanContext, ServiceContext
from aisec.notify.notifier import notify_scan_completed
from aisec.scanner.agent_run import run_all_agents
from aisec.scanner.source_sync import sync_service_files
from aisec.scanner.summarizer import summarize
from aisec.temporal.models import (
    BuildCpgInput,
    BuildCpgOutput,
    DiscoverInterfacesInput,
    DiscoverInterfacesOutput,
    PersistAgentResultsInput,
    PersistAgentResultsOutput,
    PublishInput,
    PublishOutput,
    QueryCallChainsInput,
    QueryCallChainsOutput,
    ResolveSourcePlanInput,
    ResolveSourcePlanOutput,
    RunAgentsInput,
    RunAgentsOutput,
    StoreCpgInput,
    StoreCpgOutput,
    SummarizeInput,
    SummarizeOutput,
    SyncSourceInput,
    SyncSourceOutput,
)

logger = logging.getLogger(__name__)


def _is_scannable(path: str) -> bool:
    """只扫源码（剔测试 / build / target）。"""
    p = path.lower()
    if not (p.endswith(".java") or p.endswith(".xml")):
        return False
    bad = ("test/", "/test", "tests/", "/build/", "/target/")
    return not any(b in p for b in bad)


# ── Activity 1：源码同步规划 ──────────────────────────────────────────

@activity.defn(name="resolve_source_plan")
async def resolve_source_plan(inp: ResolveSourcePlanInput) -> ResolveSourcePlanOutput:
    """
    决定本次需要扫描的微服务 + 增量复用判断。

    流程：
    1. 从 GitLab 获取仓库 tree（全量）或 MR changes（增量）
    2. 构造 changed_files 列表
    3. 把仓库 tree 写到一个临时本地 anchor，调 module_discovery 识别模块
    4. services_to_rebuild → 每个 service 计算 commit hash
    """
    client = GitLabClient()
    if inp.mode == "incremental":
        if inp.mr_iid is None:
            raise ValueError("incremental scan requires mr_iid")
        changes = await client.get_mr_changes(inp.project_id, inp.mr_iid)
        changed_files = [c["new_path"] for c in changes if _is_scannable(c["new_path"])]
        ref = (changes[0].get("diff_refs") or {}).get("head_sha") if changes else inp.git_ref
        ref = ref or inp.git_ref
    else:
        tree = await client.get_repository_tree(inp.project_id, inp.git_ref)
        changed_files = [t["path"] for t in tree if _is_scannable(t["path"])]
        ref = inp.git_ref

    # ── 模块识别需要本地仓库 anchor：用一个临时空目录 + 路径树静态推断 ──
    # （避免提前下载整个仓库；module_discovery 只读 pom.xml + 文件路径）
    repo_anchor = source_cache_dir() / f"_anchor_{inp.project_id}_{ref[:12]}"
    repo_anchor.mkdir(parents=True, exist_ok=True)
    # 写入虚拟 pom.xml 和 .java 路径让 discover_modules 能感知结构
    # 这里采取折衷：用 changed_files 中包含 pom.xml 的目录作为模块根
    # 真实部署中可改为下载 root-level pom.xml + 子模块 pom.xml 后再分析
    candidates: dict[str, str] = {}
    for fp in changed_files:
        parts = fp.split("/")
        if len(parts) >= 2 and parts[-1] == "pom.xml":
            candidates[parts[0]] = parts[0]
        elif len(parts) >= 2:
            candidates.setdefault(parts[0], parts[0])

    modules = [
        {
            "service_name": name,
            "module_kind": "service",
            "root_path": root,
            "has_controller": True,
            "referenced_by": [],
        }
        for name, root in candidates.items()
    ]

    # 决定本次重建哪些服务（公共模块改动 → 全量重建）
    services_needed = services_to_rebuild(modules, changed_files) or [
        m["service_name"] for m in modules if m["module_kind"] == "service"
    ]

    # 给每个服务算 commit hash（用于增量缓存判断）
    services: list[dict[str, Any]] = []
    for s in services_needed:
        commit = await client.get_last_commit_for_path(inp.project_id, s, ref)
        services.append(
            ServiceContext(
                service_name=s,
                root_path=s,
                commit_hash=commit or ref,
                module_kind="service",
            ).model_dump()
        )

    return ResolveSourcePlanOutput(
        resolved_ref=ref,
        services=services,
        modules=modules,
        changed_files=changed_files,
    )


# ── Activity 2：源码下载 ─────────────────────────────────────────────

@activity.defn(name="sync_source_files")
async def sync_source_files(inp: SyncSourceInput) -> SyncSourceOutput:
    """
    按 service 并发下载 .java / .xml 文件到本地缓存。

    幂等：source_sync 内部按 service+commit 路径 dedup，命中就跳过。
    """
    repo = AuditRepository()
    file_map_per_service: dict[str, dict[str, str]] = {}
    client = GitLabClient()

    for s in inp.services:
        service_name = s["service_name"]
        commit_hash = s["commit_hash"]

        # 缓存命中？跳过下载
        cached_commit = await repo.latest_commit_for_service(service_name)
        reused = cached_commit == commit_hash

        # 拉取该服务下所有 java/xml
        tree = await client.get_repository_tree(
            inp.project_id, inp.git_ref, path=s["root_path"]
        )
        scannable = [t["path"] for t in tree if _is_scannable(t["path"])]
        local_map = await sync_service_files(
            inp.project_id, service_name, scannable, inp.git_ref, commit_hash
        )
        file_map_per_service[service_name] = {
            fp: str(p) for fp, p in local_map.items()
        }
        await repo.upsert_microservice_commit(
            inp.scan_run_id, service_name, commit_hash, reused
        )
        activity.heartbeat(f"sync_done {service_name} files={len(local_map)}")

    return SyncSourceOutput(file_map_per_service=file_map_per_service)


# ── Activity 3：构建 CPG ─────────────────────────────────────────────

@activity.defn(name="build_cpg")
async def build_cpg(inp: BuildCpgInput) -> BuildCpgOutput:
    """每个微服务调一次 Joern + resolver + 兜底；按需跳过缓存命中。"""
    from aisec.scanner.source_sync import service_cache_dir as _sd

    artifacts: list[dict[str, Any]] = []
    for s in inp.services:
        service_name = s["service_name"]
        commit_hash = s["commit_hash"]

        # Neo4j 已有该 commit 的 CPG → 直接跳过构建（v3.0 §2.4 增量复用）
        if await commit_recorded(service_name, commit_hash):
            logger.info("cpg cache hit: service=%s commit=%s", service_name, commit_hash[:8])
            artifacts.append(
                {
                    "service_name": service_name,
                    "commit_hash": commit_hash,
                    "nodes": {},
                    "joern_paths": [],
                    "diagnostics": {"cache_hit": True},
                }
            )
            activity.heartbeat(f"build_cpg.cache_hit {service_name}")
            continue

        if not (inp.file_map_per_service.get(service_name) or {}):
            logger.warning("no files for service=%s, skip", service_name)
            continue

        # 用 source_sync 的标准缓存目录推 service 根
        service_root = _sd(inp.project_id, service_name, commit_hash)
        artifact = await build_service_cpg(
            service_name, str(service_root), commit_hash
        )
        artifacts.append(artifact)
        activity.heartbeat(f"build_cpg.done {service_name}")

    return BuildCpgOutput(artifacts=artifacts)


# ── Activity 4：写入 Neo4j ──────────────────────────────────────────

@activity.defn(name="store_cpg")
async def store_cpg(inp: StoreCpgInput) -> StoreCpgOutput:
    """按 service 先 reset 后批量写入。"""
    written: list[str] = []
    for art in inp.artifacts:
        service = art["service_name"]
        commit = art["commit_hash"]
        # 缓存命中的 artifact 不必重写
        if (art.get("diagnostics") or {}).get("cache_hit"):
            written.append(service)
            continue
        await reset_service_subgraph(service)
        nodes = art.get("nodes") or {}
        await write_methods(service, commit, nodes.get("methods") or [])
        await write_controllers(service, commit, nodes.get("controllers") or [])
        await write_calls(service, nodes.get("calls") or [])
        await write_sql_sinks(service, nodes.get("sql_sinks") or [])
        await write_feign_calls(service, nodes.get("feign_calls") or [])
        written.append(service)
        activity.heartbeat(f"store_cpg.done {service}")
    return StoreCpgOutput(services_written=written)


# ── Activity 5：接口发现 ────────────────────────────────────────────

@activity.defn(name="discover_interfaces")
async def discover_interfaces(inp: DiscoverInterfacesInput) -> DiscoverInterfacesOutput:
    """先查 Neo4j；查不到回退到本地正则扫描。"""
    services_with_root: list[dict[str, Any]] = []
    cache_root = source_cache_dir()
    for s in inp.services:
        # 给 discover.py 提供本地 root_path（兜底正则扫描用）
        candidates = list(cache_root.rglob(s["service_name"]))
        services_with_root.append(
            {
                "service_name": s["service_name"],
                "root_path": str(candidates[0]) if candidates else "",
            }
        )
    discovered = await discover_for_services(services_with_root)
    return DiscoverInterfacesOutput(discovered=discovered)


# ── Activity 6：调用链查询 ──────────────────────────────────────────

@activity.defn(name="query_call_chains")
async def query_call_chains(inp: QueryCallChainsInput) -> QueryCallChainsOutput:
    out = await query_chains_all(inp.discovered)
    return QueryCallChainsOutput(
        neo4j_context=out["neo4j_context"],
        critical_files=out["critical_files"],
        joern_paths=out["joern_paths"],
    )


# ── Activity 7：Agent 并发分析（最贵的一步） ────────────────────────

@activity.defn(name="run_agents")
async def run_agents(inp: RunAgentsInput) -> RunAgentsOutput:
    """读 Neo4j 上下文 + 关键源文件 → 10 个 Agent 并发分析。"""
    file_contents: dict[str, dict[str, str]] = {}
    for service, file_map in inp.file_map_per_service.items():
        keep = inp.critical_files.get(service) or list(file_map.keys())
        files: dict[str, str] = {}
        for path, local_path in file_map.items():
            if path not in keep and len(files) >= 5:
                continue
            try:
                files[path] = Path(local_path).read_text(
                    encoding="utf-8", errors="replace"
                )
            except OSError:
                continue
        file_contents[service] = files

    services_ctx = [ServiceContext(**s) for s in inp.services]
    context = ScanContext(
        scan_id=inp.scan_id,
        project_id=inp.project_id,
        services=services_ctx,
        neo4j_context=inp.neo4j_context,
        file_contents=file_contents,
    )
    activity.heartbeat("run_agents.start")
    findings = await run_all_agents(context=context)
    activity.heartbeat(f"run_agents.done count={sum(len(f.findings) for f in findings)}")
    return RunAgentsOutput(agent_findings=findings)


# ── Activity 7.5：joern_path 持久化 ──────────────────────────────

@activity.defn(name="persist_agent_results")
async def persist_agent_results(
    inp: PersistAgentResultsInput,
) -> PersistAgentResultsOutput:
    repo = AuditRepository()
    lookup_tuples = await repo.save_joern_paths(inp.scan_run_id, inp.joern_paths)
    # tuple 不是 JSON-serializable，转成 string key
    lookup = {f"{k[0]}|{k[1]}|{k[2]}": v for k, v in lookup_tuples.items()}
    return PersistAgentResultsOutput(joern_path_lookup=lookup)


# ── Activity 8：Claude 汇总 ────────────────────────────────────────

@activity.defn(name="summarize_findings")
async def summarize_findings(inp: SummarizeInput) -> SummarizeOutput:
    summary = await summarize(
        inp.scan_id, inp.project_id, inp.mode, inp.agent_findings
    )
    return SummarizeOutput(summary=summary)


# ── Activity 9：流量平台回传 + 通知 + 落库 ────────────────────────

@activity.defn(name="publish_results")
async def publish_results(inp: PublishInput) -> PublishOutput:
    repo = AuditRepository()

    # joern_path_lookup: str(key) → id 还原回 tuple
    lookup: dict[tuple[str, str, str], int] = {}
    for k, v in (inp.joern_path_lookup or {}).items():
        parts = k.split("|", 2)
        if len(parts) == 3:
            lookup[(parts[0], parts[1], parts[2])] = int(v)

    await repo.save_summary(
        inp.scan_run_id,
        inp.files_count,
        inp.services_scanned,
        inp.summary,
        joern_path_lookup=lookup,
    )

    publish_status = await TrafficPublisher().publish(
        inp.scan_id, inp.project_id, inp.summary
    )
    notify_status = await notify_scan_completed(inp.scan_id, inp.summary)
    return PublishOutput(publish_status=publish_status, notify_status=notify_status)


# ── 兜底：扫描失败时的 PG 标记（由 Workflow except 路径调用）─────

@activity.defn(name="mark_scan_failed")
async def mark_scan_failed(scan_run_id: int, error_message: str) -> None:
    repo = AuditRepository()
    await repo.mark_failed(scan_run_id, error_message)

"""
Activity I/O 模型（v3.0 §2.2 8 Activity）。

约束：
- 必须 JSON-serializable（pydantic BaseModel 默认满足）
- 不含 Path 等非可序列化类型；用 str 路径
"""
from typing import Any, Optional

from pydantic import BaseModel

from aisec.models.scan import ScanInput  # re-export
from aisec.models.vulnerability import AgentFindings, ScanSummary

__all__ = [
    "ScanInput",
    "ResolveSourcePlanInput",
    "ResolveSourcePlanOutput",
    "SyncSourceInput",
    "SyncSourceOutput",
    "BuildCpgInput",
    "BuildCpgOutput",
    "StoreCpgInput",
    "StoreCpgOutput",
    "DiscoverInterfacesInput",
    "DiscoverInterfacesOutput",
    "QueryCallChainsInput",
    "QueryCallChainsOutput",
    "RunAgentsInput",
    "RunAgentsOutput",
    "PersistAgentResultsInput",
    "PersistAgentResultsOutput",
    "SummarizeInput",
    "SummarizeOutput",
    "PublishInput",
    "PublishOutput",
]


# ── Activity 1：源码同步规划 + 执行（合并表达） ────────────────────────

class ResolveSourcePlanInput(BaseModel):
    scan_id: str
    project_id: int
    mode: str
    git_ref: str
    mr_iid: Optional[int] = None


class ResolveSourcePlanOutput(BaseModel):
    """需要扫描的微服务清单 + 增量复用判断结果。"""

    resolved_ref: str
    services: list[dict[str, Any]]  # ServiceContext.model_dump()
    modules: list[dict[str, Any]]   # 公共模块识别结果
    changed_files: list[str]


class SyncSourceInput(BaseModel):
    scan_run_id: int
    project_id: int
    git_ref: str
    services: list[dict[str, Any]]


class SyncSourceOutput(BaseModel):
    """{service_name: {file_path: 本地路径}}"""

    file_map_per_service: dict[str, dict[str, str]]


# ── Activity 2：Joern + Claude 兜底 ─────────────────────────────────

class BuildCpgInput(BaseModel):
    scan_run_id: int
    project_id: int
    services: list[dict[str, Any]]
    file_map_per_service: dict[str, dict[str, str]]


class BuildCpgOutput(BaseModel):
    """每个服务的 cpg_artifact 数组（cpg/builder.build_service_cpg 输出）。"""

    artifacts: list[dict[str, Any]]


# ── Activity 3：Neo4j 持久化 ──────────────────────────────────────

class StoreCpgInput(BaseModel):
    artifacts: list[dict[str, Any]]


class StoreCpgOutput(BaseModel):
    services_written: list[str]


# ── Activity 4：接口发现 ──────────────────────────────────────────

class DiscoverInterfacesInput(BaseModel):
    services: list[dict[str, Any]]


class DiscoverInterfacesOutput(BaseModel):
    """{service_name: [{cls, method, http_method, path, file, line, signature}]}"""

    discovered: dict[str, list[dict[str, Any]]]


# ── Activity 5：Neo4j 调用链查询 ──────────────────────────────────

class QueryCallChainsInput(BaseModel):
    discovered: dict[str, list[dict[str, Any]]]


class QueryCallChainsOutput(BaseModel):
    neo4j_context: dict[str, dict[str, list[dict[str, Any]]]]
    critical_files: dict[str, list[str]]
    joern_paths: list[dict[str, Any]]


# ── Activity 6：Agent 并发分析 ────────────────────────────────────

class RunAgentsInput(BaseModel):
    scan_id: str
    project_id: int
    services: list[dict[str, Any]]
    neo4j_context: dict[str, dict[str, list[dict[str, Any]]]]
    file_map_per_service: dict[str, dict[str, str]]
    critical_files: dict[str, list[str]]


class RunAgentsOutput(BaseModel):
    agent_findings: list[AgentFindings]


# ── Activity 7：PG 持久化 + Claude 汇总 ──────────────────────────

class PersistAgentResultsInput(BaseModel):
    scan_run_id: int
    joern_paths: list[dict[str, Any]]


class PersistAgentResultsOutput(BaseModel):
    """{service+file+sink → joern_path_id}（用于 vulnerability 关联）。"""

    joern_path_lookup: dict[str, int]


class SummarizeInput(BaseModel):
    scan_id: str
    project_id: int
    mode: str
    agent_findings: list[AgentFindings]


class SummarizeOutput(BaseModel):
    summary: ScanSummary


# ── Activity 8：流量平台回传 + 通知 ──────────────────────────────

class PublishInput(BaseModel):
    scan_run_id: int
    scan_id: str
    project_id: int
    summary: ScanSummary
    services_scanned: list[str]
    files_count: int
    joern_path_lookup: dict[str, int]


class PublishOutput(BaseModel):
    publish_status: dict[str, Any]
    notify_status: dict[str, Any]

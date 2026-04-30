"""扫描请求 / 上下文 / 输出模型。"""
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

ScanMode = Literal["incremental", "full"]


class FullScanRequest(BaseModel):
    """`POST /api/scan/full` 请求体。"""

    project_id: int
    git_ref: str = Field(default="main")


class ScanInput(BaseModel):
    """Workflow 入参。"""

    scan_id: str
    project_id: int
    mode: ScanMode
    git_ref: str = "main"
    mr_iid: Optional[int] = None
    triggered_by_user_id: Optional[str] = None


class ServiceContext(BaseModel):
    """单个微服务的扫描上下文。"""

    service_name: str
    root_path: str
    commit_hash: str
    module_kind: Literal["service", "common", "parent"] = "service"


class ScanContext(BaseModel):
    """
    Activity 5 → Activity 6 之间传递的"按微服务分组"完整上下文。

    Agent 收到的 user message 由两部分组成：
    1. neo4j_context — 调用链 / 数据流 / Source→Sink
    2. file_contents — 关键源文件
    """

    scan_id: str
    project_id: int
    services: list[ServiceContext]
    neo4j_context: dict[str, dict[str, list[dict]]]
    file_contents: dict[str, dict[str, str]]


class ScanRunOut(BaseModel):
    """扫描记录响应。"""

    scan_id: UUID
    project_id: int
    mr_iid: Optional[int]
    mode: str
    git_ref: str
    triggered_by_user_id: Optional[UUID]
    started_at: datetime
    finished_at: Optional[datetime]
    status: str
    files_count: int
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    error_message: Optional[str]

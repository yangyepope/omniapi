"""
aisec 运行时配置。

策略：
- 全部从环境变量读取（pydantic-settings）
- 所有变量带语义清晰的前缀，避免命名冲突
- 默认值面向 docker compose 内部网络（temporal:7233 / neo4j:7687 等）
"""
from functools import cache
from pathlib import Path
from typing import Final

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# 包根目录：用于定位 agents/*.md 与 rules/*.yaml
THIS_DIR: Final = Path(__file__).parent
DEFAULT_AGENTS_DIR: Final = THIS_DIR / "agents"
DEFAULT_RULES_DIR: Final = THIS_DIR / "rules"
DEFAULT_SCHEMA_FILE: Final = THIS_DIR / "db" / "schema.sql"


class AiAuditSettings(BaseSettings):
    """运行时配置 — 详见 .env.example。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    # ── GitLab ────────────────────────────────────────────────────────
    GITLAB_URL: str = Field(default="")
    GITLAB_ACCESS_TOKEN: str = Field(default="")
    GITLAB_WEBHOOK_SECRET: str = Field(default="")

    # ── Anthropic ─────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = Field(default="")
    CLAUDE_MODEL: str = Field(default="claude-opus-4-7")

    # ── 独立审计库 ────────────────────────────────────────────────────
    AI_AUDIT_POSTGRES_DSN: str = Field(
        default="postgresql://aisec:aisec@db:5432/aisec_audit"
    )

    # ── 运行时 ────────────────────────────────────────────────────────
    AI_AUDIT_SOURCE_CACHE_DIR: str = Field(default="/var/cache/aisec")
    AI_AUDIT_AGENT_CONCURRENCY: int = Field(default=7)
    AI_AUDIT_GITLAB_FETCH_CONCURRENCY: int = Field(default=10)

    # ── Neo4j ────────────────────────────────────────────────────────
    NEO4J_URI: str = Field(default="bolt://neo4j:7687")
    NEO4J_USER: str = Field(default="neo4j")
    NEO4J_PASSWORD: str = Field(default="aisecaudit")
    NEO4J_DATABASE: str = Field(default="neo4j")

    # ── Joern Runner ─────────────────────────────────────────────────
    JOERN_RUNNER_URL: str = Field(default="http://joern-runner:8090")
    JOERN_HEAP_SIZE: str = Field(default="4g")
    JOERN_HEARTBEAT_SEC: int = Field(default=60)

    # ── Temporal ─────────────────────────────────────────────────────
    TEMPORAL_HOST: str = Field(default="temporal:7233")
    TEMPORAL_NAMESPACE: str = Field(default="default")
    TEMPORAL_TASK_QUEUE: str = Field(default="aisec")
    WORKFLOW_ID_PREFIX: str = Field(default="scan")

    # ── 流量采集平台对接（HTTP API）─────────────────────────────────
    TRAFFIC_PLATFORM_URL: str = Field(default="")
    TRAFFIC_PLATFORM_TOKEN: str = Field(default="")

    # ── 定时全量扫描 ────────────────────────────────────────────────
    SCHEDULED_SCAN_CRON: str = Field(default="0 2 * * *")
    SCHEDULED_SCAN_PROJECTS: str = Field(default="")

    # ── 通知 ────────────────────────────────────────────────────────
    NOTIFY_FEISHU_WEBHOOK: str = Field(default="")
    NOTIFY_DINGTALK_WEBHOOK: str = Field(default="")
    NOTIFY_EMAIL_TO: str = Field(default="")
    NOTIFY_MIN_SEVERITY: str = Field(default="HIGH")

    # ── Activity 超时（v3.0 §3.3）──────────────────────────────────
    AUDIT_TIMEOUT_SOURCE_SYNC_MIN: int = Field(default=10)
    AUDIT_TIMEOUT_BUILD_CPG_MIN: int = Field(default=60)
    AUDIT_TIMEOUT_STORE_NEO4J_MIN: int = Field(default=15)
    AUDIT_TIMEOUT_DISCOVER_MIN: int = Field(default=5)
    AUDIT_TIMEOUT_QUERY_CHAIN_MIN: int = Field(default=5)
    AUDIT_TIMEOUT_AGENTS_MIN: int = Field(default=30)
    AUDIT_TIMEOUT_PERSIST_MIN: int = Field(default=5)
    AUDIT_TIMEOUT_SUMMARIZE_MIN: int = Field(default=10)
    AUDIT_TIMEOUT_PUBLISH_MIN: int = Field(default=5)


@cache
def get_settings() -> AiAuditSettings:
    return AiAuditSettings()


def source_cache_dir() -> Path:
    p = Path(get_settings().AI_AUDIT_SOURCE_CACHE_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


def scheduled_scan_project_ids() -> list[int]:
    """SCHEDULED_SCAN_PROJECTS 解析为 int 列表，空字符串返回 []。"""
    raw = get_settings().SCHEDULED_SCAN_PROJECTS.strip()
    if not raw:
        return []
    return [int(c) for c in raw.split(",") if c.strip().isdigit()]

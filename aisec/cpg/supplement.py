"""
Activity 2 Step 4：Claude 兜底精读补充节点（v3.0 §2.6）。
"""
import logging
from pathlib import Path
from typing import Literal

from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel

from aisec.config import get_settings

logger = logging.getLogger(__name__)


class SupplementNode(BaseModel):
    type: Literal["sql_sink", "data_source", "feign_boundary", "other"]
    file: str
    method: str
    sql_pattern: str | None = None
    has_injection_risk: bool = False
    note: str = ""


_SYSTEM_PROMPT = """\
你是 Java 安全静态分析专家。

输入是若干特殊模式 Java/XML 文件（含 MyBatis 动态 SQL / JPA @Query / JdbcTemplate /
非标 Feign 接口等）。请识别每个文件中的：
- SQL Sink（拼接型 SQL、动态 SQL、原生 SQL）
- 数据源入口（@RequestParam、@RequestBody、外部 RPC 返回值）
- 跨服务边界（Feign 客户端的 @FeignClient name + 方法签名）

只输出结构化结果（list[SupplementNode]），不要任何额外解释。
"""

PER_FILE_LIMIT = 6_000


async def supplement_special_files(
    file_paths: list[str],
    description: str = "regex_prescanner_hits",
) -> list[SupplementNode]:
    """把多个文件拼成 user message，调一次 Claude 取补充节点。"""
    if not file_paths:
        return []
    s = get_settings()
    if not s.ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY missing, skip Claude supplement")
        return []

    parts: list[str] = ["# 待补充分析的特殊模式文件\n"]
    total = 0
    truncated_at: int | None = None
    for idx, fp in enumerate(file_paths):
        try:
            content = Path(fp).read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        snippet = content[:PER_FILE_LIMIT]
        block = f"## 文件：{fp}\n```\n{snippet}\n```\n"
        if total + len(block) > 180_000:
            truncated_at = idx
            break
        parts.append(block)
        total += len(block)

    if truncated_at is not None:
        parts.append(
            f"（剩余 {len(file_paths) - truncated_at} 个文件因长度限制省略）"
        )

    user_message = "\n".join(parts)
    try:
        model = AnthropicModel(s.CLAUDE_MODEL)
        agent: Agent[None, list[SupplementNode]] = Agent(
            model=model,
            system_prompt=_SYSTEM_PROMPT,
            result_type=list[SupplementNode],
        )
        result = await agent.run(user_message)
        nodes = result.data or []
        logger.info("supplement(%s): files=%d nodes=%d", description, len(file_paths), len(nodes))
        return nodes
    except Exception as exc:  # noqa: BLE001
        logger.warning("supplement failed (%s): %s", description, exc)
        return []

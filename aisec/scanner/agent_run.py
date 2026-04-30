"""
并发运行 10 个安全 Agent（v3.0 §2.5 / §4.6）。

输入由 ScanContext（Neo4j 调用链 + 关键源文件）组成；
每个 Agent 独立调用 Claude（默认 claude-opus-4-7, temperature=0），
通过 PydanticAI 严格输出 list[VulnerabilityResult]。
"""
import asyncio
import json
import logging
from typing import Optional

from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel

from aisec.config import get_settings
from aisec.models.scan import ScanContext
from aisec.models.vulnerability import AgentFindings, VulnerabilityResult
from aisec.scanner.loader import all_agent_names, build_system_prompt

logger = logging.getLogger(__name__)

MAX_USER_MESSAGE_CHARS = 200_000
PER_FILE_CHAR_LIMIT = 10_000


def _build_user_message_v3(context: ScanContext) -> str:
    """v3.0 §2.5 user message：Neo4j 上下文 + 关键源文件。"""
    parts: list[str] = [
        "请基于以下结构化上下文与源码片段执行安全审计，按规则清单逐条核对，输出所有发现的漏洞。",
        "",
        "## Neo4j 结构化上下文（按服务分组的接口调用链 / 数据流）",
        "```json",
        json.dumps(context.neo4j_context, ensure_ascii=False, indent=2)[:80_000],
        "```",
        "",
        "## 关键源文件",
    ]
    total = sum(len(p) for p in parts)
    truncated = False
    for service, files in context.file_contents.items():
        parts.append(f"### 服务：{service}")
        for path, code in files.items():
            snippet = code[:PER_FILE_CHAR_LIMIT] if len(code) > PER_FILE_CHAR_LIMIT else code
            block = f"#### {path}\n```java\n{snippet}\n```\n"
            if total + len(block) > MAX_USER_MESSAGE_CHARS:
                truncated = True
                break
            parts.append(block)
            total += len(block)
        if truncated:
            break
    if truncated:
        parts.append("（上下文过长已截断，请基于已提供内容审计）")
    return "\n".join(parts)


def _build_user_message_legacy(file_map: dict[str, str]) -> str:
    parts = ["请对以下 Java 源文件执行安全审计，按规则清单逐一检查，输出所有发现的漏洞。\n"]
    total = 0
    for path, code in file_map.items():
        snippet = code[:PER_FILE_CHAR_LIMIT] if len(code) > PER_FILE_CHAR_LIMIT else code
        total += len(snippet)
        parts.append(f"### 文件：{path}\n```java\n{snippet}\n```\n")
        if total > MAX_USER_MESSAGE_CHARS:
            parts.append("（文件过多，已截断，请基于已提供内容审计）\n")
            break
    return "\n".join(parts)


async def _run_single_agent(
    agent_name: str,
    user_message: str,
    sem: asyncio.Semaphore,
) -> AgentFindings:
    async with sem:
        try:
            model = AnthropicModel(get_settings().CLAUDE_MODEL)
            system_prompt = build_system_prompt(agent_name)

            agent: Agent[None, list[VulnerabilityResult]] = Agent(
                model=model,
                system_prompt=system_prompt,
                result_type=list[VulnerabilityResult],
            )
            result = await agent.run(user_message)
            findings = result.data or []
            logger.info("agent=%s findings=%d", agent_name, len(findings))
            return AgentFindings(agent_name=agent_name, findings=findings)
        except Exception as exc:  # noqa: BLE001
            logger.exception("agent=%s error=%s", agent_name, exc)
            return AgentFindings(agent_name=agent_name, findings=[])


async def run_all_agents(
    file_map: Optional[dict[str, str]] = None,
    context: Optional[ScanContext] = None,
) -> list[AgentFindings]:
    """
    入口：

    - context 给定时走 v3.0 模式（Neo4j 上下文 + 源码）
    - 否则退化为旧流程（仅源码 file_map）
    """
    if context is not None:
        user_message = _build_user_message_v3(context)
    elif file_map is not None:
        user_message = _build_user_message_legacy(file_map)
    else:
        raise ValueError("run_all_agents requires either context or file_map")

    sem = asyncio.Semaphore(get_settings().AI_AUDIT_AGENT_CONCURRENCY)
    tasks = [_run_single_agent(name, user_message, sem) for name in all_agent_names()]
    return await asyncio.gather(*tasks)

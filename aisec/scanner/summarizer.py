"""
汇总 10 个 Agent 输出（v3.0 §2.7 Activity 7）。

升级点：PydanticAI + ScanSummary 严格模式 — Claude 输出格式不符直接重试。
"""
import json
import logging
from typing import Optional

from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel

from aisec.config import get_settings
from aisec.models.vulnerability import (
    AgentFindings,
    AttackChain,
    ScanSummary,
    VulnerabilityResult,
)

logger = logging.getLogger(__name__)

_SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}

_SUMMARIZE_SYSTEM = """\
你是资深应用安全审计专家。

输入是同一服务内多个安全 Agent 的扫描发现（list[VulnerabilityResult]），
请完成：
1. 去重：相同 (rule_id, endpoint) 仅保留 severity 最高一条
2. 关联：识别可串联利用的攻击链（如 SQL 注入 + 未授权 / SSRF + 敏感信息泄露）
3. 评级：根据组合危害评定 combined_severity (CRITICAL / HIGH / MEDIUM / LOW)

只输出符合 ScanSummary 模型的结构化结果。
"""


def _dedup(all_findings: list[AgentFindings]) -> list[VulnerabilityResult]:
    best: dict[tuple[str, str], VulnerabilityResult] = {}
    for af in all_findings:
        for f in af.findings:
            key = (f.rule_id, f.endpoint)
            existing = best.get(key)
            if existing is None or (
                _SEVERITY_ORDER.get(f.severity, 99)
                < _SEVERITY_ORDER.get(existing.severity, 99)
            ):
                best[key] = f
    return list(best.values())


def _count_by_severity(findings: list[VulnerabilityResult]) -> dict[str, int]:
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1
    return counts


async def _detect_attack_chains_pydantic_ai(
    findings: list[VulnerabilityResult],
) -> list[AttackChain]:
    if not findings:
        return []
    s = get_settings()
    if not s.ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY missing, skip attack chain detection")
        return []

    user_message = (
        "以下是同一服务的安全发现（JSON），请仅输出可串联利用的攻击链：\n"
        + json.dumps([f.model_dump() for f in findings], ensure_ascii=False, indent=2)
    )
    try:
        model = AnthropicModel(s.CLAUDE_MODEL)
        agent: Agent[None, list[AttackChain]] = Agent(
            model=model,
            system_prompt=_SUMMARIZE_SYSTEM,
            result_type=list[AttackChain],
        )
        result = await agent.run(user_message)
        return result.data or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("attack chain detection failed: %s", exc)
        return []


async def summarize(
    scan_id: str,
    project_id: int,
    mode: str,
    all_findings: list[AgentFindings],
    service: Optional[str] = None,  # noqa: ARG001
) -> ScanSummary:
    deduped = _dedup(all_findings)
    attack_chains = await _detect_attack_chains_pydantic_ai(deduped)
    counts = _count_by_severity(deduped)
    return ScanSummary(
        scan_id=scan_id,
        project_id=project_id,
        mode=mode,
        total_findings=len(deduped),
        critical_count=counts["CRITICAL"],
        high_count=counts["HIGH"],
        medium_count=counts["MEDIUM"],
        low_count=counts["LOW"],
        findings=deduped,
        attack_chains=attack_chains,
    )

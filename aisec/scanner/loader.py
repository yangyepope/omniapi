"""
agents/*.md + rules/*.yaml 加载器，组装每个 Agent 的 system prompt（v3.0 §4.4）。
"""
from pathlib import Path

import yaml

from aisec.config import DEFAULT_AGENTS_DIR, DEFAULT_RULES_DIR

# v3.0 §4.3 — 10 个 Agent ↔ 24 个规则文件映射
AGENT_RULE_MAP: dict[str, list[str]] = {
    "access_control":     ["broken_access_control", "iam_lifecycle", "file_security"],
    "crypto_data":        ["cryptographic_failures", "data_privacy", "information_disclosure"],
    "injection":          ["sql_injection", "xss", "injection"],
    "insecure_design":    ["insecure_design", "api_rate_limiting", "thread_context_security"],
    "misconfiguration":   ["security_misconfiguration", "spring_autoconfig_security",
                           "microservice_security", "caching_security", "protocol_security"],
    "auth_failures":      ["auth_failures"],
    "integrity_failures": ["deserialization", "event_driven_security", "third_party_integration"],
    "logging_monitoring": ["logging_failures"],
    "ssrf":               ["ssrf"],
    "ai_llm_security":    ["ai_llm_security"],
}


def _load_agent_role(agent_name: str, agents_dir: Path) -> str:
    f = agents_dir / f"{agent_name}.md"
    if not f.exists():
        return f"# {agent_name}\n\n（角色定义文件缺失，使用占位 prompt。）\n"
    return f.read_text(encoding="utf-8")


def _load_rules_checklist(yaml_names: list[str], rules_dir: Path) -> str:
    lines = ["## 本次必须逐条检查的规则清单"]
    rule_count = 0
    for name in yaml_names:
        path = rules_dir / f"{name}.yaml"
        if not path.exists():
            continue
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        except yaml.YAMLError:
            continue
        rules = data.get("rules", []) if isinstance(data, dict) else data
        for rule in rules or []:
            rid = rule.get("id", "CUSTOM")
            rname = rule.get("name", "")
            hint = rule.get("detection_hint", "")
            severity = rule.get("severity", "")
            lines.append(f"- [{rid}] [{severity}] {rname}：{hint}")
            rule_count += 1
    if rule_count == 0:
        lines.append("（暂无配置的规则，请凭专业知识全面审计。）")
    return "\n".join(lines)


def build_system_prompt(
    agent_name: str,
    agents_dir: Path = DEFAULT_AGENTS_DIR,
    rules_dir: Path = DEFAULT_RULES_DIR,
) -> str:
    """合并 agents/*.md 角色定义 + rules/*.yaml 检查清单。"""
    role = _load_agent_role(agent_name, agents_dir)
    yaml_names = AGENT_RULE_MAP.get(agent_name, [])
    checklist = _load_rules_checklist(yaml_names, rules_dir)
    return (
        f"{role}\n\n"
        f"{checklist}\n\n"
        "检查完规则清单后，结合你的安全知识发现清单之外的潜在风险，一并输出。"
    )


def all_agent_names() -> list[str]:
    return list(AGENT_RULE_MAP.keys())

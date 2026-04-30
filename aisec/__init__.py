"""
aisec — AI 驱动安全渗透测试扫描平台（v3.0）。

模块结构（v3.0 §5）：
    api/        FastAPI 路由（webhook + 手动触发）
    gitlab/     GitLab API 封装
    scanner/    扫描编排
    cpg/        Joern + Neo4j + 调用链
    agents/     Agent 角色定义（10 个 md）
    rules/      检测规则（24 个 yaml，397 条）
    models/     Pydantic 数据模型
    db/         aisec_audit 库 + 流量平台回传（HTTP）
    temporal/   Workflow / Activity / Worker / Scheduler / Cancel
    notify/     飞书 / 钉钉 / 邮件
    scripts/    离线辅助脚本
"""

__version__ = "0.1.0"

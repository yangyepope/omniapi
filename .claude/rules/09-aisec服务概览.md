---
paths:
  - "aisec/**"
---

# 09-aisec 服务概览(命令、结构与特有规则)

## 定位
独立 AI 渗透扫描服务:GitLab Webhook → CPG 静态分析 → Neo4j → Claude 语义审计 → 回传主平台。
FastAPI + Temporal + 独立 `aisec_audit` 库(主 PG 上),uv 管依赖。
**当前仅代码骨架、不可投产**(agents/rules 为占位;joern-runner 已于 2026-07-06 移除,CPG 链路不可用)。

## 常用命令
- 本地起 API: `uv run uvicorn aisec.main:app --port 8000`
- 容器方式: `docker compose up -d aisec-api`(依赖 aisec-prestart 建库)
- 初始化表结构: `uv run python init_db.py`

## 特有规则(通用后端规则见 02/04/06,paths 已覆盖本目录)
- **Temporal Worker/Activity 视同 Celery Task**:读后写加 `.with_for_update()`,创建走 Upsert 捕获 IntegrityError,必须幂等(同一 workflow 重放结果相同)
- 扫描结论回传主平台失败时只记录不阻断(设计约定:不阻断 MR 合并)
- 补齐 `agents/*.md`(10 角色)、`rules/*.yaml`(397 条)之前,禁在文档/回复中宣称可投产

## 目录结构
- `api/`       webhook + 手动触发 + 查询接口
- `models/`    scan / vulnerability 模型
- `scanner/`   扫描编排
- `cpg/`       CPG 解析(joern-runner 已移除,当前不可用)
- `agents/`    10 个审计角色定义(待补)
- `rules/`     397 条审计规则 yaml(待补)
- `temporal/`  Temporal 工作流与 Worker
- `db/`        DB 会话与建库

# aisec · AI 驱动安全渗透测试扫描平台

> v3.0 实现 — 与 omniapi 平级的独立服务

---

## 🚨 当前版本不可投产

本项目目前**只完成代码骨架**，三件大事未做，必须按下表补齐后才能上线：

| 🔴 | 待补 | 现状 |
|----|------|------|
| 🔴 | `agents/*.md` 10 个角色定义 | 22 行通用占位描述 |
| 🔴 | `rules/*.yaml` 24 个共 397 条规则 | 全部 `rules: []` 空列表 |
| 🔴 | `joern-runner/scripts/extract_cpg.sc` 流分析 | 仅导出基础节点，`paths` 字段返回 `[]` |
| 🟡 | 端到端启动验证 | Joern / Neo4j / Temporal 未拉起，未联调 |

详见仓库根 [`document/20260430_AI驱动安全渗透测试集成_合并方案.md`](../document/20260430_AI驱动安全渗透测试集成_合并方案.md) 文首"⚠️ 重大遗留"章节。

---

## 一句话

监听 GitLab Webhook（MR / push），对 Java 微服务做 Joern CPG 静态分析 + Claude 语义审计 +
Neo4j 调用链查询 + 攻击链推断，扫描结论回传到 omniapi 流量采集平台。

不阻断合并，结果只记录。

---

## 架构

```
GitLab ─(Webhook)─► aisec-api ─(Temporal)─► aisec-worker
                                                    │
                                       ┌────────────┼────────────┐
                                       ▼            ▼            ▼
                                   joern-runner   neo4j      aisec_audit DB
                                       │
                                       └────► omniapi backend (HTTP)
                                                  ↓
                                           流量采集平台 UI
```

详见 [`document/20260430_AI驱动安全渗透测试集成_合并方案.md`](../document/20260430_AI驱动安全渗透测试集成_合并方案.md)。

---

## 目录

```
aisec/                            ← 项目根 = Python 包根（扁平布局）
├── Dockerfile
├── .dockerignore
├── pyproject.toml
├── .env.example
├── README.md
├── __init__.py                   # Python 包入口
├── main.py                       # FastAPI 入口
├── config.py                     # pydantic-settings
├── call_chain_resolver.py        # MyBatis XML / JPA / Feign 解析
├── init_db.py                    # 创建 aisec_audit 库 + schema
├── api/                          # webhook + 手动触发
├── gitlab/                       # GitLab API 封装
├── scanner/                      # 扫描编排（sync → cpg → agent → summarize → store）
├── cpg/                          # Joern + Neo4j + 调用链
├── agents/                       # 10 个 Agent 角色定义
├── rules/                        # 24 个 yaml 规则清单（397 条）
├── models/                       # Pydantic
├── db/                           # aisec_audit 库 + 流量平台回传
├── temporal/                     # Workflow / Activity / Worker / Scheduler
├── notify/                       # 飞书 / 钉钉 / 邮件
├── scripts/                      # 离线辅助
└── tests/                        # pytest（不入镜像）
```

---

## 本地启动

```bash
# 1. 启动依赖
docker compose up -d db redis temporal neo4j joern-runner

# 2. 初始化 aisec_audit 库
docker compose run --rm aisec-api python -m aisec.init_db

# 3. 启动 aisec
docker compose up -d aisec-api aisec-worker
```

---

## 配置

复制 `.env.example` 为 `.env` 后填写。所有变量也可以通过 `omniapi/.env` 注入（compose 共享）。

| 关键变量 | 说明 |
|---------|------|
| `GITLAB_URL` / `GITLAB_ACCESS_TOKEN` | GitLab 接入 |
| `GITLAB_WEBHOOK_SECRET` | Webhook 来源校验 |
| `ANTHROPIC_API_KEY` / `CLAUDE_MODEL` | Claude API |
| `AI_AUDIT_POSTGRES_DSN` | 独立 aisec_audit 库 DSN |
| `NEO4J_URI` | CPG 持久化 |
| `JOERN_RUNNER_URL` | joern-runner 地址 |
| `TRAFFIC_PLATFORM_URL` | 回传到 omniapi backend 的基地址 |
| `TRAFFIC_PLATFORM_TOKEN` | omniapi backend 内部 API Token |
| `SCHEDULED_SCAN_CRON` | Temporal Schedule cron |

详见 `.env.example`。

---

## API

| Method | Path | 用途 |
|--------|------|------|
| POST | `/api/webhook` | GitLab Webhook |
| POST | `/api/scan/full` | 手动触发全量扫描 |
| GET | `/api/scans` | 扫描列表 |
| GET | `/api/scans/{scan_id}` | 扫描详情 |
| GET | `/api/scans/{scan_id}/findings` | 漏洞列表 |
| GET | `/api/scans/{scan_id}/attack-chains` | 攻击链 |
| GET | `/api/scans/{scan_id}/joern-paths` | Joern 静态分析路径 |
| GET | `/api/scans/{scan_id}/services` | 本次扫描覆盖的微服务 |
| GET | `/api/scans/{scan_id}/modules` | 模块识别结果 |
| POST | `/api/scans/{scan_id}/cancel` | 取消正在运行的扫描 |
| GET | `/api/health` | 健康检查 |

---

## 资源说明

- `agents/*.md`：每个 Agent 的角色定义（system prompt 上半段）
- `rules/*.yaml`：检测规则（system prompt 下半段，运行时合并）
- 新增规则只编辑对应 YAML 即可，不改代码

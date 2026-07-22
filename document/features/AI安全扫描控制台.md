# AI 安全扫描控制台（gitlab-scan 前端）

- **创建日期**: 2026-07-06
- **状态**: 已上线
- **关联变更**: [FEAT-001](../changelog/FEAT-001-前端拆分AI安全与流量劫持并补全扫描任务.md)

> 每个功能一份,长期维护。功能优化 / 修改时**更新本文档**并在文末《修改记录》追加一行,不新建文档。

## 需求背景

把前端「AI 安全（gitlab-scan）」与「流量劫持（流量采集/重放）」两个领域在导航上彻底分开，并把 gitlab-scan 的能力做完整：可**触发扫描**（带反馈）、可**查看全部服务的扫描任务与执行状态**。gitlab-scan 是外部 gitlab-scanner 服务，backend 以 `/api/v1/security/*` 代理其 `/api/admin/*`；前端只对接 backend 代理，从不直连 scanner（`SCANNER_ADMIN_TOKEN` 只在 backend 持有）。

## 数据结构 · 数据库设计

无（本功能不落库；数据全部来自外部 gitlab-scanner，经 backend 代理透传/聚合）。任务对象形状见前端 `ScanRun` 类型（`frontend/src/security/api.ts`）：`id / service_name / sha / started_at / finished_at / status(running|completed|failed|aborted) / engines_completed / resume_count`。

## 配置项

无新增。沿用既有 `SCANNER_BASE_URL`、`SCANNER_ADMIN_TOKEN`（`backend/app/core/config.py` + 根 `.env`）。

## 接口列表

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/security/scan-runs?limit_per_service=&status=` | **新增**。全局扫描任务总览：服务端并发聚合所有服务的 scan-runs，注入 `service_name`，按 started_at 倒序，可按状态过滤 |
| GET | `/api/v1/security/services/{name}/scan-runs?limit=` | 既有。单服务扫描历史 |
| POST | `/api/v1/security/services/{name}/scan?ref=&sha=` | 既有。触发一次按需扫描，返回 `{task_id, service, sha, accepted}` |
| GET | `/api/v1/security/services` | 既有。服务清单（含 open/closed 计数、最近扫描状态） |

前端消费层（`frontend/src/security/api.ts` / `hooks.ts`）：`allScanRuns` / `useAllScanRuns`、`scanRuns` / `useScanRuns`、`triggerScan`、`services` / `useServiceList`。

## 与其他模块的交互

- **依赖**：外部 gitlab-scanner（经 backend `ScannerClient` 代理）。
- **失败降级行为**：
  - 聚合端点先取服务清单，这一跳失败（scanner 不可达/鉴权错）由 `_call_scanner` 映射为 502/503/504 透传给前端，任务页显示「加载任务失败」错误态。
  - 聚合中**单个服务**的 scan-runs 拉取失败：记 warning 后跳过该服务，其余服务照常展示（`return_exceptions=True`），不整体报错。
  - 触发扫描失败：`TriggerScanButton` 弹 sonner error（含 scanner detail），不再静默。

## 影响范围

- 前端：`components/layout/Sidebar.tsx`（分组）、`security/api.ts`、`security/hooks.ts`、`routes/_layout/security/scans.tsx`（复用触发按钮）；新增 `routes/_layout/security/tasks.tsx`、`components/security/TriggerScanButton.tsx`。
- 后端：`api/routes/security.py` 增一个只读聚合路由（无模型/迁移/DB 写）。
- 不触碰 aisec 服务、流量采集/重放链路、compose 配置。

## 验证方式

见 FEAT-001《验证方式》：后端聚合端点与触发端点已用真实接口验证（200 + 数据正确 + 新任务可见）；前端 tsc/build 通过、route tree 含 `/security/tasks`。

## 修改记录

| 日期 | 变更 | 关联 changelog |
|---|---|---|
| 2026-07-06 | 首版：侧边栏分组、扫描任务页、可复用触发按钮、后端聚合端点 | [FEAT-001](../changelog/FEAT-001-前端拆分AI安全与流量劫持并补全扫描任务.md) |
| 2026-07-08 | 修复大屏「开放问题」恒为 0:改读 `by_status.open`(scanner /stats 无 `open_findings` 字段),删前端 `Stats` 幽灵字段 | [FIX-012](../changelog/FIX-012-安全大屏开放问题恒为0.md) |
| 2026-07-08 | finding/服务详情"返回大屏"改"返回":`useCanGoBack()`+`history.back()` 回上一步,无历史才兜底回大屏(禁 `<Link>` 写死目标) | [FIX-013](../changelog/FIX-013-返回按钮硬编码跳大屏.md) |
| 2026-07-10 | IA 重组为 6 大区(总览/发现/服务/扫描/项目管理/全局配置):侧边栏 11→6;含多子块的区用页内 Tab 枢纽(`HubTabs` 原语 + `ScanHubTabs`/`SettingsHubTabs` 挂兄弟路由,保留各页 search 状态);服务详情补「接口」「业务知识」两 Tab(抽 `ServiceInterfacesPanel`、复用 `KnowledgePanel`)、新增服务清单页、大屏补成本概览;旧 `scans`/`knowledge` 路由重定向、interface 返回改历史驱动 | [FEAT-013](../changelog/FEAT-013-安全控制台IA重组为6大区.md) |

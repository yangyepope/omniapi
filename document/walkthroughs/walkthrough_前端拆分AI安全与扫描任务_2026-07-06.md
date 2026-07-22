# Walkthrough — 前端拆分「AI 安全 / 流量劫持」+ 补全 gitlab-scan 扫描任务 [2026-07-06 16:21:50]

跨服务改动（backend + frontend），故落根 `document/walkthroughs/`。关联 [FEAT-001](../changelog/FEAT-001-前端拆分AI安全与流量劫持并补全扫描任务.md)、功能文档 [AI安全扫描控制台](../features/AI安全扫描控制台.md)。

## 操作描述

1. 探明架构：确认仓库有两套扫描后端——(A) 外部 gitlab-scanner（backend `/security/*` 代理 `/api/admin/*`），(B) aisec 独立服务（Temporal/CPG/webhook，前端无界面）。经确认：`gitlab-scan`=A，`ai-security`=前端新分区，不动 B；侧边栏同栏分两组。
2. 定位「触发扫描没实现」根因：`scans.tsx` 按钮已接 `triggerScan`，但 mutation 无 `onError`/无 sonner/点完无处观察 → 静默失败；且无跨服务任务总览页。
3. 后端补聚合端点、前端补 API/hook、抽可复用触发按钮、新建任务页、侧边栏分组。
4. 实测验证 + 文档沉淀。

## 改动详情

### 后端
- `backend/app/api/routes/security.py`：`import asyncio`；新增 `GET /security/scan-runs`（`list_all_scan_runs`）——`asyncio.gather` 并发拉各服务 scan-runs，注入 `service_name`，倒序合并，`?status=` 过滤，单服务失败跳过（`return_exceptions=True`），复用 `_call_scanner`。

### 前端
- `frontend/src/security/api.ts`：新增 `allScanRuns(opts)` + 复用型 `scannerErrorDetail(err)`。
- `frontend/src/security/hooks.ts`：新增 `useAllScanRuns(opts)`（30s 心跳，status 进 query key）。
- `frontend/src/components/security/TriggerScanButton.tsx`（新增）：`useMutation(triggerScan)` + sonner 成功/失败 + 失效 `["security","scan-runs"]`/`["security","services"]`。
- `frontend/src/routes/_layout/security/scans.tsx`：`InterfacePanel` 复用 `TriggerScanButton`，删原地 mutation 与孤儿 import（`useMutation`/`useQueryClient`/`SecurityApi`/`RefreshCcw`）。
- `frontend/src/routes/_layout/security/tasks.tsx`（新增 `/security/tasks`）：跨服务任务总览表 + 服务/状态筛选进 search params + 四态 + 顶部触发入口。
- `frontend/src/components/layout/Sidebar.tsx`：`navItems`→`navGroups`（AI 安全 / 流量劫持 带标题分组），AI 安全组加「扫描任务」。
- `frontend/src/routeTree.gen.ts`：插件自动重生成含 `/security/tasks`（非手改）。

## 验证结果

- [x] 后端 `GET /security/scan-runs?limit_per_service=5` → 200，多服务合并、含 `service_name`、started_at 倒序；`?status=running` → 200 过滤生效。
- [x] 触发路径 `POST /security/services/aam-parent/scan?ref=main` → 200 `{accepted:true,...}`；随后聚合 `?status=running` 出现新任务 id 23。
- [x] `bunx tsc --noEmit` 0 error；`bunx vite build` 成功（仅既有大 chunk 警告）。
- [x] Biome 改动文件仅剩 3 条**既有** `href="#"` 占位告警（未改动的页脚区），新增代码 0 违例。
- [x] 后端 `ruff check` 仅 16 条**既有** `ARG001 current_user`（全文件统一的鉴权 DI 模式），无新增违例；`py_compile` 通过。
- [ ] 待跑：宿主 `bun run dev` 浏览器点验（dev server 未起，已用生产构建 + 后端实打接口覆盖核心链路）。

## 备注

- `backend/app/api/deps.py:57` 有「开发环境临时跳过鉴权」，故 `/security/*` 无 token 也 200——既有 dev 配置，与本次无关。
- 未触碰 aisec 服务、流量采集/重放链路、compose 配置。

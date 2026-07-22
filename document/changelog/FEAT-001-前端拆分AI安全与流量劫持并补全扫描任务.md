# FEAT-001 前端拆分「AI 安全」与「流量劫持」+ 补全 gitlab-scan 扫描任务能力

- **编号**: FEAT-001
- **日期**: 2026-07-06
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 无

## 需求背景

前端原本是一个**扁平侧边栏**（`frontend/src/components/layout/Sidebar.tsx`），把两套毫不相干的领域混在一起：

- **AI 安全 / gitlab-scan 类**：安全大屏、扫描管理、扫描成本、扫描配置——走 backend `/api/v1/security/*`，backend 再 HTTP 代理到外部 **gitlab-scanner**（`SCANNER_BASE_URL` 的 `/api/admin/*`）。
- **流量劫持 / 流量采集类**：服务管理、业务配置、重放。

用户诉求：
1. 前端把「AI 安全」和「流量劫持」分开，不要混在一个扁平列表（同一侧边栏两个带标题分组）。
2. 在「AI 安全」区把 gitlab-scan 能力做完整：**触发扫描要真正可用**（原先点了没反应），并能**查看 gitlab-scan 全部任务及其执行状态**。

**根因（触发扫描「没实现」的真相）**：`scans.tsx` 的「触发扫描」按钮其实已接 `SecurityApi.triggerScan`，但 mutation **没有 `onError`、没有 sonner 反馈、点完无处观察任务执行**——成功/失败都静默，用户感知为「没实现」。同时**没有跨服务的任务总览页**，只能在扫描管理页看到当前服务最近一条 run 的状态徽章。

范围界定：`gitlab-scan` = 外部 gitlab-scanner（经 backend 代理）；`ai-security` = 前端新分区，对接现有 `/security/*` 代理。**不动 aisec 独立服务**（Temporal/CPG/webhook，另一套）。

## 讨论过程

无（范围经确认：gitlab-scan=外部 scanner；ai-security=前端分区；侧边栏同栏两组）。

## 技术实现

### 后端
- `backend/app/api/routes/security.py`：新增 `GET /security/scan-runs`（`list_all_scan_runs`）。外部 scanner 只暴露 per-service 的 scan-runs，无全局任务接口，故在服务端用 `asyncio.gather` 并发拉取所有服务的历史再合并：每条 run 防御性注入 `service_name`、按 `started_at` 倒序、支持 `?status=` 过滤；单个服务失败（`return_exceptions=True`）只跳过不拖垮整体。复用既有 `_call_scanner` 错误映射；`async def` 全程 `await`，不碰同步 Session。
- 触发端点 `POST /security/services/{name}/scan` 已存在，**未改**。

### 前端
- `frontend/src/security/api.ts`：新增 `allScanRuns(opts)` → `GET /security/scan-runs`；新增复用型错误提取 `scannerErrorDetail`（security 目录走裸 axios，不能用 `utils.ts` 的 `handleError`）。
- `frontend/src/security/hooks.ts`：新增 `useAllScanRuns(opts)`，30s 心跳，`status` 进 query key。
- `frontend/src/components/security/TriggerScanButton.tsx`（新增，可复用）：内部 `useMutation(triggerScan)`，`onSuccess` sonner + 失效 `["security","scan-runs"]` 与 `["security","services"]`，`onError` 弹 scanner detail——**修掉原先的静默失败**。
- `frontend/src/routes/_layout/security/scans.tsx`：`InterfacePanel` 改为复用 `TriggerScanButton`，删除原地 mutation 及因替换产生的孤儿 import（`useMutation`/`useQueryClient`/`SecurityApi`/`RefreshCcw`）。
- `frontend/src/routes/_layout/security/tasks.tsx`（新增页 `/security/tasks`）：跨服务扫描任务总览表（服务/状态/SHA/开始时间/耗时/已完成引擎/resume）；服务+状态筛选进路由 `search` params；四态齐全；顶部选服务直接触发扫描；30s 自动刷新。
- `frontend/src/components/layout/Sidebar.tsx`：`navItems` 重构为分组结构 `navGroups`，渲染带标题分组——**AI 安全**（安全大屏/扫描管理/扫描任务/扫描成本/扫描配置）与**流量劫持**（服务管理/业务配置），通用项（仪表面板/系统设置）置无标题组。
- `frontend/src/routeTree.gen.ts`：TanStack 插件自动重生成，纳入 `/security/tasks`（非手改）。

功能文档见 `document/features/AI安全扫描控制台.md`。

## 验证方式

- [x] 后端聚合端点：`GET /api/v1/security/scan-runs?limit_per_service=5` → 200，返回多服务合并任务、含 `service_name`、按 started_at 倒序（id 22 running 排首）；`?status=running` → 200 过滤生效。
- [x] 触发扫描（按钮实际调用路径）：`POST /api/v1/security/services/aam-parent/scan?ref=main` → 200 `{accepted:true, task_id, sha}`；随后 `?status=running` 聚合列表出现新任务（id 23, sha manual-2026070608...）。
- [x] 前端 `bunx tsc --noEmit` → 0 error；`bunx vite build` → 构建成功（仅既有大 chunk 警告），route tree 含 `/security/tasks`。
- [x] Biome：改动/新增 6 个文件仅剩 3 条**既有** `href="#"` 占位链接告警（位于未改动的页脚区），本次新增代码 0 违例。
- [ ] 待跑：起 `bun run dev` 浏览器点验侧边栏两组标题、任务页四态、触发后 toast + running 任务出现（宿主未起 dev server，已用生产构建 + 后端实打接口覆盖）。

> 备注：本环境 `backend/app/api/deps.py:57` 的 `get_current_user` 有「开发环境临时跳过鉴权」，故所有 `/security/*` 无 token 也 200——属**既有 dev 配置**，与本次改动无关。

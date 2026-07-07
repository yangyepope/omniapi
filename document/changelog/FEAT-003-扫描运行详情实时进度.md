# FEAT-003 扫描运行详情 / 当前步骤实时进度

- **编号**: FEAT-003
- **日期**: 2026-07-06
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 跨仓库(gitlab-scanner FEAT-011 提供数据源)

## 需求背景

控制台点服务名进服务详情页,原来只有扫描历史列表(状态/sha/耗时/已完成引擎标签),看不到「当前扫描进行到哪一步、每个引擎跑得怎样、是否还活着」。需求:点服务名能看到详细扫描信息 + 过程信息 + 当前扫描详情。

## 讨论过程

与用户确认:①过程信息用「聚合现有数据 + 显式当前步骤标记」(不做实时日志流);②前端轮询详情接口,running 时加快;③三层都做。数据流:平台是纯代理,前端 → 平台 `/api/v1/security/*` → `ScannerClient` → scanner `/api/admin/*`,不落本地库。当前步骤标记落在 scanner 侧(见 gitlab-scanner FEAT-011:`scan_runs.current_stage` + 阶段边界打点 + `GET /api/admin/services/{name}/scan-runs/{run_id}` 详情接口)。

## 技术实现

**后端代理**(`backend/app/`):
- `services/scanner_client.py`:新增 `get_scan_run(service_name, run_id)` → scanner `GET /api/admin/services/{name}/scan-runs/{run_id}`。
- `api/routes/security.py`:新增 `GET /security/services/{name}/scan-runs/{run_id}`(`CurrentUser` + `_call_scanner`),透传详情 dict。

**前端**(`frontend/src/`):
- `security/api.ts`:`ScanRun` 加 `current_stage?`/`last_heartbeat?`;新增 `EngineRun`、`ScanRunDetail` 类型 + `scanRunDetail(name, id)` 方法。
- `security/hooks.ts`:`useScanRunDetail(name, id, live)`,动态 `refetchInterval: live ? 4000 : false`(running 时 4s 轮询,结束即停)。
- `components/security/theme.ts`:`STAGE_ORDER` / `STAGE_META` / `PHASE_KEY_FOR_STAGE` + `stageLabel` / `stageSlot`(`engine:X` → 「执行引擎 X」)。
- `security/ScanRunDetailPanel.tsx`(新):头部(状态/sha/耗时/resume/存活「最后活动 Xs 前」)+ 阶段进度条(已完成✓/当前⟳/待执行,带完成时间戳)+ 逐引擎表。
- `routes/_layout/security/services/$name.tsx`:`ScanHistoryTab` 顶部对 running 的最新 run 常驻实时面板;每张历史卡片可点击展开同一面板(复用,已完成 run 不快轮询)。
- `routes/_layout/security/tasks.tsx`:任务总览行内服务名做成 `<Link>` 下钻服务详情。

## 验证方式

- [x] `tsc --noEmit` + `vite build` 通过。
- [x] 平台代理活体:`curl http://localhost:8000/api/v1/security/services/aam-parent/scan-runs/25` 返回聚合详情 JSON(current_stage/by_engine/seconds_since_heartbeat 字段就位)。
- [ ] 端到端(需一次真实运行中的扫描):点服务名 → 「当前扫描 · 实时进度」面板阶段随扫描推进、逐引擎表填充、心跳跳动;扫完转终态、停快轮询。

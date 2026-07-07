# 扫描运行详情 / 实时进度(点服务名看当前扫描过程)[2026-07-06 15:20:00]

跨仓库功能:gitlab-scanner(数据源)+ security-platform(代理 + 前端)。scanner 侧记录见该仓库 `docs/changelog/FEAT-011`;本仓库改动见 `document/changelog/FEAT-003`。

## 操作

- [x] 摸清数据流:平台纯代理,前端 → `/api/v1/security/*` → `ScannerClient` → scanner `/api/admin/*`,不落本地库。
- [x] scanner 侧(另一仓库)加 `scan_runs.current_stage` 列 + 阶段边界打点 + `GET /api/admin/services/{name}/scan-runs/{run_id}` 详情接口(FEAT-011)。
- [x] 本仓库后端 + 前端接入并联调。

## 改动(本仓库)

- [x] `backend/app/services/scanner_client.py`:`get_scan_run(service_name, run_id)`。
- [x] `backend/app/api/routes/security.py`:`GET /security/services/{name}/scan-runs/{run_id}`(CurrentUser + `_call_scanner`)。
- [x] `frontend/src/security/api.ts`:`ScanRun` 加 `current_stage?/last_heartbeat?`;新增 `EngineRun`/`ScanRunDetail` + `scanRunDetail(name,id)`。
- [x] `frontend/src/security/hooks.ts`:`useScanRunDetail(name,id,live)`,`refetchInterval: live?4000:false`。
- [x] `frontend/src/components/security/theme.ts`:`STAGE_ORDER/STAGE_META/PHASE_KEY_FOR_STAGE` + `stageLabel/stageSlot`。
- [x] `frontend/src/security/ScanRunDetailPanel.tsx`(新):头部 + 阶段进度条 + 逐引擎表。
- [x] `frontend/src/routes/_layout/security/services/$name.tsx`:running 顶部常驻实时面板 + 历史卡片可展开同面板。
- [x] `frontend/src/routes/_layout/security/tasks.tsx`:服务名做成下钻 `<Link>`。

## 验证

- [x] 前端 `tsc --noEmit` + `vite build` 通过;biome 格式化。
- [x] 后端(dev `--reload`)OpenAPI 出现 `/api/v1/security/services/{name}/scan-runs/{run_id}`;`curl .../scan-runs/25` 经平台代理返回 scanner 聚合详情(current_stage/by_engine/seconds_since_heartbeat 就位)。
- [ ] 端到端「阶段随扫描推进」需一次真实运行中的扫描,待触发观测。

# FEAT-017 DAST 动态扫描前端对接

- **编号**: FEAT-017
- **日期**: 2026-07-17
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 无(配套 scanner FEAT-033~036)

## 需求背景

scanner 侧已落地 DAST(带外动态扫描:授权 scope 门 / nuclei / ZAP,FEAT-033~036),
后端暴露 `GET /admin/services/{name}/dast-runs`、`POST /admin/services/{name}/dast-scan`。
但 security-platform 的代理层(`/api/v1/security/*`)与前端**从未对接**——排查"页面
空"时确认:代理层 0 个 dast 端点、前端源码 0 处 dast 引用,是 scanner 能力里唯一没
同步到控制台的一块。本次补齐读+触发两条路径,让操作员能在服务详情页看 DAST 历史并触发。

## 技术实现

改动定位(全部 mirror 既有 scan-runs / trigger-scan 模式,零新范式):

**后端代理层**
- `backend/app/services/scanner_client.py`:加 `list_dast_runs(service_name, *, project, limit)`
  转发 `GET /api/admin/services/{name}/dast-runs`;`trigger_dast_scan(service_name, *, project)`
  转发 `POST /api/admin/services/{name}/dast-scan`(project 作 query,与 scanner 端签名一致)。
- `backend/app/api/routes/security.py`:加 `GET /services/{name}/dast-runs`(只读)+
  `POST /services/{name}/dast-scan`(变更动作 → inactive 用户拒绝;授权范围由 scanner
  scope 门二次把关)。

**前端**
- `frontend/src/security/api.ts`:加 `DastRun` / `DastRunEngine` / `DastRunList` 类型 +
  `SecurityApi.dastRuns` / `triggerDast`。
- `frontend/src/security/hooks.ts`:加 `useDastRuns`(REFRESH_MS 心跳刷新看 running 推进)。
- `frontend/src/routes/_layout/security/services/$name.tsx`:服务详情页加「DAST」tab
  (`DastTab`):列表展示 run 状态(running/completed/failed/skipped 四态配色)、目标 URL、
  命中数、逐引擎 chip、skipped 显式展示 skip_reason;「触发 DAST」按钮走 `ConfirmDialog`
  二次确认(DAST 主动向目标发包)。project 取自 `svc.project` 用于同名跨项目消歧。

**无 DB 变更**:平台侧纯透传,DAST 数据存于 scanner。

**顺带(同一次"为什么页面空"排查)**:`frontend/src/security/SecurityDashboard.tsx`
加空项目提示——当前项目 `total_findings==0` 且 `last_scan_at==null`(从未扫描)时,
顶部渲染琥珀色 banner 明确"这是没数据不是故障,请切项目 / 触发扫描"。根因:存量新
导入的项目(如 `iam-middleground`,18 服务但 0 findings)选中后满屏空态,易被误当 bug。

## 验证方式

- [x] `bunx tsc -p tsconfig.build.json --noEmit` → 0 error;`biome check` 通过(修 import 序)。
- [x] 后端容器内 `ScannerClient().list_dast_runs('aam-parent', project='aigs-middleground')`
  → 转发成功 `total=0`(尚无 run)。
- [x] 经 dev server 打新代理路由 `GET /api/v1/security/services/aam-parent/dast-runs`
  → HTTP 200,结构 `{total, items}` 正确。
- [ ] 触发路径(`POST .../dast-scan`)结构与已验证的 trigger-scan 一致,但未在 prod 实发
  (DAST 主动打目标,待确认后再实测;DAST_ENABLED=false 时会落一条 skipped run)。

## 影响范围 / 降级

- 读路径只增不改,不影响既有页面。
- 触发是变更动作:inactive 用户前端拦 + 后端 403;越权目标由 scanner 落 skipped(带原因),
  前端如实展示,不当失败也不藏。
- DAST 无数据时(scanner `DAST_ENABLED=false` 或目标不在 `DAST_SCOPE_ALLOWLIST`),
  DastTab 显示明确空态说明,不是页面故障。

# 同步 scanner 心跳修复的 timed_out 扫描状态 [2026-07-06 18:21:18]

## 背景
gitlab-scanner 侧完成 FEAT-010 心跳修复:后台 sweeper(`scan_resume.py:sweep_stale_runs` +
`main.py` 定时任务)会把**无心跳的僵尸 running 扫描**收敛为新状态 `timed_out`,并经
`/api/v1/admin/services/{name}/scan-runs` 的 `ScanRunItem.status` 原样返回。
本平台是 scanner 的展示端(后端纯透传 `dict[str, Any]`),需同步这个新枚举值,
否则前端会把 `timed_out` fallback 成灰色"已中止",语义错误。

## 操作
- [x] 阅读 gitlab-scanner 侧改动,确认新状态字符串为 `timed_out`(非 timeout/stale)
- [x] 确认 admin 响应仅新增 `status` 取值(及未被本侧使用的 `phases_completed`),
      `last_heartbeat` 未对外暴露 → 无新字段需要处理
- [x] 前端补齐 `timed_out` 状态(类型 + 渲染映射)

## 改动详情
- `frontend/src/security/api.ts` — `ScanRun.status` union 增加 `"timed_out"`
- `frontend/src/components/security/theme.ts` — `SCAN_STATUS_META` 新增 `timed_out` 项
  (label「已超时」,琥珀色 `#d97706`,区分红色 failed / 灰色 aborted)
- 后端 **无改动**:`security.py` 的 `/scan-runs` 与 `scanner_client.py` 均为透传,
  `status_filter` 是自由字符串,天然支持按 `timed_out` 过滤
- 联动:tasks 页状态筛选下拉(`tasks.tsx:92` 遍历 `SCAN_STATUS_META` 生成)与
  `ScanStatusBadge` 均数据驱动,加映射后自动补上该选项与徽章,无需额外改动

## 验证结果
- [x] `bunx biome check` 仅扫描改动两文件:No fixes、无报错(仓库其余 103 存量报错与本次无关)
- [x] `bunx tsc --noEmit`:0 error TS —— union 拓宽未打破任何穷举(全站均为 `=== "running"`
      判断或 fallback,无 exhaustive switch)
- [ ] 端到端行为:需 scanner 侧实际产生一条 `timed_out` run 才能在 UI 观察徽章/筛选,
      本次未构造真实僵尸 run;因映射为纯数据驱动,类型+lint 已覆盖展示正确性

## 关联
- 上游:gitlab-scanner FEAT-010(心跳 sweeper)
- 契约耦合点:本侧手维护的 `ScanRun` 类型(非 hey-api 生成,因 scanner 为外部服务)

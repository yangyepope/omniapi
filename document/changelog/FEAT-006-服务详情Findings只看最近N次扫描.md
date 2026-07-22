# FEAT-006 服务详情 Findings 只看最近 N 次扫描

- **编号**: FEAT-006
- **日期**: 2026-07-07
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 无（下游 gitlab-scanner FEAT-013）

## 需求背景

服务详情页 Findings 标签拉取该服务**全量历史** findings(scanner findings 走 dedup upsert
跨扫描累积、从不删除),旧问题永远堆在列表里。用户诉求:只看**最近 3 次扫描**的结果。

## 讨论过程

- 根本能力缺在下游 gitlab-scanner(findings 与 scan_run 无关联),由其新增
  `last_seen_scan_run_id` + `/admin/findings?recent_runs=N`(见 gitlab-scanner FEAT-013)。
  本仓只做**代理透传 + 前端接入**。
- 「最近 N 次」口径:按「真正产出过 finding 的扫描」计名额,失败/空扫不占位(下游实现)。
- 左侧「问题计数」卡片保持**全量**,不随 Findings 列表限定(与用户确认)——卡片来自
  `list_services` 的 open/closed 计数,不改。

## 技术实现

- 代理层 `backend/app/services/scanner_client.py`：`list_findings` 增 `recent_runs` 参数并转发。
- 路由 `backend/app/api/routes/security.py`：`GET /security/findings` 增 `recent_runs` Query，透传给 client。
- 前端 `frontend/src/security/api.ts`：`SecurityApi.listFindings` opts 增 `recent_runs?: number`。
- 前端 `frontend/src/security/hooks.ts`：`useServiceFindings` 传 `recent_runs=RECENT_SCAN_RUNS`
  (常量=3,不散落魔法数),并纳入 queryKey。
- 全局 `/security/findings` 主列表不传 `recent_runs`，行为不变。

## 验证方式

- [x] scanner 直连:`/api/admin/findings?service=aam-parent&recent_runs=1` 返回最近一次产出扫描的
      findings(最新两次扫描失败也不为空)。
- [x] 平台代理:`/api/v1/security/findings?service=aam-parent&recent_runs=3` 返回有效 JSON,total 与 scanner 一致。
- [x] 前端 `bunx biome check src/security/hooks.ts src/security/api.ts` 通过。
- [x] scanner 侧 `pytest app/tests/services/findings/test_writer.py app/tests/api/test_admin.py`(113 passed)。

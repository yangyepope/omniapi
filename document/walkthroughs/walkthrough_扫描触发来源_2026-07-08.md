# Walkthrough:扫描任务触发来源记录与展示 [2026-07-08 15:03:50]

跨服务(gitlab-scanner 后端 + security-platform 前端)。对应 changelog:
security-platform FEAT-008 / gitlab-scanner FEAT-016。

## 需求

任务列表 + 详情面板展示每次扫描的触发来源:方式(push/merge_request 自动 / manual 手动)、触发人 actor、分支 ref + MR、触发时间。根因:`scan_runs` 从不记录携带在 `ChangeEvent` 里的触发信息。

## 操作 / 改动

### gitlab-scanner 后端
- [x] `app/db/models.py` `ScanRunRow`:加 `trigger_type/trigger_actor/trigger_ref/trigger_mr_iid/triggered_at` 5 个可空列。
- [x] `app/models/event.py` `ChangeEvent`:加 `manual: bool = False`(显式区分手动/自动,不靠 `actor=='admin'`)。
- [x] `app/api/routes/admin.py` `trigger_scan`:合成事件置 `manual=True`。
- [x] `app/services/scan_resume.py` `open_or_resume_run`:加关键字参 `event`,**仅开新行**落触发字段,resume 不覆盖;TYPE_CHECKING 导入 `ChangeEvent` 规避循环导入。
- [x] `app/services/scan.py` `__call__`:调用处传 `event=sc.event`。
- [x] `app/api/routes/admin.py` `ScanRunItem`:加 5 字段;`list_scan_runs` + `get_scan_run`(ScanRunDetail)两处构造回填。
- [x] 迁移 `app/db/migrations/versions/d7e2f9a1c4b8_add_scan_run_trigger_meta.py`(`down_revision=a7f3c2d9b4e1`,新 head)。
- [x] 单测 `app/tests/services/test_scan_trigger_meta.py`(push/mr/manual/无 event/resume 不覆盖,5 例)。

### security-platform 平台后端
- [x] 无改动:代理 `r.json()` 原样透传,新字段自动流出(已核对 `scanner_client.py` + `security.py`)。

### security-platform 前端
- [x] `security/api.ts` `ScanRun`:补 5 个可选字段。
- [x] `components/security/theme.ts`:`TRIGGER_META`(push 蓝 / merge_request 紫 / manual 灰,字面亮色 chip)。
- [x] `components/security/badges.tsx`:`TriggerBadge`(map/render 分离,缺失→「未知」)。
- [x] `routes/_layout/security/tasks.tsx`:「状态」后加「触发方式」「触发人」列;触发人列副行 ref + MR;MR 用 `useServiceList` 的 `repo_url` 客户端拼 `/-/merge_requests/{iid}` 链接。
- [x] `security/ScanRunDetailPanel.tsx`:头部加触发信息行。

### 文档
- [x] security-platform:`changelog/FEAT-008-*` + README 索引(下一编号→FEAT-009);`features/扫描任务触发来源.md`。
- [x] gitlab-scanner:`docs/changelog/FEAT-016-*` + README 索引。

## 验证

- [x] scanner 单测:`pytest app/tests/services/test_scan_trigger_meta.py app/tests/services/test_scan_heartbeat.py` → 23 passed。
- [x] scanner 回归:`pytest -k "scan or run or event or resume or trigger or admin"` → 170 passed。
- [x] scanner 迁移:`test_migrations_match_models.py` 1 passed;`alembic upgrade/downgrade --sql` DDL 正确、单一 head `d7e2f9a1c4b8`。
- [x] 前端:`tsc -p tsconfig.build.json --noEmit` exit 0;`biome check` 通过;F-004 tripwire 仅命中注释无实际用法。
- [ ] 端到端(遗留,需 rebuild scanner 落迁移 + 一次真实扫描):`docker compose build scanner && up -d scanner`(entrypoint 自动迁移)后手动触发 → 列表「手动」/admin;webhook push → 「Push 自动」+ 真实 actor;前端 `docker compose build frontend && up -d frontend`。存量老任务显示「未知/—」。

## 备注

- 激活需下游 scanner rebuild(entrypoint 自动 `alembic upgrade head`),会中断在跑扫描 → 部署时机交由用户决定,未擅自重启运行中的 scanner。
- 迁移前的存量任务触发字段为 NULL,前端优雅降级显示「未知/—」,不阻断。

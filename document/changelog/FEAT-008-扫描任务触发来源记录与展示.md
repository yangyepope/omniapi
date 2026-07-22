# FEAT-008 扫描任务触发来源记录与展示

- **编号**: FEAT-008
- **日期**: 2026-07-08
- **状态**: 已完成(前端 + 平台代理即可用;下游 scanner 需 rebuild 落迁移后字段才有值)
- **类型**: 新功能
- **关联 PR·Issue**: 跨仓库(gitlab-scanner FEAT-016 提供数据源)

## 需求背景

扫描既可由 GitLab webhook **自动触发**(push / merge_request),也可由控制台 `POST /admin/scan` **手动触发**。但 `scan_runs` 表只落了 sha/status/阶段,完全没记录「谁 / 以何种方式 / 在哪个分支+MR / 何时」。结果 `/security/tasks` 任务列表与 `ScanRunDetailPanel` 详情面板都无法区分一条任务是自动跑起来的还是人工点的,也看不到触发人、分支、MR。本次补齐:**后端落库 → 接口暴露 → 平台透传 → 前端展示**。

## 讨论过程

与用户确认:①记录 4 类信息——触发方式(push/merge_request/manual)、触发人 actor、分支 ref + MR、触发时间 triggered_at;②前端在**任务列表加列 + 详情面板**两处展示。

关键设计决策:
- **手动 vs 自动的判定不靠 `actor=='admin'` 脆弱字符串**——手动扫描的合成 `ChangeEvent` 复用 `event_type='push'` 以匹配调度逻辑,无法据此区分。改为在 `ChangeEvent` 加显式 `manual: bool` 标记,admin 路由置 `True`;派生 `trigger_type = 'manual' if event.manual else event.event_type`(正面修复,避免双轨语义)。
- **触发字段只在开新行时写,resume 不覆盖**——首次是什么触发的就一直保持,进程崩溃后被别的方式重扫接管同一行也不改写来源。
- **新列全部可空**,存量老任务为 NULL,前端渲染「未知 / —」不报错。

## 技术实现

**数据源**(gitlab-scanner,见其 FEAT-016):`scan_runs` 加 `trigger_type/trigger_actor/trigger_ref/trigger_mr_iid/triggered_at` 5 列 + Alembic 迁移;`open_or_resume_run(event=...)` 开新行时落库;`ScanRunItem`/`ScanRunDetail` 暴露。

**平台代理**(`backend/app/`):无需改代码。`services/scanner_client.py` 的 `list_scan_runs`/`get_scan_run` 均 `return r.json()` 原样透传,`api/routes/security.py` 无 response schema 裁剪,新字段自动流到前端。

**前端**(`frontend/src/`):
- `security/api.ts`:`ScanRun` 类型补 `trigger_type?`/`trigger_actor?`/`trigger_ref?`/`trigger_mr_iid?`/`triggered_at?`(可选;逐一对齐后端真实响应,遵 BUG-002/F-005 契约铁律)。
- `components/security/theme.ts`:`TRIGGER_META`(push→「Push 自动」蓝 / merge_request→「MR 自动」紫 / manual→「手动」灰;字面亮色 chip)。
- `components/security/badges.tsx`:`TriggerBadge`(map/render 分离,缺失→「未知」)。
- `routes/_layout/security/tasks.tsx`:表格「状态」后加「触发方式」「触发人」两列;触发人列副行显示 `ref` + MR;MR iid 用该服务 `repo_url`(来自 `useServiceList`)客户端拼 `/-/merge_requests/{iid}` 链接,无 repo_url 降级纯文本。
- `security/ScanRunDetailPanel.tsx`:头部 Card 加触发信息行(TriggerBadge + 触发人 + 分支/MR + 触发时间)。

## 验证方式

- [x] scanner 后端单测 `pytest -k trigger`:push/mr/manual 落对应 trigger_type + actor;无 event 全 NULL;resume 不覆盖首次来源(5 例)。
- [x] scanner 迁移离线 SQL 校验:`alembic upgrade/downgrade --sql` 生成的 ADD/DROP COLUMN 正确;单一 head。
- [x] 前端 `tsc -p tsconfig.build.json --noEmit` + `biome check` 通过;F-004 语义 token tripwire 仅命中注释、无实际用法。
- [ ] 端到端(需 rebuild scanner 落迁移 + 一次真实扫描):手动触发 → 列表该行「手动」+ admin;webhook push → 「Push 自动」+ 真实 actor/ref;MR 事件 → 「MR 自动」+ `!iid` 可点;存量老任务显示「未知/—」。

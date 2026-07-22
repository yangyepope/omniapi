# Walkthrough:修复安全大屏「开放问题」恒为 0 [2026-07-08 11:40:29]

## 背景

用户反馈安全大屏「开放问题」= 0、「AI 误报抑制率」= 0.0%,但同屏「严重问题」= 93、「覆盖服务数」= 11,质疑这两个 0 有问题。

## 诊断

- [x] 定位 KPI 取数:`frontend/src/security/SecurityDashboard.tsx` `KpiBand`,`open` 来自 `stats.data?.open_findings`
- [x] 查 scanner `/stats` 响应模型 `StatsResponse`(gitlab-scanner `admin.py`):**无 `open_findings` 字段**,开放数在 `by_status`
- [x] 查 finding.status 定义(`db/models.py`):默认 `"open"`,取值仅 `open|closed`
- [x] 确认前端 `security/api.ts` 手写 `Stats` 类型凭空声明了 `open_findings`(平台后端 `dict[str,Any]` 透传,TS 查不出)→ 根因:手写类型契约漂移 + `?? 0` 静默兜底
- [x] 误报率单独定性:查 `verifier-stats` 公式,只计 `(high+medium)/verified_total`

## 改动

- [x] `SecurityDashboard.tsx`:`open` 改读 `stats.data?.by_status?.open ?? 0`,补注释
- [x] `security/api.ts`:删 `Stats` 类型的幽灵字段 `open_findings`
- [x] 沉淀四件套:规则 `.claude/rules/bug-复盘-frontend.md` F-005、`document/changelog/FIX-012`、`document/bugs/BUG-002`(含 2 条 tripwire)、功能文档 `AI安全扫描控制台.md` 修改记录 + 两处 README 索引

## 验证

- [x] `npx tsc --noEmit` 通过,无孤儿引用(剩余 `open_findings` 引用均属真实字段 `ServiceSummary`)
- [x] 实打线上 scanner `/api/admin/stats`:`by_status={"closed":27,"open":1013}`、响应无 `open_findings` 键 → 修复后大屏「开放问题」应显示 **1013**(原为 0)
- [x] 实打 `/api/admin/verifier-stats`:`total=146, no_verifier=0, confirmed=141, refuted_low=5, refuted_high/medium=0` → 误报率 0.0% **非 bug**,verifier 已全跑,仅 low 置信度弱驳回 5 条,不计入抑制率

## 结论

- 「开放问题」= 0:**确定 bug,已修**(读错字段)。
- 「AI 误报抑制率」= 0.0%:**非 bug**,如实反映 verifier 未以 high/medium 置信度驳回任何 finding。

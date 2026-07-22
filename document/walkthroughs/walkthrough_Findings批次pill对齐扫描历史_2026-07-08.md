# Findings 批次 pill 对齐扫描历史(含零产出与失败产出)

> [2026-07-08 17:37:49] 跨服务改动:gitlab-scanner 后端 + security-platform 前端。

## 背景 / 问题

服务详情页 Findings 标签三处数字对不上:引擎 chip `ai_sonnet 116 开放`、批次 pill `#40 1 / #39 22 /
#38 57`(加起来 80≠116)、批次编号(#40/#39/#38)与「扫描历史」(#41/#40/#39)不一致。

根因(DB 实测):ai_sonnet open 按批次 = #40:1 / #39:22 / #38:57 / **#30:36** = 116。其中 **#30 是
`failed` 却有 36 产出**(失败前已写库),**#41 `completed` 但 ai_sonnet 零产出**。原 `finding-runs` 端点
INNER JOIN + limit=3,只列「最近 3 次产出过的扫描」→ 漏 #30、漏零产出 #41。用户选定口径:**全部对齐+含 0**。

## 操作 / 改动

- [x] **scanner 后端** `gitlab-scanner/backend/app/api/routes/admin.py` `list_finding_runs`:
  INNER JOIN → 从 `scan_runs` 出发的两级 LEFT JOIN;筛选(rule_prefix/severity/status/engine)下沉到 findings
  的 ON(防退化 INNER);计数 `count(distinct FindingRow.id)`(未匹配 NULL 不计→零产出为 0);
  `WHERE (FindingRow.id IS NOT NULL OR status='completed')` 保留「有产出 ∪ 已完成」;补 `and_/or_` 导入。
- [x] **scanner 单测** `test_admin.py`:新增 `test_finding_runs_includes_completed_zero_and_failed_with_output`
  (completed 零产出=0 / failed 有产出保留 / failed·aborted 零产出排除 / 降序);既有
  `test_finding_runs_counts_per_scan`(两次 completed 有产出)在新逻辑下仍通过。
- [x] **security-platform 前端**(后端透传裸 dict,无需改):
  - `frontend/src/security/hooks.ts` `useServiceFindingRuns` limit 3→20。
  - `frontend/src/routes/_layout/security/services/$name.tsx` 批次 pill:零产出计数 `text-gray-400` 置灰,
    加说明小字「数字为该次扫描去重产出,非累计;开放总数见上方引擎筛选」。
- [x] **文档**:更新 `gitlab-scanner/docs/features/findings-recent-runs.md`(FEAT-013)修改记录;新建
  `docs/changelog/REFACTOR-002-finding-runs-align-scan-history.md` + 更新 changelog README。

## 验证

- [x] scanner 单测:`pytest app/tests/api/test_admin.py -q` → 49 passed。
- [x] 前端 Biome:`bunx biome check hooks.ts $name.tsx` → 干净。
- [x] DB 层验证 LEFT JOIN SQL(aam-parent·ai_sonnet):返回 #41:0 / #40:1 / #39:22 / #38:57 / #30:36,
  和=116,不含 aborted/失败零产出。
- [x] 端到端:重建 scanner 镜像 + `up -d`;
  `GET /api/admin/services/aam-parent/finding-runs?engine=ai_sonnet&status=open&limit=20`
  → 5 批次含 #41(0 completed)/#30(36 failed),和=116,编号顶部与扫描历史一致。前端 Vite dev 热重载,刷新即见。

## 备注

- 此项只改 `finding-runs` 端点(批次 pill),`recent_runs` 过滤参数(list_findings)语义不变。
- 与 FEAT-019(逐引擎明细「发现」原始/去重)同批处理的一致性改进:两者都在把"引擎产出量"与"去重后漏洞数"讲清楚。

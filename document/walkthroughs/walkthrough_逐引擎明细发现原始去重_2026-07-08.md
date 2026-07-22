# 逐引擎明细「发现」列区分原始/去重

> [2026-07-08 17:03:17] 跨服务改动:gitlab-scanner 后端 + security-platform 前端。

## 背景 / 问题

扫描详情页「逐引擎明细」显示 `ai_sonnet 发现 15`,但 Findings 标签同批次 `#40` 只有 `1 条`,
用户反馈「漏洞数量不符」。排查确认**不是数据错误**,是两个统计口径:

- 明细「发现」= `ScanEngineRunRow.findings_count` = `len(result.findings)`,引擎**去重前**原始产出
  (AI 按 plan 并发扫、跨 plan 不去重,多 plan 命中同一处漏洞各记一条)。
- 批次 pill = `finding_scan_runs` 观测表按 `dedup_key`(`service|engine|rule|file|line`)的**去重后 distinct**。

用户确认:明细「发现」列两个数都显示(原始/去重)。

## 操作 / 改动

- [x] **scanner 后端** `gitlab-scanner/backend/app/api/routes/admin.py`:
  - `EngineRunDetail` 加 `distinct_findings: int | None = None`。
  - 新增模块级 `_ENGINE_SHORT_BY_RUN_NAME`:从 `app.services.engines` 6 个工具引擎类
    `.__name__` + `*_ENGINE_NAME` 常量派生的「类名→短名」映射(解决 `engine_name` 存类名、
    `FindingRow.engine` 存短名的命名双轨)。
  - `get_scan_run`:补 `finding_scan_runs JOIN findings GROUP BY findings.engine` 聚合,
    经映射回填每行 `distinct_findings`;伪引擎(finding_review/risk_classify)无对应 finding → None。
- [x] **scanner 单测** `test_admin.py`:新增 `test_get_scan_run_detail_distinct_vs_raw`(去重口径 +
  类名映射 + 伪引擎 None)、`test_engine_short_name_map_covers_tool_engines`(tripwire:新增工具引擎
  漏登记映射即失败);更新既有 `test_get_scan_run_detail` 断言新字段存在。
- [x] **security-platform 前端**(后端透传裸 dict,无需改):
  - `frontend/src/security/api.ts` `EngineRun` 加 `distinct_findings: number | null`。
  - `frontend/src/security/ScanRunDetailPanel.tsx`:表头「发现」→「发现(原始/去重)」,
    单元格 `{e.findings} / {e.distinct_findings ?? "—"}`(去重位 `text-gray-400`,伪引擎渲染 —)。
- [x] **文档沉淀**:scanner `docs/changelog/FEAT-019-scan-run-engine-distinct-findings.md` + 更新其 README 索引。

## 验证

- [x] scanner 后端测试:`pytest app/tests/api/test_admin.py -q` → 48 passed;
  `test_admin_config_cost.py` → 12 passed(EngineRunDetail 加字段未破坏成本页)。
- [x] 前端 Biome:`bunx biome check src/security/{api.ts,ScanRunDetailPanel.tsx}` → 干净
  (全项目 103 存量错误与本次无关)。
- [x] DB 层直接验证聚合 SQL(run 40):`scan_engine_runs.findings_count` vs
  `finding_scan_runs JOIN findings` distinct 一一对上;去重值与 Findings chip 完全同源。
- [x] 端到端:重建 scanner 镜像 + `up -d` 后
  `GET /api/admin/services/aam-parent/scan-runs/40` →
  `ai_sonnet 原始=15 去重=1`、`TrivyEngine 562/301`、`DependencyCheckEngine 278/278`、
  `finding_review 去重=None`。前端 Vite dev 热重载即时生效,页面显示 `15 / 1`。

## 备注

- scanner 是**构建进镜像**(无源码挂载/reload),后端改动需 `docker compose build scanner && up -d` 才生效;
  前端是 Vite dev 热重载,改源码即时生效,无需重建容器。
- 未夹带「把工具引擎 engine_name 改成短名以免映射」的重构——那会动 resume 键与唯一约束,属独立 breaking。

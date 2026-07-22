# FEAT-009 Findings 按扫描批次筛选

- **编号**: FEAT-009
- **日期**: 2026-07-08
- **状态**: 已完成
- **类型**: 新功能(纯前端)
- **关联 PR·Issue**: 消费下游 gitlab-scanner `finding_scan_runs` 观测表 + `/finding-runs` 端点 + `/findings?scan_run_id=` 过滤(已存在)

## 需求背景

服务详情页 Findings 标签原本只能按**引擎**分类(顶部 chip:全部/trivy/ai_sonnet…)。用户要求再加一个维度:按**最近 3 次扫描批次**(如 #41/#40/#39)分类,快速看「某次扫描到底产出了哪些 finding」。

## 讨论过程

确认「上面做个分类,按图2」= Findings 顶部在引擎 chip 之外,再加一排按扫描批次(run)的筛选 pill,对应扫描历史里的最近 3 次 run。

后端与平台代理**已具备**(方案 C):
- scanner `GET /services/{name}/finding-runs`:返回最近 N 次「真实产出过匹配 finding」的扫描 + 各自 distinct finding 数(数据源 `finding_scan_runs` 观测表),注释明说供本 pill 用。
- scanner `GET /admin/findings?scan_run_id=`:按该次扫描实际观测到的 finding 过滤。
- 平台 `security.py` 已代理 `/services/{name}/finding-runs` 与 `/findings?scan_run_id=`。

故本次纯前端。

## 技术实现(`frontend/src/`)

- `security/api.ts`:新增 `FindingRun` 类型 + `findingRuns(name, opts)` 方法;`listFindings` 已有 `scan_run_id` 参数。
- `security/hooks.ts`:`useServiceFindings` 增 `scan_run_id`(进 query key);新增 `useServiceFindingRuns(service, {engine})`(engine 进 key,切引擎即重取,使 pill 计数与引擎筛选口径一致)。
- `routes/_layout/security/services/$name.tsx` `FindingsTab`:引擎 chip 行下新增「按扫描批次」pill 行(全部 + 最近 3 次 run,每枚显示状态徽章 + `#id` + 条数 + 日期);`selRun` state 传入 `useServiceFindings`,与引擎筛选组合过滤;复用现有 `EnginePill`。

**口径说明**:pill 展示的 run 集合与计数随当前引擎筛选联动(方案 C「真实产出」语义)——选 ai_sonnet 时列出的是最近 3 次产出过 AI finding 的扫描,可能不同于全部引擎口径的 #41/#40/#39。

## 验证方式

- [x] `tsc -p tsconfig.build.json --noEmit` exit 0;`biome check` 通过。
- [x] scanner 数据活体:`/services/aam-parent/finding-runs?limit=3` 返回 #41(610)/#40(611)/#39(22);带 `engine=ai_sonnet` 返回随之变化的 run 集合与计数。
- [x] Vite dev server 转换 `$name.tsx` HTTP 200、0 transform error(本环境前端跑 dev server,HMR 即时生效)。
- [ ] 端到端(浏览器):Findings 标签出现「按扫描批次」pill 行,点 #41 只看该次产出;切引擎 pill 计数联动。

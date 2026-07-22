# Walkthrough:Findings 按扫描批次筛选 [2026-07-08 15:20:00]

单服务(security-platform 前端)。对应 changelog:FEAT-009。

## 需求

服务详情页 Findings 标签在现有「按引擎」chip 之外,再加一排「按扫描批次」pill(最近 3 次 run #41/#40/#39),点选只看该次扫描产出的 finding。后端(scanner `/finding-runs` + `/findings?scan_run_id=`,数据源 `finding_scan_runs`)与平台代理已具备,纯前端消费。

## 操作 / 改动

- [x] `frontend/src/security/api.ts`:新增 `FindingRun` 类型 + `findingRuns(name, opts)` 方法(GET `/security/services/{name}/finding-runs`);`listFindings` 已有 `scan_run_id`。
- [x] `frontend/src/security/hooks.ts`:`useServiceFindings` 增 `scan_run_id`(进 query key);新增 `useServiceFindingRuns(service, {engine, limit=3})`(engine 进 key,切引擎重取)。
- [x] `frontend/src/routes/_layout/security/services/$name.tsx` `FindingsTab`:引擎 chip 行下加「按扫描批次」pill 行(全部 + 各 run:状态徽章 + `#id` + 条数 + 日期),`selRun` 传入 `useServiceFindings`,与引擎筛选组合;复用 `EnginePill`。

## 验证

- [x] `bunx tsc -p tsconfig.build.json --noEmit` exit 0;`biome check` 通过。
- [x] scanner 数据活体:`finding-runs?limit=3` → #41(610)/#40(611)/#39(22);`engine=ai_sonnet` → run 集合与计数随之变化。
- [x] Vite dev server 转换 `$name.tsx` HTTP 200、0 error(本环境前端跑 dev server,HMR 即时生效,无需 build 容器)。
- [ ] 端到端(浏览器):Findings 出现「按扫描批次」pill,点 #41 过滤生效,切引擎 pill 联动。

## 备注

- pill 的 run 集合/计数随当前引擎筛选联动(方案 C「真实产出」语义),选特定引擎时可能不是 #41/#40/#39——这是 scanner `/finding-runs` 端点设计,不是 bug。
- 关联既有工作:`frontend/document/walkthroughs/walkthrough_服务详情Findings加最近出现列_2026-07-08.md`(finding_scan_runs 观测表落地)。

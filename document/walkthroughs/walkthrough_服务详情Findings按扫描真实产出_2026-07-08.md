# 服务详情 Findings:AI 为主 + 全部/按扫描真实产出 [2026-07-08 15:30:00]

## 需求演进(用户逐步澄清,单条对话不断细化)
列时间 → 按扫描分组 → 横向并行 → 点击切换 → 只看 AI → **按扫描真实产出(方案 C)+ 全部(方案 A)**。
之所以耗时:最终诉求不是「加一列」,而是要求 finding↔扫描 的真实产出关系 —— 数据库此前
只存 first/last_seen,不足以回答「第 N 次扫描到底产出了哪些」,需跨仓库改造(建表 + 写入链路)。

## 关键排查
- `ai_sonnet` 非确定性:run 40 引擎实际产出 15 条,但按 last_seen 归属只有 1 条落在 40。
- 三次扫描扫的是同一 commit → sha 无法区分扫描次数;last_seen 分组会误导。
- 结论:必须有 finding↔scan_run 的 N:M 观测关系(方案 C)。存量只能从 last_seen 回填一行,
  真正的每次产出全集要重扫后累积。

## 改动
### scanner(gitlab-scanner,已重建镜像 + 跑迁移)
- `db/models.py`:新增 `FindingScanRunRow`(finding_scan_runs 观测表,uq(finding_id,scan_run_id))。
- 迁移 `e1a4c7b9f2d6`:建表 + 索引 + 从 findings.last_seen 回填(1040 行)。
- `services/findings/writer.py`:`upsert_finding` 两条路径都登记观测(`_record_observation`,幂等)。
- `api/routes/admin.py`:
  - `GET /findings` 加 `scan_run_id` 过滤(join 观测表 → 该次真实产出);与 recent_runs 互斥。
  - 新增 `GET /services/{name}/finding-runs`:最近 N 次产出过(匹配筛选)finding 的扫描 + 每次条数。
  - `recent_runs` 的 producing_runs 子查询尊重 rule_prefix/severity/status/engine 筛选。
- `FindingItem` 加 `last_seen_scan_run_id`;`db/__init__` 导出新模型。

### 平台(security-platform backend,uvicorn --reload 已生效)
- `scanner_client.py`:`list_findings` 加 scan_run_id;新增 `list_finding_runs`。
- `api/routes/security.py`:`/findings` 加 scan_run_id 透传;新增 `/services/{name}/finding-runs`。

### 前端(Vite HMR 已生效)
- `security/api.ts`:`listFindings` 加 scan_run_id;新增 `FindingRun` 类型 + `serviceFindingRuns`。
- `security/hooks.ts`:`useServiceFindings(service,{scanRunId,limit})`(缺省=全部 AI);
  新增 `useServiceFindingRuns`;移除 `RECENT_SCAN_RUNS`(孤儿)。全程 `rule_prefix=ai/`(只看 AI)。
- `routes/_layout/security/services/$name.tsx`:`FindingsTab` 重写为横向切换器
  `[全部] [扫描#40] [扫描#39] [扫描#38]`,默认「全部」;选中项驱动取数;抽出 `SwitchPill`。

## 验证
- [x] scanner 单测 997 passed(含新增 6 条:观测写入幂等/累积、scan_run_id 过滤、finding-runs 计数)
- [x] scanner API:finding-runs 返回 40=1/39=22/38=57;scan_run_id=38 → 57 条;全部 AI open=116
- [x] 平台代理三接口同结果透传(field_present/counts 一致)
- [x] 前端 biome + tsc 均通过;HMR 生效

## 已知局限(已与用户确认)
- 存量 finding 观测表只从 last_seen 回填一行 → 「按扫描」视图在**重扫前**仍近似 last_seen 分组
  (如 aam-parent #40 显示 1 条)。各服务重扫后,upsert_finding 写全观测,按扫描产出才精确。
- 「全部」视图不受此局限,立即正确(当前所有 AI finding)。

## 追加(口径统一改版,同日)
用户反馈「扫描历史和 findings 对不上、全部没总数、看不懂」。根因:Findings 做成 AI-only(116),
而同页 KPI「开放 701」与扫描历史是**全引擎**口径,两个尺度对不上;且 AI 每次扫描产出极不稳定
(#41 的 ai_sonnet 跑了但产出 0),按扫描 pill 数字互相对不上。

用户选定「全引擎 + 引擎筛选器」。最终改版:
- FindingsTab 改为**引擎筛选 chip**:`[全部·701] [ai_sonnet·116] [trivy·301] [dependency_check·278] …`,
  数字为各引擎 **open** 数,之和 = 左侧 KPI「开放 701」,**完全对得上**;默认选中 AI(以 AI 为主)。
- 只展示 open findings(与 KPI 开放口径一致)。chip 数据源 `/categories?dimension=engine&service=`。
- 前端下线按扫描 pill 相关 hook/类型(useServiceFindingRuns / serviceFindingRuns / FindingRun /
  AI_RULE_PREFIX,均已删除,无孤儿);`useServiceFindings(name,{engine})` 改为引擎+open 口径;
  新增 `useServiceEngineCounts`;`categories` 客户端加 service 参数。
- 后端方案 C 基建(finding_scan_runs 观测表 + writer 写入 + scan_run_id/finding-runs 接口)**保留**
  (已测,run 41 起写入真实观测),暂不在 UI 暴露,留作将来「按扫描」用。

验证:平台代理确认 全部 open=701(=KPI)、各引擎 open 之和=701、ai_sonnet=116;biome+tsc 通过。

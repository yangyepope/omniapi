# FEAT-012 Findings 处置收件箱与扫描回归对比

- **编号**: FEAT-012
- **日期**: 2026-07-09
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 无

> 前端两处新页面,补齐「全局漏洞处置」与「两次扫描对比」两个此前缺失的工作面。纯前端,复用已就绪的后端 `/security/findings` 能力,不改后端。

## 需求背景

盘点前端时发现两个缺口:

1. **无全局 Findings 列表**:后端 `GET /security/findings` 早已支持 `service / severity / status / engine / rule_prefix / scan_run_id / project / limit / offset / sort` 全套筛选分页,但前端从无页面消费(`useListFindings` 零引用)。findings 只能从大屏「最新发现」feed(写死 30 条)、服务详情、接口详情零散进入 `findings/$id` 详情页处置——没有可筛选/排序/分页的「处置收件箱」,而这是安全平台最核心的日常工作面。
2. **无扫描回归对比**:后端 `listFindings?scan_run_id=` 可取某次扫描真实观测到的 findings,但前端只有单次扫描详情,无法回答「这次提交相比上次,新增/修复/遗留了哪些漏洞」。

## 讨论过程

与用户确认两处设计岔口:
- #1 列表行**仅筛选+跳详情**(不做内联快捷 triage)——最简实现,triage 面板详情页已有,避免列表组件臃肿。
- #3 放**独立页 `/security/regression`**——独立可发现,与成本/任务等平铺页一致,不塞进已 628 行的服务详情页。

回归 diff 的数据源选型:`listFindings?scan_run_id=X` 返回该次扫描观测到的 finding(数据源 scanner `finding_scan_runs` 观测表)。按 `finding.id`(跨扫描去重的持久实体,id 即稳定身份)做集合 diff:新增=head 有 base 无、已修复=base 有 head 无、遗留=交集。

**踩坑修正**:实测 `aam-parent` 单次扫描观测 610/611 条,**超过后端单页上限 500**。若只取 limit=500 会截断成「只比前 500」,diff 不完整。故 `useRunFindings` 改为**分页拉全量**(先取首页读 total,再并发补齐剩余页),对齐项目规则「不设无谓上限,要做就做完整」。

## 技术实现

改动定位(全部在 `frontend/src`):

- **hooks(`security/hooks.ts`)**:
  - `useFindingsList(opts)` — 收件箱数据源,筛选进 queryKey 服务端过滤,注入当前 `project` 做多项目隔离(与大屏 KPI 同口径),`placeholderData: keepPreviousData` 翻页不闪骨架。
  - `useRunFindings(service, runId)` — 回归 diff 数据源,按 `scan_run_id` 拉全量(分页合并,突破 500 上限),`staleTime` 30s(历史扫描产出不变)。
- **收件箱页(`routes/_layout/security/findings/index.tsx`,新建)**:筛选条(服务/severity/状态/引擎/规则前缀/排序)全进 URL search params(可分享、刷新不丢),结果表 + 分页,行链接 `findings/$id`。四态齐全,复用安全区亮色套件(`PageHeader/SectionCard/EmptyBlock/ErrorBlock/LoadingBlock/SeverityBadge`)。
- **回归对比页(`routes/_layout/security/regression.tsx`,新建)**:选服务(`useServiceList`,已按项目隔离)→ 自动补默认「最新两次扫描」→ 可手选基线/当前两次 → 三 KPI(新增/已修复/遗留)+ 三分组列表(按严重度倒序,行链接详情)。
- **侧边栏(`components/layout/Sidebar.tsx`)**:「AI 安全」组新增「Findings 收件箱」(Inbox 图标)、「回归对比」(GitCompare 图标)两入口。修正「扫描管理」高亮改用 `startsWith("/security/findings/")`(带斜杠)——只让 finding 详情页归属它,列表页归收件箱。

无后端改动、无数据库迁移、无新配置项。

## 验证方式

- [x] `bunx tsc --noEmit` 0 错误;`biome check` 改动文件 0 报错
- [x] 打接口验证 `/security/findings` 形状 `{total,limit,offset,items}`,`severity=HIGH&status=open` 过滤返回 total=422(全量 1040)
- [x] 打接口验证 `scan_run_id` 过滤:run 41=610、run 40=611(均 >500,确认需分页)
- [x] 真实数据验证 diff 逻辑:base(40)/head(41) 全量分页拉到 611/610,新增=0、已修复=1、遗留=610,不变式「遗留+新增=head 总数」成立
- [x] Playwright 渲染两页:收件箱标题+「共 N 条」可见、1040 条 21 页;回归页选服务后三 KPI 渲染;`pageerror` 0 运行时报错

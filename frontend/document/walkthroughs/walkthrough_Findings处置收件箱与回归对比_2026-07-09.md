# walkthrough — Findings 处置收件箱与扫描回归对比 [2026-07-09 23:02:33]

> 前端两处新页面。纯消费已有后端 `/security/findings` 能力,不改后端。关联 [FEAT-012](../../../document/changelog/FEAT-012-Findings处置收件箱与扫描回归对比.md)、功能文档 [Findings处置收件箱与回归对比](../../../document/features/Findings处置收件箱与回归对比.md)。

## 操作描述

盘点前端缺口后,用户选定实现两项:
1. **#1 Findings 处置收件箱** — 全局可筛选/排序/分页的漏洞列表(此前只有 `findings/$id` 详情 + 大屏 30 条 feed)。
2. **#3 扫描回归对比** — 选一个服务的两次扫描,对比新增/已修复/遗留的漏洞。

设计岔口经用户确认:收件箱**仅筛选+跳详情**(不内联 triage);回归对比放**独立页** `/security/regression`。

## 改动详情

- **`frontend/src/security/hooks.ts`**
  - 加 `useFindingsList(opts)`:收件箱数据源,筛选进 queryKey 服务端过滤,注入当前 `project` 隔离,`keepPreviousData` 翻页不闪骨架。
  - 加 `useRunFindings(service, runId)`:回归 diff 数据源,按 `scan_run_id` **分页拉全量**(先取首页读 total,再并发补齐余页)——实测单次扫描观测 610+ 条超后端 500 上限,不分页会截断成只比前 500。
- **`frontend/src/routes/_layout/security/findings/index.tsx`(新建)**:筛选条(服务/severity/状态/引擎/规则前缀/排序)全进 URL search params;结果表 + 分页;行链接 `findings/$id`;四态齐全,复用安全区亮色套件。
- **`frontend/src/routes/_layout/security/regression.tsx`(新建)**:选服务 → 自动补默认「最新两次扫描」→ 可手选基线/当前 → 三 KPI(新增/已修复/遗留)+ 三分组列表(按严重度倒序,行链接详情)。按 `finding.id` 做集合 diff。
- **`frontend/src/components/layout/Sidebar.tsx`**:「AI 安全」组加「Findings 收件箱」「回归对比」两入口;修正「扫描管理」高亮改用 `startsWith("/security/findings/")`(带斜杠)只归详情页,列表页归收件箱。

## 验证结果

- [x] `bunx tsc --noEmit` → 0 错误
- [x] `biome check` 改动 3 个文件 → 0 报错(全项目其余为存量报错,与本次无关)
- [x] 打接口:`/security/findings` 形状 `{total,limit,offset,items}`;`severity=HIGH&status=open` → total=422(全量 1040)
- [x] 打接口:`scan_run_id` 过滤 run 41=610、run 40=611(均 >500,验证需分页)
- [x] 真实数据校验 diff:base(40)/head(41) 全量拉到 611/610,新增=0、已修复=1、遗留=610,不变式「遗留+新增=head 总数」成立
- [x] Playwright 渲染:收件箱标题+「共 N 条」可见、1040 条 21 页;回归页选服务后三 KPI 渲染;`pageerror` 0 运行时报错
- [x] 清理临时验证脚本(`tests/_tmp_verify.spec.ts` 及临时截图)

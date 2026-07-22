# Findings 处置收件箱与扫描回归对比

- **创建日期**: 2026-07-09
- **状态**: 已上线
- **关联变更**: [FEAT-012](../changelog/FEAT-012-Findings处置收件箱与扫描回归对比.md)

> 前端两处新页面,均纯消费已有后端 `/security/findings` 能力。

## 需求背景

补齐前端两个缺口:①无全局可筛选的漏洞列表(此前只有 `findings/$id` 详情 + 大屏 30 条 feed);②无法对比两次扫描的漏洞增减。详见 FEAT-012。

## 数据结构 · 数据库设计

无(纯前端,不新增模型/表/迁移)。消费的 `Finding / FindingsList` 类型见 `frontend/src/security/api.ts`。

## 配置项

无。

## 接口列表

均为**已有**后端端点,本功能只新增前端消费:

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/security/findings` | 收件箱:`service/severity/status/engine/rule_prefix/project/limit/offset/sort` 筛选分页 |
| GET | `/security/findings?scan_run_id=` | 回归对比:某次扫描真实观测到的 findings(按 run 隔离) |
| GET | `/security/services/{name}/scan-runs` | 回归对比:某服务最近扫描列表(填充两个 run 下拉) |
| GET | `/security/services` | 两页共用:服务下拉(经 `useServiceList` 按当前项目过滤) |

## 与其他模块的交互

- **多项目隔离**:收件箱经 `useFindingsList` 注入当前 `project`;回归对比经 `useServiceList`(已按项目过滤)选服务,再按 `scan_run_id` 天然限定在该服务/项目。与 [多项目数据隔离](多项目数据隔离.md)(FEAT-011)口径一致。
- **triage**:收件箱行链接到 `findings/$id` 详情页,处置(fp/fixed/wontfix/suppressed/reopen)仍在详情页 `TriagePanel` 完成——收件箱只负责筛选+导航,不重复实现 triage。
- **失败降级**:两页均四态齐全;后端不可用时走 `ErrorBlock` 展示 `scannerErrorDetail`;服务/扫描列表为空时提示先选择。回归对比单次扫描 findings 超 500 条已由 `useRunFindings` 分页拉全量,不截断。

## 影响范围

- 新增:`routes/_layout/security/findings/index.tsx`、`routes/_layout/security/regression.tsx`
- 修改:`security/hooks.ts`(加 `useFindingsList` / `useRunFindings`)、`components/layout/Sidebar.tsx`(加两入口 + 修正扫描管理高亮范围)
- 无后端 / 数据库 / 配置改动。

## 验证方式

见 FEAT-012「验证方式」:tsc/lint 通过、接口形状与筛选实测、diff 逻辑真实数据校验(不变式成立)、Playwright 渲染两页 0 运行时报错。

## 修改记录

| 日期 | 变更 | 关联 changelog |
|---|---|---|
| 2026-07-09 | 首次上线:Findings 收件箱 + 扫描回归对比 | [FEAT-012](../changelog/FEAT-012-Findings处置收件箱与扫描回归对比.md) |

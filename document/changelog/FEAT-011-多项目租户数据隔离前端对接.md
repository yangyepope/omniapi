# FEAT-011 多项目(租户)+ 数据隔离前端对接

- **编号**: FEAT-011
- **日期**: 2026-07-09
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 无(依赖 scanner FEAT-024/025)

## 需求背景

gitlab-scanner 后台已落地多项目/多租户模型(FEAT-024/025):`Project`(租户)= 一整片服务,`Service`(git 仓库)归且仅归一个项目(跨项目重复 repo_url → 409,ADR-0019),findings/接口/知识等数据按项目隔离。

security-platform 控制台此前对此无感知——侧边栏「项目管理」→ `/projects` 是死链、无项目选择器、所有数据视图把全部项目混在一起。本次把这套能力同步到控制台:**项目/服务 CRUD 管理页 + 全局「当前项目」选择器 + 数据视图按项目隔离**。

## 讨论过程

与用户确认两处关键决策:
1. **选择器位置**:放安全区顶部(Context+localStorage 持久化),而非全站 Header 常驻——项目是扫描安全域概念,平台还有流量/条目等非安全页面。
2. **过滤深度**:核对 scanner 源码确认目前**仅 `/findings`、`/services/{name}/ai-context` 两个端点吃 `project=`**(stats/分类/服务列表/scan-runs 等 M3 才做)。故采用「原生支持处走 `?project=` + 服务视图客户端隔离(用『项目→服务』成员清单过滤 `/security/services`)+ 聚合 KPI 暂全局并加标注」。

## 技术实现

三层改动:

**层 1 平台后端代理**
- `backend/app/services/scanner_client.py`:`list_findings`/`get_ai_context` 加 `project` 参数;新增 8 个薄转发方法(projects + project services 的 CRUD)。
- `backend/app/api/routes/security.py`:`/findings`、`/services/{name}/ai-context` 加 `project` Query 透传;新增路由 `GET/POST /projects`、`PUT/DELETE /projects/{key}`、`GET/POST /projects/{key}/services`、`PUT/DELETE /projects/{key}/services/{name}`(Pydantic body model `Project*Body`/`Service*Body`,201/204 状态码,`_call_scanner` 包裹,业务约束由 scanner 透传)。

**层 2 前端 API 客户端**
- `frontend/src/security/api.ts`:新增 `ProjectItem`/`ServiceItem` 等类型(逐一对照 scanner pydantic,`language: string | string[]`);`SecurityApi` 加 8 个 CRUD 方法;`listFindings`/`recentFindings`/`aiContext` 加可选 `project`。

**层 3 前端状态 + UI**
- `frontend/src/security/CurrentProjectProvider.tsx`:Context+localStorage(`security.current_project`,默认 `default`),项目列表加载后校验、幽灵 key 回落 default;`main.tsx` 里 `QueryClientProvider > CurrentProjectProvider > RouterProvider`。
- `frontend/src/components/security/ProjectSelector.tsx`:Radix DropdownMenu 亮色下拉,enabled=false 灰显;`routes/_layout.tsx` 仅在安全区路由(`/security`、`/security-dashboard`、`/projects`)经 `Header` 新增的 `rightSlot` 注入(Header 属共享层不直接 import feature,保持单向依赖)。
- 项目管理页 `routes/_layout/projects.tsx` → `security/ProjectsPage.tsx`(卡片 + 启停 + 删除,default 隐藏删除);服务管理 `routes/_layout/projects.$key.tsx` → `security/ProjectServicesPage.tsx`(表格 + 增删改);弹窗 `ProjectCreateDialog.tsx`、`ServiceFormDialog.tsx`(仿现有安全区 Radix 原语 + 受控 state,复用抽出的 `formKit.tsx`)。
- 数据隔离:`security/hooks.ts` 的 `useServiceList` 改为取「全部服务 ∩ 当前项目成员清单」(一处过滤即隔离扫描管理树/大屏服务健康/知识页服务下拉);`useRecentFindings`/`useAiContext` 带上 `project`;大屏 KPI 带加标注说明聚合口径为全部项目(细分待 M3)。

## 验证方式

- [x] 前端 `bunx tsc -p tsconfig.build.json --noEmit` 通过(exit 0);Biome 对新增文件无告警;TanStack 路由树已生成 `/projects`、`/projects/$key`;Vite dev 转译新模块均 200。
- [x] 后端 curl 端到端(登录取 JWT → `localhost:8004`):
  - `GET /api/v1/security/projects` → `{total:1, default(11 服务)}`
  - 建项目 201 → 加服务 201(language 数组正确回显)
  - 同一 repo_url 加到别的项目 → **409**,detail 含 `already belongs to project 'team-fe-test'`
  - `DELETE /projects/default` → **400** `the 'default' project can't be deleted`
  - 清理删除服务/项目 → 204;`GET /findings?project=default` → 200
- [ ] 浏览器手工回归(选择器切换 findings/服务树随之变化、非安全页不显示选择器)——建议合并前在 UI 过一遍

## 补充(2026-07-10):聚合端点全部项目化 + 修默认项目硬编码

**问题**:用户创建项目后,新项目仍显示"别的数据"。排查确认——① scanner 只有 findings/ai-context 吃 `project`,`stats`/`categories`/`services`/`cost` 等聚合端点是**全库统计**,大屏一大片不随项目切换;② 本环境根本**没有 `default` 项目**(唯一项目是 `aigs-middleground`),而前端把当前项目**硬编码默认 `default`**,导致所有过滤查询打 `?project=default` → 全空。

**修复**(用户拍板"改 scanner 后端做真隔离"):
- scanner `admin.py`:`/stats`、`/stats/trend`、`/categories`、`/verifier-stats`、`/finding-review-stats`、`/cost-stats`、`/cost-runs`、`/services` 全部加 `project=` 过滤(findings 按 `FindingRow.project`;cost 经 `scan_runs.project` join;services 按 `Service.project` 且 finding 计数按 项目+服务名 双约束)。`ServiceSummary` 增 `project` 字段。**配置/规则(`/config`、`/ai/*`)保持全局不动**(公共资产,底层表无 project 列)。
- 平台代理 `scanner_client.py` + `security.py`:上述方法/路由全程透传 `project`;`list_all_scan_runs` 经 `list_services(project=)` fan-out 隔离任务总览。
- 前端 `hooks.ts`:`useStats/useTrend/useCategories/useVerifierStats/useFindingReviewStats/useCostStats/useCostRuns/useAllScanRuns` 全部读 `useCurrentProject()` 并带 project 进 queryKey;`useServiceList` 从客户端交叉过滤改为服务端 `?project=`(去掉 M1 的兜底);大屏移除"全局口径"标注。
- 前端 `CurrentProjectProvider`:**不再硬编码 `default`**,初始读 localStorage,项目列表回来后若当前 key 不在列表 → 回落**首个真实项目**(适配任意种子项目名)。

**验证(curl,平台代理 JWT)**:`stats?project=aigs-middleground`→total 1040/services 11/open 1013;`?project=ghost`→0/0;`services?project=aigs-middleground`→11(全 aigs)、`?project=ghost`→0;`cost-stats?project=`正常。前端 tsc/Biome 通过。

**部署注意**:scanner 镜像未挂源码,`admin.py` 改动需**重建 scanner 镜像**才持久(验证时用 `docker cp`+`docker restart gitlab-scanner` 热替换);平台后端与前端走 reload/HMR,已即时生效。

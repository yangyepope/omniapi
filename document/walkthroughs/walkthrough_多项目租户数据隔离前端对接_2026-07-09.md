# Walkthrough:多项目(租户)+ 数据隔离前端对接 [2026-07-09 22:05:38]

对接 gitlab-scanner FEAT-024/025 多租户能力到 security-platform 控制台,三层改动(平台后端代理 + 前端客户端 + 前端 UI/状态)。关联 [FEAT-011](../changelog/FEAT-011-多项目租户数据隔离前端对接.md)、功能文档 [多项目数据隔离](../features/多项目数据隔离.md)。

## 操作描述

- [x] 核对 scanner 源码,确认仅 `/findings`、`/services/{name}/ai-context` 原生支持 `project=`,其余 M3 未做
- [x] 与用户确认两处决策:选择器放安全区顶部;过滤深度 = 原生处 + 服务视图客户端隔离 + 聚合 KPI 加标注
- [x] 平台后端补代理(scanner_client 8 方法 + security.py 8 路由 + 2 处 project 透传)
- [x] 前端补 api.ts 类型/方法、当前项目 Provider、选择器、管理页、隔离 hooks
- [x] 端到端验证(前端 tsc/lint/vite;后端 curl 全流程)

## 改动详情

### 后端(security-platform/backend)
- `app/services/scanner_client.py`:`list_findings`/`get_ai_context` 加 `project`;新增 `list_projects`/`create_project`/`update_project`/`delete_project`/`list_project_services`/`create_project_service`/`update_project_service`/`delete_project_service`。
- `app/api/routes/security.py`:`/findings`、`/services/{name}/ai-context` 加 `project` Query 透传;新增 8 条 `/projects*` 路由(`Project*Body`/`Service*Body` Pydantic model,201/204,`_call_scanner` 包裹,业务约束 scanner 透传)。

### 前端(security-platform/frontend)
- `src/security/api.ts`:`ProjectItem`/`ProjectListResp`/`ProjectCreate`/`ProjectUpdate`/`ServiceItem`/`ServiceListResp`/`ServiceCreate`/`ServiceUpdate` 类型 + 8 个 `SecurityApi` 方法;`listFindings`/`recentFindings`/`aiContext` 加 `project`。
- `src/security/CurrentProjectProvider.tsx`(新):Context+localStorage,幽灵 key 回落 default;`src/main.tsx` 挂载在 Query 内、Router 外。
- `src/components/security/ProjectSelector.tsx`(新):Radix DropdownMenu 亮色下拉;`src/components/layout/Header.tsx` 加 `rightSlot` prop;`src/routes/_layout.tsx` 仅安全区路由注入选择器(顺手补 Header 两个 button 的 `type`,触碰即修)。
- 管理页:`routes/_layout/projects.tsx`、`routes/_layout/projects.$key.tsx`(壳)→ `src/security/ProjectsPage.tsx`、`ProjectServicesPage.tsx`;弹窗 `ProjectCreateDialog.tsx`、`ServiceFormDialog.tsx`;共享 `formKit.tsx`。
- 隔离:`src/security/hooks.ts` 的 `useServiceList` 改为「全部服务 ∩ 当前项目成员清单」;`useRecentFindings`/`useAiContext` 带 `project`;新增 `useProjects`/`useProjectServices`;`SecurityDashboard.tsx` KPI 带加聚合口径标注。

## 验证结果

- [x] `bunx tsc -p tsconfig.build.json --noEmit` → exit 0
- [x] Biome 新增文件无告警(仓库存量告警不属本次)
- [x] TanStack 路由树含 `/projects`、`/projects/$key`;Vite dev 转译新模块均 200
- [x] 后端 curl(localhost:8004,JWT):列项目=default(11 服务);建项目 201;加服务 201(language 数组回显);同 repo 入别项目 **409**「already belongs to project」;删 default **400**;清理 204;`findings?project=default` 200
- [ ] 浏览器手工回归(选择器切换联动 / 非安全页不显示)——建议合并前 UI 过一遍

## 已知边界

- 聚合 KPI(stats/分类/成本等)仍全站口径,服务视图靠前端成员清单隔离;待 scanner M3 给这些端点加 `project=` 后可改服务端过滤。
- 代理层 409/400 detail 因 `_call_scanner` 用 `response.text` 而**双层 JSON 包裹**(既有行为,所有 409 一致),toast 文案含目标信息但略带 `{"detail":...}` 外壳;如需美化应统一改 `scannerErrorDetail`/`_call_scanner`,属跨面独立改动,本次未动。

---

# 补充 [2026-07-10 04:20:00]:聚合端点全部项目化 + 修默认项目硬编码

## 操作描述
- [x] 排查"新项目仍显示别的数据":确认 scanner 聚合端点全局 + 本环境无 default 项目(唯一 aigs-middleground)+ 前端硬编码默认 default
- [x] 用户拍板"改 scanner 后端做真隔离",三层加 project 过滤
- [x] 端到端 curl 验证隔离,修默认项目回落逻辑

## 改动详情
- scanner `admin.py`:8 个聚合/数据端点加 `project=` 过滤(stats/trend/categories/verifier-stats/finding-review-stats/cost-stats/cost-runs/services);`ServiceSummary` 加 `project`;配置/规则端点保持全局。
- 平台 `scanner_client.py`+`security.py`:上述透传 project;`list_all_scan_runs` 经 `list_services(project=)` 隔离。
- 前端 `hooks.ts`:8 个 hook 带 project 进 queryKey;`useServiceList` 改服务端过滤(去客户端兜底);`SecurityDashboard` 去掉"全局口径"标注。
- 前端 `CurrentProjectProvider`:去掉硬编码 `default`,回落首个真实项目。

## 验证结果
- [x] scanner 直连:`/stats?project=aigs-middleground`→1040/11/open1013;`?project=default`→0/0;`?project=ghost`→0/0
- [x] 平台代理(JWT):`stats?project=aigs-middleground`→1040/11;`services?project=aigs-middleground`→11(全 aigs)、`?project=ghost`→0;`cost-stats?project=` 正常
- [x] findings 数据实为 `project=aigs-middleground`(响应 schema 不含 project 字段属正常,过滤按 DB 列生效)
- [x] 前端 tsc(exit 0)+ Biome 通过

## 部署注意
- scanner 镜像未挂源码:`admin.py` 改动经 `docker cp`+`docker restart gitlab-scanner` 热替换验证,**需重建 scanner 镜像**才持久(`cd gitlab-scanner && docker compose build scanner && docker compose up -d scanner`)。
- 平台后端 reload、前端 HMR,已即时生效。

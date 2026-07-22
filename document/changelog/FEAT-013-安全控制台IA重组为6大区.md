# FEAT-013 安全控制台信息架构(IA)重组为 6 大区 + 每项目扫描配置

- **编号**: FEAT-013
- **日期**: 2026-07-10
- **状态**: 已完成
- **类型**: 新功能 / 重构优化
- **关联 PR·Issue**: 无

## 需求背景

用户给出一份 GitLab-Scanner 控制台完整信息架构(IA),要求前端「AI 安全」控制台对齐:
把当时**侧边栏 11 个扁平项**收拢为 **6 大区**(总览大屏 / 发现 / 服务 / 扫描 / 项目管理 / 全局配置),
含多子块的区(服务详情、扫描、全局配置)改用**页内 Tab 枢纽**。经排查:后端与 `security/api.ts`
已覆盖 IA 几乎所有端点、页面组件也都存在,差距**几乎全在导航组织**;唯一真实功能缺口是
**每项目扫描配置**(`/projects/{key}/config`)——gitlab-scanner 后端已实现,但平台代理未转发、前端无 UI。

## 讨论过程

用户确认三项决策:① 完整重组为 6 大区;② 回归对比 + 扫描任务折叠进「扫描」区;③ 子导航用页内 Tab。

Tab 枢纽的实现取舍:`tasks`/`regression` 路由组件耦合各自的 `Route.useSearch()`(service/status、base/head),
若合并进单一 hub 路由会破坏其 URL search 状态(违反 F-002/URL 规则)。故采用**共享 Tab 条挂到同区兄弟路由**
(`HubTabs` 原语 + `ScanHubTabs`/`SettingsHubTabs`),保留各页 search 参数代码零改动,侧边栏落到该区默认页。

## 技术实现

**导航(核心)**
- `components/layout/Sidebar.tsx`:「AI 安全」组 11 项 → 6 项(总览大屏/发现/服务/扫描/项目管理/全局配置),重写 active 规则。
- `components/security/ui.tsx`:新增 `HubTabs` 区级子导航原语(下划线 Link 条,按 pathname 高亮)。
- `security/ScanHubTabs.tsx`(运行记录/成本明细/回归对比)、`security/SettingsHubTabs.tsx`(全局参数/AI分类/规则与Skills)。

**大屏**:`security/SecurityDashboard.tsx` 新增「成本概览」区(复用项目感知 `useCostStats`,4 tile + 明细下钻)。

**服务区**
- 新增 `routes/_layout/security/services/index.tsx` + `security/ServiceListPage.tsx`(服务清单)。
- 服务详情 `routes/_layout/security/services/$name.tsx` 从 4 Tab 扩到 6 Tab:补「接口」(抽 `security/ServiceInterfacesPanel.tsx`,原扫描管理页 InterfacePanel)、「业务知识」(复用导出的 `KnowledgePage` 的 `KnowledgePanel`)。

**扫描/配置区**:`cost/tasks/regression`、`config/ai-rules/rules` 六路由分别接入对应 Tab 条(路由文件包一层),旧路由即枢纽 Tab,无需重定向。

**旧路由收敛**:`scans.tsx`(接口浏览已下沉)→ 重定向 `/security/tasks`;`knowledge.tsx`(已折叠进服务详情)→ 重定向 `/security/services`;`interfaces/$id.tsx` 返回按钮改历史驱动(F-006)。

**每项目扫描配置(唯一全栈项,scanner FEAT-027 M3)**
- 平台代理:`services/scanner_client.py` 加 `get/update_project_config` + `delete_project_config_key` 3 方法;`api/routes/security.py` 加 `GET/PUT/DELETE /projects/{key}/config[/{config_key}]` 3 透传路由 + `ProjectConfigUpdateBody`(updated_by 缺省注入当前用户)。
- 前端:`security/api.ts` 加 `ProjectConfigItem/ListResp` 类型 + 3 方法;`hooks.ts` 加 `useProjectConfig`;新增 `security/ProjectScanConfigPanel.tsx`(3 键:AI 二次校验 bool / 校验严重度 str / AI 并发 int,每项显示「跟随全局/已覆盖」,保存覆盖 + 恢复全局),挂到 `ProjectServicesPage`。

## 验证方式

- [x] 前端全量 `tsc -p tsconfig.build.json` 通过(exit 0);触碰文件 Biome 干净;`bun run lint ./` 后台跑 exit 0。
- [x] Vite dev(:5173)HMR 存活,所有新增/改动模块转译 200(无 import/语法错误);路由树含新 `services/` index。
- [x] 每项目配置**真实接口**验证(经平台 :8004 代理 → scanner):
  - `GET /api/v1/security/projects/aigs-middleground/config` → 200,返回 3 键(global_default/value/is_overridden)。
  - `PUT {updates:{AI_ENGINE_CONCURRENCY:4}}` → 200,value=4、global_default=8、is_overridden=true。
  - `PUT {updates:{NOT_A_KEY:1}}` → 400(白名单校验透传);`PUT {AI_ENGINE_CONCURRENCY:99}` → 400(pydantic ge/le)。
  - `DELETE .../config/AI_ENGINE_CONCURRENCY` → 204;复 GET → value=8、is_overridden=false(回退全局)。状态已还原。
- [x] 后端两文件 AST 语法校验通过(ruff 在容器内跑,本地无该二进制)。

**部署注意**:平台后端改动本环境已 uvicorn --reload 热加载生效(openapi 已含新路由);gitlab-scanner 侧端点为既有实现,未改。

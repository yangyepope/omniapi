# Walkthrough — 前端信息架构(IA)同步:安全控制台重组为 6 大区 [2026-07-10 17:02:44]

跨服务改动(frontend + backend 代理),按 IA 把「AI 安全」控制台从 11 个扁平侧边栏项重组为 6 大区,
并补齐唯一功能缺口「每项目扫描配置」。用户决策:完整重组 6 大区 / 回归+任务折叠进扫描区 / 页内 Tab 枢纽。

## 操作与改动

### 批 1 — 导航 6 大区 + 枢纽 Tab 条 + 大屏成本 + 服务清单(纯前端)
- [x] `components/security/ui.tsx` 加 `HubTabs` 区级子导航原语(下划线 Link 条,按 pathname 高亮)。
- [x] 新增 `security/ScanHubTabs.tsx`(运行记录/成本明细/回归对比)、`security/SettingsHubTabs.tsx`(全局参数/AI分类/规则与Skills)。
- [x] Tab 条接入兄弟路由:`cost.tsx`/`tasks.tsx`/`regression.tsx` 挂 ScanHubTabs;`config.tsx`/`ai-rules.tsx`/`rules.tsx` 挂 SettingsHubTabs(路由文件包一层,页内 search 状态零改)。
- [x] `security/SecurityDashboard.tsx` 加「成本概览」区(复用 `useCostStats`,4 tile + 明细下钻链接)。
- [x] 新增 `routes/_layout/security/services/index.tsx` + `security/ServiceListPage.tsx`(服务清单页)。
- [x] `components/layout/Sidebar.tsx`「AI 安全」组 11 项 → 6 项 + 重写 active 规则(仅动此侧边栏,`AppSidebar.tsx` 未挂载不碰)。

### 批 2 — 服务详情补 2 Tab + 旧路由收敛
- [x] 抽 `security/ServiceInterfacesPanel.tsx`(原 scans 页 InterfacePanel);导出 `KnowledgePage` 内 `KnowledgePanel`。
- [x] `services/$name.tsx` 4 Tab → 6 Tab(补「接口」「业务知识」)。
- [x] `scans.tsx` → 重定向 `/security/tasks`;`knowledge.tsx` → 重定向 `/security/services`;`interfaces/$id.tsx` 返回按钮改 `useCanGoBack()`+`history.back()`(F-006)。

### 批 3 — 每项目扫描配置(全栈)
- [x] 平台后端:`services/scanner_client.py` +3 方法(get/update_project_config、delete_project_config_key);`api/routes/security.py` +3 透传路由 + `ProjectConfigUpdateBody`(updated_by 缺省注入当前用户)。
- [x] 前端:`security/api.ts` +类型+3 方法;`hooks.ts` +`useProjectConfig`;新增 `security/ProjectScanConfigPanel.tsx`(3 键 verify/严重度/并发,覆盖或跟随全局),挂 `ProjectServicesPage`。

### 文档
- [x] changelog `FEAT-013` + 更新 README 索引(下一编号→FEAT-014)。
- [x] features:`AI安全扫描控制台.md`、`多项目数据隔离.md` 追加《修改记录》。
- [x] plans:`document/plans/20260710_前端IA同步6大区_任务清单.md`。

## 验证结果

- [x] 前端 `tsc -p tsconfig.build.json` 全量通过(exit 0);触碰文件 Biome 干净;`bun run lint ./` 后台 exit 0。
- [x] Vite dev(:5173)HMR 存活,新增/改动模块转译均 200;路由树含 `security/services/` index。
- [x] 每项目配置经平台 :8004 代理 → scanner 真实接口验证:
  - GET 3 键 200;PUT `AI_ENGINE_CONCURRENCY=4` → value=4/is_overridden=true;
  - PUT 非法键 / 越界值(99) → 400;DELETE → 204;复 GET → 回退全局(value=8/false)。状态已还原。
- [x] 后端两文件 AST 语法校验通过(ruff/mypy 在容器内跑)。

## 备注 / 已知取舍

- Tab 枢纽用「共享 Tab 条挂兄弟路由」而非合并单一 hub 路由:因 `tasks`/`regression` 组件耦合各自 `Route.useSearch()`,合并会破坏 URL search 状态(F-002)。此法保留各页 search 代码零改动。
- 全站 `bun run lint ./`(扫整个仓库)在本机较慢,曾触发前台 2min 超时;后台运行 exit 0,触碰文件用 `bunx biome check <files>` 35~58ms 全绿。
- Biome 报的 3 个 `href="#"` 属 `Sidebar.tsx` 底部**既有占位链接**(全局搜索/重放任务/统计分析),非本次引入,未触碰其行,按外科手术原则不改。

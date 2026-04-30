# [2026-03-31 05:15:40] 服务管理模块前后端联调与优化 - 操作摘要

## 操作描述 (Actions)
完成了服务管理页面的核心功能闭环，解决了遗留的后端过滤不准确、前端数据硬编码以及操作功能缺失的问题。

## 改动详情 (Changes)

### 1. 后端逻辑补全 (Backend)
- **脏数据过滤**：在 `system_modules.py` 中将 `unknown api` (大小写修正后) 加入 `EXCLUDED_SERVICE_NAMES` 常量，成功在统计接口中隐藏早期非正式服务名。
- **回退逻辑优化**：在 `worker.py` 的服务名提取函数中增加了双重校验，强制将提取失败或包含 `Unknown` 的服务名归类为 `default`，防止后续数据库继续产生脏名称。

### 2. 前端功能实现 (Frontend)
- **数据流连通**：移除 `ServiceCard` 中的 Mock 注入，全面对接 `SystemModuleStats` 真实数据字段。
- **Hooks 封装**：新建 `/hooks/useSystemModules.ts`，利用 React Query 封装了更新与删除的 Mutation，并实现实时缓存刷新。
- **状态切换组件**：实现 `ServiceStatus` (Active/Deprecated) 的下拉切换 UI，且具备动画反馈与颜色区分。
- **负责人编辑**：实现行内编辑 (Inline Edit) 模式，支持全自动同步至后端。
- **删除功能**：集成 `window.confirm` 安全确认与物理删除 API，确保资产可清理。

### 3. 类型系统同步
- 执行 `uv run python backend/scripts/dump_openapi.py` 同步最新 Pydantic 模型。
- 运行 `bun run generate-client` 重新生成前端 TypeScript 定义，彻底解决类型错位。

## 验证结果 (Verification)
- [x] **后端回归测试**：运行 `pytest` 确认 4 个后端路由测试全部通过。
- [x] **脏数据过滤校验**：通过 `verify_exclusion.py` 脚本成功确认 API 响应不再包含 "Unknown API"。
- [x] **端到端测试**：
    - 状态从 `ACTIVE` -> `DEPRECATED` -> 持久化成功。
    - 负责人修改 -> UI 立即渲染 -> 刷新页面后依然准确。
    - 删除服务 -> 后端响应 204 -> 前端列表实时移除该卡片。

---

> [!TIP]
> 以后如果在本地环境遇到“无法跳转代码”或“测试插件失效”，建议检查 `.vscode/settings.json` 是否被意外设为 `"None"`。目前本项目已按照您的要求优化为 `Default` 和 `pytest` 模式。

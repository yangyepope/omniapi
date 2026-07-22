# [2026-03-26 02:30:00] 接口中心前后端真实数据联调

## 操作描述
本次操作主要完成了接口中心前端页面与后端数据的真实对接，包括 OpenAPI 规范导出、前端 Client 自动生成、以及在前端页面中使用 React Query 接入后端接口并渲染真实数据。同时修复了部分类型错误和未使用的导入问题。

## 改动详情
1. **OpenAPI 规范生成**
   - 编写了 `/root/security-platform/backend/scripts/dump_openapi.py` 脚本，从 FastAPI 应用中导出 OpenAPI 规范并保存为 `/root/security-platform/frontend/openapi.json`。
2. **前端 Client 代码生成**
   - 使用 `@hey-api/openapi-ts` 根据导出的 `openapi.json` 在前端重新生成了客户端代码 (`src/client/`)，确保前端代码可以强类型调用 `SystemModulesService.getSystemModulesStats` 接口。
3. **接口中心页面改造 (`api-center.tsx`)**
   - 引入 `@tanstack/react-query` 和 `SystemModulesService`。
   - 将原来硬编码的 `servicesData` 替换为 `useQuery` 动态获取后端 `/api/v1/system-modules/` 接口返回的数据。
   - 实现了数据的适配，将后端返回的数据映射到 `ServiceData` 格式，包括计算接口总数、文档覆盖率（自动发现率）以及影子 API 数量等统计信息。
   - 增加了时间格式化工具 `formatRelativeTime`，以便在卡片上显示 `last_scanned_at` 相对时间。
4. **TypeScript 类型及代码规范修复**
   - 移除了 `AppSidebar.tsx` 中未使用的 `SidebarAppearance` 导入，解决 `TS6133` 错误。
   - 修正了 `tests/utils/privateApi.ts` 中的 TypeScript 错误（将后端已移除或未定义的 `is_verified` 修正为合法的 `is_active`），解决 `TS2353` 错误。

## 验证结果
- [x] 后端 `uvicorn` 服务成功导出 `openapi.json`，且生成的前端客户端包含 `SystemModulesService`
- [x] 前端 `bun run tsc --noEmit` 检查全量通过，无类型错误
- [x] 前端 Vite 服务器已成功启动，页面可通过 `http://localhost:5178/` 进行预览并正常发起 API 请求
- [x] 成功获取真实后端数据并在接口中心渲染各微服务的卡片及统计指标

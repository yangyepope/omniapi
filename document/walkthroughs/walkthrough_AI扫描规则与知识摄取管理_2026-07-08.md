# Walkthrough:AI 扫描规则与知识摄取管理(全栈)

**任务**: 在「AI 安全」控制台对接 scanner 的 AI Hunt Category 与知识摄取两组管理接口
**时间**: [2026-07-08 17:46:20]
**关联**: [FEAT-010](../changelog/FEAT-010-AI扫描规则与知识摄取管理.md) · [功能文档](../features/AI扫描规则与知识摄取管理.md)

## 操作描述

契约给的是 scanner 侧 `/api/admin/*`(X-Admin-Token),但前端从不直连 scanner,故按全站模式
补齐三层:平台 `ScannerClient` 转发 → `/api/v1/security/*` 代理(JWT)→ 前端安全区两管理页。

## 改动详情

### 后端
- [x] `backend/app/services/scanner_client.py`:+10 转发方法(category/knowledge 各 5)。
- [x] `backend/app/api/routes/security.py`:+4 请求体模型 + 10 代理路由;`_call_scanner` 透传
      状态码补 `409`(重名冲突原会被吞成 502)。category create/update 的 `updated_by` 从
      认证用户注入,不信任请求体。

### 前端(`frontend/src/security/`)
- [x] `api.ts`:+类型(逐字段对齐 scanner pydantic,避开 F-005)+ `SecurityApi` 10 方法。
- [x] `hooks.ts`:+4 query hook(`staleTime`,不做 30s 心跳);mutation 内联页面。
- [x] `AiCategoriesPage` / `AiCategoryEditor` / `AiCategoryCreateDialog` + `aiCategoryUtils.ts`。
- [x] `KnowledgePage`(含 `KnowledgePanel`)/ `KnowledgeDetail` / `KnowledgeCreateDialog` +
      `knowledgeUtils.tsx`。
- [x] 路由 `routes/_layout/security/{ai-rules,knowledge}.tsx`;侧边栏「AI 安全」组 +2 项。
- [x] 全程复用安全区亮色套件(`components/security/{ui,badges}`)、四态、sonner、`ConfirmDialog`;
      builtin 删除按钮隐藏、占位符缺失警告、`__TECH_STACK__` 原样保留、`fed_to_ai` 突出。

## 验证结果

- [x] `bunx tsc -p tsconfig.build.json --noEmit`:0 错误;新文件 Biome 全通过(仅存量 Sidebar
      footer `href="#"` 3 处预存违例)。
- [x] `routeTree.gen.ts` 自动重生成,含两新路由。
- [x] 后端全链路打点(JWT):`/ai/categories` total=22;详情含 `__TECH_STACK__`;重名 **409**、
      builtin 删 400、不存在 404、PUT `updated_by="admin"`;知识列表 total=15、`fed_to_ai` 正确;
      写路径 POST 201→重复 409→PUT 翻转 `fed_to_ai=false`+`human_edited=true`→DELETE 204→404,
      临时数据已清理无残留。

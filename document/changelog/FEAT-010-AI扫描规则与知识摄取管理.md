# FEAT-010 AI 扫描规则(Category)与知识摄取管理

- **编号**: FEAT-010
- **日期**: 2026-07-08
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 无(下游 scanner FEAT-018 提供 `/api/admin/ai/categories`、`/api/admin/**/knowledge` 接口)

## 需求背景

scanner 侧新增两块可管理能力,需要在「AI 安全」控制台补对应管理界面:

1. **AI 扫描规则(Hunt Category)**:AI 扫描按 category(OWASP API01 / crypto_misuse /
   OWASP LLM Top-10 等,启动自动 seed 22 条)组织,每条带 system/user 提示词、选方法论
   skill 的打分维度、参考规则映射。控制台要能列表 / 查看 / 编辑 / 启停 / 新增自定义 / 删除。
2. **知识摄取文档**:扫描时从各服务源码摄取业务知识文档(CLAUDE.md / docs/ai/** 等),AI
   用它理解项目。控制台要能按服务列出 / 查看 / 改分类 / 编辑 / 手工新增 / 删除。只有
   classification==ai_context 的文档真正喂给 AI(`fed_to_ai`)。

## 技术实现

契约描述的是 **scanner 侧** `/api/admin/*`(X-Admin-Token),但本项目前端从不直连 scanner——
全站安全功能走「浏览器 → 平台后端 `/api/v1/security/*`(JWT)→ `ScannerClient`(注入
X-Admin-Token)→ scanner」。因此本次补齐三层:

**层 1 · 平台后端 client**(`backend/app/services/scanner_client.py`)
追加 10 个薄转发方法:`list/get/create/update/delete_hunt_category`、
`list/get/create/update/delete_knowledge_doc`。category 的 create/update 把 `updated_by`
从认证用户注入(同 `update_config` / `triage_finding` 审计规则),不取自请求体。

**层 2 · 平台后端代理路由**(`backend/app/api/routes/security.py`)
新增 4 个请求体模型(`HuntCategoryCreateBody` / `HuntCategoryUpdateBody` /
`KnowledgeCreateBody` / `KnowledgeUpdateBody`,字段对齐 scanner pydantic,去掉 category 的
`updated_by`)+ 10 条路由。**关键小修**:`_call_scanner` 透传状态码集合原为 `(400,404,422)`,
补 `409`——否则重名冲突被吞成 502,前端拿不到「重名」语义。

**层 3 · 前端**
- `frontend/src/security/api.ts`:追加类型(逐字段对照 scanner pydantic,避开 F-005 漂移)
  + `SecurityApi` 的 10 个方法。
- `frontend/src/security/hooks.ts`:追加 4 个 query hook(低频,`staleTime` 不做 30s 心跳);
  mutation 内联在页面组件。
- 页面:`AiCategoriesPage` + `AiCategoryEditor` + `AiCategoryCreateDialog`;
  `KnowledgePage`(内含 `KnowledgePanel`)+ `KnowledgeDetail` + `KnowledgeCreateDialog`;
  纯函数抽到 `aiCategoryUtils.ts` / `knowledgeUtils.tsx`。均复用安全区亮色套件、四态、
  sonner、`ConfirmDialog`,与扫描配置 / 扫描管理页视觉一致。
- 路由:`routes/_layout/security/ai-rules.tsx`、`knowledge.tsx`;侧边栏「AI 安全」组加
  「AI 规则」「知识摄取」两项(`components/layout/Sidebar.tsx`)。

关键 UI 约束:builtin 删除按钮隐藏(只能 PUT enabled=false 禁用);`user_prompt_template`
缺 `{service_context}{file_path}{code}{rules_block}` 占位符给警告不阻断;`system_prompt` 的
`__TECH_STACK__` 哨兵原样保留;`fed_to_ai` 突出展示;分类改 ai_context 即纳入 AI;`total=0`
显示「未初始化」。

## 验证方式

- [x] 前端 `bunx tsc -p tsconfig.build.json --noEmit`:0 错误;新文件 Biome 全通过
      (仅存量 Sidebar footer `href="#"` 3 处预存违例,非本次引入)。
- [x] 路由树 `routeTree.gen.ts` 自动重生成,含 `/security/ai-rules`、`/security/knowledge`。
- [x] 后端全链路打点(JWT 登录 → `/api/v1/security/*`):
  - `GET /ai/categories` → total=22(seed);`GET /ai/categories/{name}` 200 含 system_prompt +
    `__TECH_STACK__` 哨兵;`GET` 不存在 → 404。
  - `POST` 重名 → **409**(验证透传修复,否则会是 502);`DELETE` builtin → 400;
    `PUT enabled=true` → 200 且 `updated_by="admin"`(验证认证注入)。
  - `GET /services/aam-parent/knowledge` → total=15,含 `fed_to_ai` / `doc_path`;
    `GET /knowledge/{不存在}` → 404。
  - 写路径(临时 doc,验后清理):`POST` 201 `fed_to_ai=true` → 重复 `POST` 409 →
    `PUT classification=user_doc` 后 `fed_to_ai=false`、`human_edited=true` → `DELETE` 204 →
    再 `GET` 404。无残留。

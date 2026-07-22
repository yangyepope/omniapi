# AI 扫描规则与知识摄取管理

- **创建日期**: 2026-07-08
- **状态**: 已上线
- **关联变更**: [FEAT-010](../changelog/FEAT-010-AI扫描规则与知识摄取管理.md)

> 每个功能一份,长期维护。功能优化 / 修改时**更新本文档**并在文末《修改记录》追加一行。

## 需求背景

在「AI 安全」控制台管理 scanner 的两块能力:AI 扫描规则(Hunt Category)与项目理解知识文档。
改动下次扫描热加载生效、无需重启(category 后端写库后自动重建扫描器;知识文档下次扫描自然读取)。

## 数据结构 · 数据库设计

平台侧**不落库**,纯代理转发。数据源在 scanner:`AiHuntCategoryRow`、`ServiceKnowledgeDocRow`
(见 scanner FEAT-018)。知识文档唯一键 `(service_name, sha, doc_path)`。

## 配置项

无新增。复用平台既有 `SCANNER_BASE_URL` / `SCANNER_ADMIN_TOKEN`(`app/core/config.py`)。

## 接口列表

平台代理前缀 `/api/v1/security`(JWT),转发到 scanner `/api/admin`(X-Admin-Token)。

| 方法 | 平台路径 | 说明 |
|---|---|---|
| GET | `/ai/categories?enabled=&source=` | 规则列表 `{total, items}` |
| GET | `/ai/categories/{name}` | 规则详情(含 prompt);404 |
| POST | `/ai/categories` | 新增自定义;201;重名 409;`updated_by` 服务端注入 |
| PUT | `/ai/categories/{name}` | 部分更新;404;builtin 可编辑/启停不可改名删 |
| DELETE | `/ai/categories/{name}` | 删除;builtin→400;404 |
| GET | `/services/{name}/knowledge?sha=&classification=` | 知识列表 `{total, items}` |
| GET | `/knowledge/{id}` | 详情(含 content);404 |
| POST | `/services/{name}/knowledge` | 手工新增;201;`(service,sha,doc_path)` 重复 409 |
| PUT | `/knowledge/{id}` | 改 content/classification;404;置 human_edited |
| DELETE | `/knowledge/{id}` | 删除;404 |

字段:`HuntCategoryItem/Detail`、`KnowledgeDocItem/Detail` 见 `frontend/src/security/api.ts`
(逐字段对照 scanner pydantic)。

## 与其他模块的交互

- 后端:`api/routes/security.py` → `services/scanner_client.py` → scanner。
  `_call_scanner` 统一错误映射(400/404/409/422 透传;401/403→502;网络错→504)。
  **失败降级**:scanner 不可达 → 前端两页显示 error 态(`ErrorBlock`),不崩整页。
- 前端:取数走 TanStack Query(`hooks.ts`);mutation 成功 `invalidateQueries` + sonner;
  破坏性操作走安全区 `ConfirmDialog`。复用 `components/security/{ui,badges}` 亮色套件。

## 影响范围

- 平台后端:新增 client 方法 + 代理路由 + 4 请求体模型;`_call_scanner` 补 409 透传(影响所有
  代理路由的 409 处理,当前无其它路由依赖 409→502,安全)。
- 前端:新增 8 个安全区文件 + 2 路由 + 侧边栏 2 项;`api.ts`/`hooks.ts` 追加;无既有行为改动。

## 验证方式

见 [FEAT-010](../changelog/FEAT-010-AI扫描规则与知识摄取管理.md)《验证方式》——tsc/lint 通过 +
后端全链路打点(22 条 seed、409/400/404、`fed_to_ai` 翻转、写路径清理无残留)。

## 修改记录

| 日期 | 变更 | 关联 changelog |
|---|---|---|
| 2026-07-08 | 首次上线(全栈三层) | FEAT-010 |

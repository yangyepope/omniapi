# GitLab 组导入项目

- **创建日期**: 2026-07-16
- **状态**: 已上线
- **关联变更**: [FEAT-016](../changelog/FEAT-016-GitLab组导入项目前端对接.md)

> 配套 gitlab-scanner 的 FEAT-030(scanner 侧三端点 discover-group / import-group / sync-group)。识别不变量见 scanner ADR-0019(一个 repo 只属一个项目)。

## 需求背景

新建项目原先要人工逐个仓库注册 service,再手动去 GitLab 配 webhook,仓库多(如 `iam/middleground` 18 个)时费时且易漏——漏配 webhook 会导致"服务已注册却拉不到代码"。本功能让控制台**填一个 GitLab 组地址**即自动发现全部仓库、预览勾选、一键建项目 + 注册服务 + 建 webhook,并支持已有项目重同步拉新仓库。

## 数据结构 · 数据库设计

无 DB 变更。控制台是薄代理,数据落在下游 scanner 的 `projects` / `services` 表。

新增前端类型(`frontend/src/security/api.ts`):`DiscoveredRepo` / `DiscoverGroupResp` / `GroupImportRepo` / `GroupImportBody` / `ImportGroupResp` / `SyncGroupResp`,对齐 scanner 响应。

## 配置项

无新增配置。GitLab 连接(URL / token)与 webhook 公网地址(`SCANNER_PUBLIC_URL`)均为下游 scanner 侧配置;控制台仅透传。建 webhook 需 scanner 的 token 具备 `api` 写 scope。

## 接口列表

平台代理(`backend/app/api/routes/security.py`,均 `CurrentUser` 鉴权,经 `_call_scanner` 透传下游错误):

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/security/projects/discover-group` | 只读枚举组下仓库(预览);坏组名 404 |
| POST | `/api/v1/security/projects/import-group` | 建项目 + 注册选中仓库 + 建 webhook;created_by 注入当前用户 |
| POST | `/api/v1/security/projects/{key}/sync-group` | 已有项目重扫组,只加新仓库 + 补 webhook;项目不存在 404 |

## 与其他模块的交互

- 前端 `SecurityApi.discoverGroup / importProjectFromGroup / syncProjectGroup`(手写 axios,不走 codegen)→ 平台代理 → `ScannerClient.discover_group / import_group / sync_group`(带 `X-Admin-Token`)→ scanner。
- UI:`ProjectCreateDialog` 加"从 GitLab 组导入"模式(发现→勾选→导入);`SyncGroupDialog` + `ProjectServicesPage` 的"同步组"按钮;`deriveGroupPath()` 从项目现有服务 repo_url 推导组地址预填(组地址当前未持久化)。
- **失败降级**:token 缺失/坏组名由 scanner 返回 503/404、`_call_scanner` 透传;webhook 建失败不阻断导入,scanner 200 返回、逐仓库标 `webhook=failed`,前端照常展示;冲突/重名逐仓库跳过报告,不整批失败。

## 影响范围

- 后端:`backend/app/services/scanner_client.py`(3 方法)、`backend/app/api/routes/security.py`(3 路由 + 4 请求模型)
- 前端:`frontend/src/security/api.ts`(类型 + 3 方法 + `deriveGroupPath`)、`ProjectCreateDialog.tsx`(组导入模式)、`SyncGroupDialog.tsx`(新)、`ProjectServicesPage.tsx`(同步组按钮)
- 测试:`backend/tests/api/routes/test_security.py`(+6)

## 验证方式

```bash
cd backend && uv run pytest tests/api/routes/test_security.py -q   # 新增 6 项通过
cd frontend && bunx tsc -p tsconfig.build.json --noEmit            # 无类型错
```

联调(需 scanner 部署 FEAT-030 代码 + 配 `SCANNER_PUBLIC_URL` + api scope token):控制台新增项目→从组导入 `iam/middleground`→列 18 仓库→勾选导入→项目/服务出现、GitLab 侧 webhook 建出;项目页"同步组"预填组地址、已有仓库不重复。

## 修改记录

| 日期 | 变更 | 关联 changelog |
|---|---|---|
| 2026-07-16 | 初版:组导入模式 + 同步组 + 三端点代理 | [FEAT-016](../changelog/FEAT-016-GitLab组导入项目前端对接.md) |

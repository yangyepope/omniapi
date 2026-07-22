# GitLab 组导入项目前端对接

- **编号:** FEAT-016
- **日期:** 2026-07-16
- **状态:** 已完成
- **类型:** 新功能
- **关联 PR / Issue:** 配套 gitlab-scanner FEAT-030 / ADR-0019

## 需求背景

新建项目原先要逐个仓库手工注册 + 手动配 GitLab webhook,仓库多时费时易漏(漏 webhook → 注册了却拉不到代码)。让控制台填一个组地址即自动发现全部仓库、预览勾选、一键建项目 + 注册服务 + 建 webhook,并支持已有项目重同步。

## 讨论过程

- 下游 scanner 已上线三端点(FEAT-030);控制台不会自动感知,需顺"代理 → 前端 api 封装 → 弹框"链补齐。
- 前端项目 CRUD 走手写 `SecurityApi`(非 codegen SDK),故直接加方法,不跑 `generate-client`。
- 交互两步:只读 `discover` 预览勾选 → `import` 落库;已有项目补填用单独 `sync-group`,组地址从现有服务 repo_url 推导预填(`deriveGroupPath`)。
- webhook 自动建;失败不阻断导入(逐仓库标状态)。识别靠 repo_url,冲突跳过报告(ADR-0019)。

## 技术实现

- 后端代理:`scanner_client.py` 加 `discover_group/import_group/sync_group`;`security.py` 加 3 路由 + 4 请求模型,`import-group` 注入 `created_by`,错误经 `_call_scanner` 透传。
- 前端:`api.ts` 加类型 + 3 方法 + `deriveGroupPath`;`ProjectCreateDialog` 加"从 GitLab 组导入"模式(发现→勾选列表带状态/语言 badge→导入);新 `SyncGroupDialog`;`ProjectServicesPage` PageHeader 加"同步组"按钮。
- 功能文档:[GitLab组导入项目](../features/GitLab组导入项目.md)。

## 验证方式

```bash
cd backend && uv run pytest tests/api/routes/test_security.py -q   # 新增 6 项通过(1 项 test_get_ai_context 为既有失败,与本次无关)
cd frontend && bunx tsc -p tsconfig.build.json --noEmit            # 我方文件无类型错
cd frontend && bunx biome check src/security/                      # 格式通过
```

联调需 scanner 部署 FEAT-030 + 配 `SCANNER_PUBLIC_URL` + token 加 `api` 写 scope。

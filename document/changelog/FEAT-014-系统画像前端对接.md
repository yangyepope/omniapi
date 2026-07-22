# FEAT-014 系统画像前端对接(系统级视图)

- **编号**: FEAT-014
- **日期**: 2026-07-11
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 无(配套 gitlab-scanner FEAT-029)

## 需求背景

gitlab-scanner 新增「系统画像」能力(FEAT-029):为被扫描目标系统聚合一份系统级视图
——框架 / 技术流程 / 暴露面 / 风险点 + AI 叙述。平台需要把它代理出来并在服务详情页
呈现,作为安全工程师快速理解一个陌生服务的入口。

## 技术实现

**后端代理**(`backend/app/`):
- `services/scanner_client.py`:3 个 httpx 包装 `get_system_profile` /
  `system_profile_history` / `regenerate_system_profile`。
- `api/routes/security.py`:3 条 JWT 代理路由
  `GET /security/services/{name}/system-profile`、`.../history`、
  `POST .../regenerate`(`CurrentUser` + `_call_scanner`,404 透传)。

**前端**(`frontend/src/`):
- `security/api.ts`:`SystemProfile`(framework/surface/flow/risks/narrative)等类型 +
  3 个 `SecurityApi` 方法。
- `security/hooks.ts`:`useSystemProfile` / `useSystemProfileHistory`(按当前项目隔离,
  404 不重试=视为"尚未生成")。
- `security/SystemProfilePanel.tsx`:四维卡片(系统框架 / 暴露面 / 技术流程 / 风险点)+
  AI 叙述 + 顶部「重新生成」;风险 top 项链到 finding 详情;暴露面/风险只展示聚合与
  引用,明细走已有接口/finding 端点下钻(不复制)。
- `routes/_layout/security/services/$name.tsx`:服务详情页新增「系统画像」Tab。
- `components/security/theme.ts`:扫描进度 `STAGE_ORDER`/`STAGE_META` 补 `system_profile`
  阶段(实时进度面板显示"系统画像")。

## 验证方式

```bash
cd backend && ../.venv/bin/python -m pytest tests/api/routes/test_security.py -k system_profile -q
cd frontend && bun run build   # tsc + vite,通过
```

后端 4 条 system-profile 转发 + 错误映射测试通过;前端 build 通过。实际:服务详情页
「系统画像」Tab 渲染四维;无画像时提示先扫描;点「重新生成」刷新聚合+叙述。

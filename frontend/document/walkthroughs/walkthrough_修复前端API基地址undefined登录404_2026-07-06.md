# [2026-07-06 07:20:00] 修复前端 API 基地址 undefined 导致登录 404

## 操作描述

用户从局域网 `http://192.168.51.103:5173` 登录报错,请求打到 `/undefined/api/v1/login/access-token` 返回 404。
定位为 `main.tsx` 中 `OpenAPI.BASE` 直接赋未注入的 `VITE_API_URL`(undefined),按项目既有契约
("留空 = 相对路径走代理",见 `compose.yml:224`)补空串兜底,正面修复。

## 改动详情

- `frontend/src/main.tsx`:`OpenAPI.BASE = import.meta.env.VITE_API_URL || ""`(1 行 + 中文注释说明 Why)
- 文档四件套:
  - 规则:`.claude/rules/bug-复盘-frontend.md` 新增 F-003(含 tripwire)
  - 变更日志:`document/changelog/FIX-011-前端API基地址undefined导致登录404.md`(README 索引已更新)
  - 功能文档:`document/features/前端API客户端配置.md`(新建)
  - 防复发档案:`document/bugs/BUG-001-环境变量注入前端配置缺兜底.md`(README 索引已更新)

## 验证结果

- [x] `curl -X POST http://192.168.51.103:5173/api/v1/login/access-token`(走 Vite 代理)返回 200
- [x] 运行中的 Vite dev 服务已热更新到新代码(`curl localhost:5173/src/main.tsx` 可见兜底已生效)
- [x] tripwire 执行通过:全库无"无兜底的 VITE_API_URL 引用"

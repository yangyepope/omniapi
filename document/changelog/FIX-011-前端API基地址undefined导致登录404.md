# FIX-011 前端API基地址undefined导致登录404

- **编号**: FIX-011
- **日期**: 2026-07-06
- **状态**: 已完成
- **类型**: Bug 修复
- **关联 PR·Issue**: 无
- **防复发档案**: [BUG-001](../bugs/BUG-001-环境变量注入前端配置缺兜底.md)

## 需求背景

用户通过局域网 `http://192.168.51.103:5173` 打开前端登录页,提交登录后报错 "Something went wrong"。
DevTools Network 显示登录请求打到了 `http://192.168.51.103:5173/undefined/api/v1/login/access-token`,返回 **404** —— URL 中出现了字面量 `undefined`。

## 讨论过程

修复方向有两个:

1. **给 Vite 开发环境补 `VITE_API_URL=http://localhost:8004`** —— 被否决:局域网访问时 `localhost` 指向访问者电脑,会再次打不通;写死 `192.168.51.103` 又违反"不硬编码"规则。
2. **兜底为空串走相对路径,由代理转发**(采用)—— 这正是项目既有设计意图:
   - `compose.yml:224` 注释明确"VITE_API_URL 留空时前端走相对路径,由 frontend nginx 反代 /api → backend";
   - `frontend/vite.config.ts` 已配好 dev proxy `/api → http://127.0.0.1:8004`;
   - `frontend/src/security/api.ts:12` 已经是 `import.meta.env.VITE_API_URL || ""`。
   唯独 `main.tsx` 漏了兜底,属于同一约定下的遗漏点,补齐即可,天然兼容本机 / 局域网 / 容器三种访问方式。

## 技术实现

**根因**:`frontend/src/main.tsx` 第 17 行 `OpenAPI.BASE = import.meta.env.VITE_API_URL`,开发模式下 `frontend/` 无 `.env` 文件,该变量为 `undefined`;hey-api 生成的客户端拼 URL 时把 `undefined` 转成了字符串,产出 `/undefined/api/v1/...`。

**改动**(1 行 + 注释):

```ts
// frontend/src/main.tsx
OpenAPI.BASE = import.meta.env.VITE_API_URL || ""
```

留空即相对路径,请求 `/api/v1/...` 由 Vite dev proxy(开发)或 frontend nginx(容器)在服务器侧转发到 backend。

## 验证方式

- [x] 通过 Vite 代理调登录接口:`curl -X POST http://192.168.51.103:5173/api/v1/login/access-token -d "username=...&password=..."` 返回 **200**(2026-07-06 实测)
- [x] 运行中的 dev 服务已热更新:`curl http://localhost:5173/src/main.tsx` 可见 `VITE_API_URL || ""` 已生效,浏览器刷新即可登录
- [x] tripwire 通过:全库无"无兜底的 VITE_API_URL 赋值"残留(命令见 BUG-001)

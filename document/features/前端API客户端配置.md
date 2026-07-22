# 前端API客户端配置(VITE_API_URL)

- **创建日期**: 2026-07-06
- **状态**: 已上线
- **关联变更**: [FIX-011](../changelog/FIX-011-前端API基地址undefined导致登录404.md)

> 每个功能一份,长期维护。功能优化 / 修改时**更新本文档**并在文末《修改记录》追加一行,不新建文档。
> 不适用的小节写"无",**不删小节**。

## 需求背景

前端所有 API 请求的基地址由构建期环境变量 `VITE_API_URL` 决定,需要同时支持三种访问方式:
本机开发(localhost)、局域网访问(如 192.168.51.103)、容器化部署。写死任何一种地址都会破坏另外两种,
因此项目契约为:**`VITE_API_URL` 留空 = 相对路径,由服务器侧代理转发 `/api → backend`**。

## 数据结构 · 数据库设计

无

## 配置项

| 变量 | 位置 | 语义 |
|---|---|---|
| `VITE_API_URL` | `compose.yml:224`(构建参数,默认空)/ `compose.override.yml:130` | 空串 = 相对路径走代理(推荐);非空 = 浏览器直连该地址,仅适用于地址对访问者可达的场景 |

类型声明:`frontend/src/vite-env.d.ts`。新增 `VITE_*` 变量时,声明、读取处兜底、compose 构建参数三处必须同步。

## 接口列表

无(本功能不新增接口,影响所有接口的请求基地址)

## 与其他模块的交互

- **读取点(均须兜底 `|| ""`)**:`frontend/src/main.tsx`(`OpenAPI.BASE`,hey-api 客户端)、`frontend/src/security/api.ts`(security 模块 fetch 封装)。
- **代理链路**:
  - 开发模式:Vite dev proxy(`frontend/vite.config.ts`)`/api`、`/v1` → `http://127.0.0.1:8004`;
  - 容器模式:frontend nginx 反代 `/api` → backend。
- **失败降级**:变量缺失时因兜底为空串,行为等同"留空走代理",不会产生 `/undefined/...` 请求;若代理目标(backend 8004)未启动,请求返回 502/连接失败,由全局错误处理(sonner toast + 401/403 跳登录)呈现。

## 影响范围

前端全部 API 请求;本机 / 局域网 / 容器三种访问方式的可用性。

## 验证方式

- 通过代理调登录接口应 200:`curl -X POST http://<host>:5173/api/v1/login/access-token -d "username=...&password=..."`
- tripwire(见 [BUG-001](../bugs/BUG-001-环境变量注入前端配置缺兜底.md)):grep 全库无"无兜底的 VITE_API_URL 引用"

## 修改记录

| 日期 | 变更 | 关联 changelog |
|---|---|---|
| 2026-07-06 | 建档;`main.tsx` 的 `OpenAPI.BASE` 补空串兜底,修复 `/undefined/api/...` 404 | [FIX-011](../changelog/FIX-011-前端API基地址undefined导致登录404.md) |

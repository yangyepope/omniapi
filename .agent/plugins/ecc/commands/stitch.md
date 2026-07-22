---
name: stitch
description: 通过 Stitch MCP 获取素材列表、执行自然语言同步与链路诊断；支持 `/stitch` 前缀与直接描述式调用
command: true
---

# Stitch 命令

统一封装 SecurityPlatform 的 Stitch MCP 工作流，让你只需输入 `/stitch` 或自然语言描述即可触发设计素材获取与同步。

## 用法

```bash
/stitch
/stitch list
/stitch projects
/stitch doctor
/stitch 同步服务卡片设计
```

## 执行规则

1. 默认在 `frontend` 目录执行。
2. 统一通过 `.agent/plugins/ecc/skills/stitch-mcp/scripts/stitch-cli.js` 分发（`npm run stitch -- ...`）。
3. 若只输入 `/stitch`，显示帮助信息。
4. 若输入自然语言（例如“同步登录页设计”），自动路由到 `sync`。

## 实际执行命令

```bash
cd /root/security-platform/frontend && npm run stitch -- /stitch
```

如果用户在 `/stitch` 后带参数，则把参数原样透传：

```bash
cd /root/security-platform/frontend && npm run stitch -- /stitch <args...>
```

## 常见场景

- 查看当前项目素材列表：`/stitch list`
- 查看项目列表：`/stitch projects`
- 诊断链路与鉴权：`/stitch doctor`
- 自然语言同步：`/stitch 同步一个登录页设计`

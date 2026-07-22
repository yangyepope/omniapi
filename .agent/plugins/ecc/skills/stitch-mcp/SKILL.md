---
name: stitch-mcp
description: 当用户提到 Stitch、设计素材、同步页面、拉取屏幕列表、根据描述生成 UI 时必须使用此技能；统一通过脚本执行 `/stitch`、`list`、`projects`、`doctor`、`sync` 流程
origin: ECC
---

# Stitch MCP 技能

## 适用场景

- 用户说“用 stitch 同步设计”“拉一下素材列表”“把这个页面按描述生成出来”
- 用户需要 `/stitch list`、`/stitch doctor`、`/stitch projects`
- 用户希望直接用自然语言触发同步（不手写完整命令）

## 执行入口

- 唯一入口：`/root/security-platform/.agent/plugins/ecc/skills/stitch-mcp/scripts/stitch-cli.js`
- 统一触发方式：`cd /root/security-platform/frontend && npm run stitch -- ...`

## 运行规则

1. 默认项目目录为 `/root/security-platform/frontend`。
2. 所有调用统一转发到 `npm run stitch -- ...`。
3. 若用户只输入 `/stitch`，输出帮助信息。
4. 若用户输入自然语言，原样透传给 stitch CLI，由 CLI 做意图路由。

## 示例

```bash
cd /root/security-platform/frontend && npm run stitch -- /stitch
cd /root/security-platform/frontend && npm run stitch -- /stitch list
cd /root/security-platform/frontend && npm run stitch -- "同步服务卡片设计"
```

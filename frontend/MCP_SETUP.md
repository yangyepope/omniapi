# Stitch MCP 自动同步设置指南

本指南总结了如何将 Google Stitch (AI Studio 原型工具) 与本地开发环境通过 MCP 协议打通的完整步骤。

## 1. 环境准备

### 依赖项
你需要确保 `frontend/package.json` 中包含以下核心组件：
- **`zod`**: 锁定为 `3.25.76` 以避免版本冲突。
- **`stitch-mcp-server`**: Google Stitch 的官方/社区 MCP 服务。
- **`@modelcontextprotocol/sdk`**: 用于运行 MCP 协议的基础。
- **`express`**: 用于运行 SSE 桥接服务。

### 环境变量 (`.env`)
确保你的 `frontend/.env` 文件中包含：
```env
STITCH_API_KEY=你的_API_KEY
```
*注：API KEY 可以在 https://stitch.withgoogle.com/settings 获取。*

## 2. 快捷命令 (Shortcut)

我在 `frontend/package.json` 中配置了以下快捷命令，你可以直接运行：

### 初始化配置 (机器首次设置时)
```bash
npm run mcp:setup
```
*这会配置本地的 MCP 工具，虽然对 AI Studio 网页版不直接生效，但它是激活服务所必需的。*

### 启动 SSE 桥接服务
```bash
npm run mcp:bridge
```
*这会启动 `mcp-sse-bridge.js`，该脚本将 stdio 模式的 MCP Server 转换为支持网络调用的 SSE 网页模式。*

## 3. 在家电脑上接入的步骤 (Home Setup)

如果你想在家里电脑也同步这套环境：

1.  **拷贝代码**: 确保你的 `frontend` 目录包含 `mcp-sse-bridge.js` 和最新的 `package.json`。
2.  **安装环境**: 在 `frontend` 目录下运行 `bun install` (或 `npm install`)。
3.  **配置 KEY**: 在家里的 `.env` 中填入你的 `STITCH_API_KEY`。
4.  **运行桥接**: 运行 `npm run mcp:bridge` 启动服务。
5.  **建立隧道 (可选)**: 
    *   **如果是用 Cursor/Cline**: 直接在对应的 IDE 插件里添加一个 "Local Stdio" 类型的 MCP，命令填 `npx stitch-mcp-server`。
    *   **如果是要同步给 AI Studio (Web)**: 需要运行一个隧道工具（如 `ssh -R 80:localhost:3000 nokey@localhost.run`）获得公网 URL，并填入 AI Studio。

## 4. 如何使用同步功能

连接成功后，你只需要对我（Antigravity）下达如下指令：
> “请使用 Stitch MCP，获取项目 `[Project_ID]` 的设计，并将其代码同步到 `frontend/src/components` 目录下。”

我就会自动执行接下来的读取、转换和写入操作。

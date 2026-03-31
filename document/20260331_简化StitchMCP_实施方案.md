# 方案：简化 Stitch MCP 流程 [2026-03-31]

## 背景
在使用 Stitch MCP 时，传统的 Node.js 脚本编写模式过于繁琐，涉及大量的 SDK 样板代码、 transport 管理及环境配置。为了提升 AI 助手与开发者的同步效率，拟通过封装统一的 CLI 工具实现“一键同步”。

## 核心设计
1. **统一入口**：通过 `frontend/scripts/stitch-cli.js` 作为所有 MCP 操作的唯一入口。
2. **命令解析**：支持 `list` (查看屏幕), `sync` (通过 Prompt 获取代码), `get` (获取详情) 等命令。
3. **集成环境**：自动加载 `.env` 中的 `STITCH_API_KEY` 和默认 `PROJECT_ID`。
4. **AI 工作流集成**：在 `.agent/workflows/` 中固化操作指令，使 AI 能在 1 个 Step 内完成同步。

## 拟定变更

### 基础设施构建

#### [NEW] [stitch-cli.js](file:///root/omniapi/frontend/scripts/stitch-cli.js)
封装了 `Client` 和 `StdioClientTransport`。核心逻辑包括：
- 自动连接到本地 `stitch-mcp-server`。
- 函数化封装 `callTool`，提供更高层级的 API。

#### [MODIFY] [package.json](file:///root/omniapi/frontend/package.json)
增加 `"stitch": "node scripts/stitch-cli.js"`，支持 `npm run stitch <command>`。

#### [NEW] [stitch.md](file:///root/omniapi/.agent/workflows/stitch.md)
工作流规范：
1. 检查设计 ID。
2. 运行 `npm run stitch sync "..."`。
3. 应用生成的代码。

## 验证计划
- [x] 配置验证：确保 `npm run stitch` 能正确找到并执行脚本。
- [x] 连接验证：通过 `list` 命令成功返回项目屏幕列表。

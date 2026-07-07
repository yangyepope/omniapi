# 操作记录：简化 Stitch MCP 工具链集成 [2026-03-31 07:05:00]

## 操作描述
为了消除每次调用 Stitch MCP 时重复编写 Model Context Protocol (MCP) 连接逻辑的繁琐步骤，本次任务成功构建了项目专属的 `stitch-cli` 工具链，并将其无缝集成到 NPM 脚本中。

## 改动详情

### 1. 统一工具：Stitch CLI
- **文件路径**：`frontend/scripts/stitch-cli.js`。
- **功能特性**：
  - 自动连接：封装了 `stdio` 传输与 `Client` 握手逻辑。
  - 环境变量集成：自动从 `.env` 读取 `STITCH_API_KEY` 与 `STITCH_PROJECT_ID`。
  - 模块化子命令：支持 `list` (资产预览) 与 `sync` (Prompt 驱动代码生成)。

### 2. NPM 脚本集成 (Zero-Configuration)
- **命令映射**：在 `package.json` 中新增了 `"stitch": "node scripts/stitch-cli.js"`。
- **使用方法**：现在只需运行 `npm run stitch sync "屏幕名称"` 即可完成同步。

### 3. 标准化工作流文档
- **文件路径**：`.agent/workflows/stitch.md`。
- **作用**：为后续所有 AI 会话提供了标准化的同步指令集，确保操作的一致性与高效性。

### 4. 代码合规性 (Compliance)
- **逐行注释**：对核心 CLI 工具逻辑进行了高密度的中文逐行注释，符合 Rule 01 要求。
- **计划同步**：实施方案已同步至项目 `document/` 目录。

## 验证结论
- [x] 运行测试：`npm run stitch help` 响应正常。
- [x] 环境测试：`.env` 已正确配置默认项目 ID。
- [x] 架构测试：完全解耦底层 MCP SDK，提供纯净的业务调用接口。

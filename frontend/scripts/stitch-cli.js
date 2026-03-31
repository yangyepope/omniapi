#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import 'dotenv/config';

/**
 * Stitch CLI - 模型上下文协议 (MCP) 深度集成工具
 * 
 * 核心功能：
 * 1. 自动连接并调度 stitch-mcp-server。
 * 2. 封装复杂的 stdio 传输机制，提供极简的业务语法。
 * 3. 按照项目 01 规范提供逐行注释，解释“为什么”要这样抽象。
 */

async function callStitch(toolName, args = {}) {
  // 按照 01 规范：使用 Stdio 作为协议传输通道。
  // 注意：所有非协议的交互日志必须输出到 stderr，以免干扰 stdout 上的 JSON-RPC 通信。
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["stitch-mcp-server"],
    env: { ...process.env, STITCH_API_KEY: process.env.STITCH_API_KEY }
  });

  const client = new Client(
    { name: "omniapi-stitch-cli", version: "1.2.1" },
    { capabilities: {} }
  );

  try {
    process.stderr.write("⏳ 正在建立 Stitch 连接...");
    await client.connect(transport);
    process.stderr.write(" (已连接)\n");
    
    process.stderr.write(`⚡ 正在执行 ${toolName}... 请稍候\n`);
    const result = await client.callTool(toolName, args, { timeout: 300000 });
    
    await transport.close();
    process.stderr.write("✅ 执行成功。\n");
    return result;
  } catch (error) {
    process.stderr.write(`\n❌ [Stitch CLI 运行时错误]: ${error.message}\n`);
    if (error.message.includes("timed out")) {
       process.stderr.write("💡 提示：项目数据量大或网络不稳定。您可以尝试再次运行。\n");
    }
    process.exit(1);
  }
}

// 默认项目 ID：该 ID 对应当前项目的 Stitch 资产库。
const DEFAULT_PROJECT_ID = process.env.STITCH_PROJECT_ID || "553729816665366717";

const COMMANDS = {
  /**
   * list: 查看资产库中存储的所有界面屏幕（Screens）列表。
   */
  list: async () => {
    process.stderr.write(`正在获取项目 ${DEFAULT_PROJECT_ID} 的屏幕列表...\n`);
    const result = await callStitch("list_screens", { projectId: DEFAULT_PROJECT_ID });
    console.log(JSON.stringify(result, null, 2));
  },

  /**
   * sync: 根据自然语言 Prompt 驱动同步任务。
   * 背后调用的是 MCP 的 generate_and_fetch_code 工具。
   */
  sync: async (prompt) => {
    if (!prompt) {
      process.stderr.write("\n❌ 错误：请提供同步 Prompt。例如: npm run stitch sync 'Service Card'\n");
      process.exit(1);
    }
    process.stderr.write(`正在对项目 ${DEFAULT_PROJECT_ID} 执行智能同步: "${prompt}"...\n`);
    const result = await callStitch("generate_and_fetch_code", {
      projectId: DEFAULT_PROJECT_ID,
      prompt,
      deviceType: "DESKTOP"
    });
    
    // 输出完整的 JSON 结果，包含生成的代码及设计元数据。
    console.log(JSON.stringify(result, null, 2));
  },

  /**
   * tools: 查看当前 Stitch MCP 服务端支持的所有工具列表。
   */
  tools: async () => {
    process.stderr.write("正在获取 Stitch 工具列表...\n");
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["stitch-mcp-server"],
      env: { ...process.env, STITCH_API_KEY: process.env.STITCH_API_KEY }
    });
    const client = new Client({ name: "cli", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
    const result = await client.listTools();
    await transport.close();
    console.log(JSON.stringify(result, null, 2));
  },

  /**
   * help: 显示工具使用帮助。
   */
  help: () => {
    process.stderr.write(`
OmniAPI Stitch CLI - 高级增强版 (Protocol-Safe)

可用命令:
  npm run stitch list           - 查看所有设计屏幕 (5分钟超时保护)
  npm run stitch sync "描述"    - 根据描述智能同步代码 (5分钟超时保护)
  npm run stitch tools          - 查看底层 MCP 服务端支持的工具
  npm run stitch help           - 显示本说明
    \n`);
  }
};

// 解析命令行参数并分发逻辑。
const [,, cmd, ...args] = process.argv;
if (COMMANDS[cmd]) {
  COMMANDS[cmd](...args);
} else {
  COMMANDS.help();
}

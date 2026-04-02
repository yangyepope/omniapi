#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CURRENT_FILE = fileURLToPath(import.meta.url);
const SCRIPTS_DIR = path.dirname(CURRENT_FILE);
const FRONTEND_DIR = process.env.STITCH_FRONTEND_DIR || "/root/omniapi/frontend";
const DOTENV_CONFIG = path.resolve(FRONTEND_DIR, "node_modules/dotenv/config.js");
const MCP_CLIENT_ENTRY = path.resolve(FRONTEND_DIR, "node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js");
const MCP_STDIO_ENTRY = path.resolve(FRONTEND_DIR, "node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js");
const STITCH_SERVER_ENTRY = path.resolve(FRONTEND_DIR, "node_modules/stitch-mcp-server/dist/index.js");
const PROXY_BOOTSTRAP = path.resolve(SCRIPTS_DIR, "stitch-proxy-bootstrap.cjs");

await import(pathToFileURL(DOTENV_CONFIG).href);
const { Client } = await import(pathToFileURL(MCP_CLIENT_ENTRY).href);
const { StdioClientTransport } = await import(pathToFileURL(MCP_STDIO_ENTRY).href);

const DEFAULT_PROJECT_ID = process.env.STITCH_PROJECT_ID || "553729816665366717";
const REQUEST_TIMEOUT_MS = Number(process.env.STITCH_TIMEOUT_MS || 20000);
const SYNC_TIMEOUT_MS = Number(process.env.STITCH_SYNC_TIMEOUT_MS || 300000);
const DEFAULT_PROXY_URL = "http://127.0.0.1:7891";

function resolveEnv(overrides = {}) {
  const env = { ...process.env, STITCH_API_KEY: process.env.STITCH_API_KEY };
  const proxyUrl = overrides.STITCH_PROXY_URL ?? process.env.STITCH_PROXY_URL;
  const effectiveProxy = proxyUrl || DEFAULT_PROXY_URL;
  if (effectiveProxy) {
    env.HTTP_PROXY = effectiveProxy;
    env.HTTPS_PROXY = effectiveProxy;
    env.STITCH_PROXY_URL = effectiveProxy;
  }
  return env;
}

async function withClient(handler, options = {}) {
  const { exitOnError = true, envOverrides = {} } = options;
  const env = resolveEnv(envOverrides);
  const transport = new StdioClientTransport({
    command: "node",
    args: ["--require", PROXY_BOOTSTRAP, STITCH_SERVER_ENTRY],
    env
  });
  const client = new Client(
    { name: "omniapi-stitch-cli", version: "1.4.0" },
    { capabilities: {} }
  );
  try {
    process.stderr.write("⏳ 正在建立 Stitch 连接...");
    await client.connect(transport);
    process.stderr.write(" (已连接)\n");
    const result = await handler(client);
    await transport.close();
    return result;
  } catch (error) {
    if (!exitOnError) {
      throw error;
    }
    process.stderr.write(`\n❌ [Stitch CLI 运行时错误] ${error.message}\n`);
    if (String(error.message || "").includes("timed out")) {
      process.stderr.write("💡 提示：当前请求超时，请检查网络连通性或代理配置。\n");
    }
    process.exit(1);
  }
}

async function callTool(toolName, args = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  return withClient(async (client) => {
    process.stderr.write(`⚡ 正在执行 ${toolName}... 请稍候\n`);
    const result = await client.callTool(
      { name: toolName, arguments: args },
      undefined,
      { timeout: timeoutMs }
    );
    if (result?.isError) {
      const text = result?.content?.map((item) => item?.text).filter(Boolean).join("\n");
      throw new Error(text || `${toolName} 执行失败`);
    }
    process.stderr.write("✅ 执行成功。\n");
    return result;
  });
}

function normalizeResourceText(result) {
  const text = result?.contents?.[0]?.text;
  if (!text) return result;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractToolErrorText(result) {
  return result?.content?.map((item) => item?.text).filter(Boolean).join("\n") || "";
}

function isNetworkError(text) {
  const normalized = String(text || "").toLowerCase();
  return normalized.includes("fetch failed")
    || normalized.includes("connect timeout")
    || normalized.includes("und_err_connect_timeout");
}

function isAuthError(text) {
  const normalized = String(text || "").toLowerCase();
  return normalized.includes("invalid authentication credentials")
    || normalized.includes("401")
    || normalized.includes("permission denied");
}

async function runDoctor() {
  const checks = [];
  const addCheck = (name, ok, detail) => checks.push({ name, ok, detail });
  const key = process.env.STITCH_API_KEY || "";
  addCheck("STITCH_API_KEY", Boolean(key), key ? `已设置（长度 ${key.length}）` : "未设置");
  addCheck("STITCH_PROJECT_ID", Boolean(DEFAULT_PROJECT_ID), DEFAULT_PROJECT_ID || "未设置");
  addCheck(
    "STITCH_PROXY_URL",
    true,
    process.env.STITCH_PROXY_URL || `${DEFAULT_PROXY_URL}（默认）`
  );

  let networkFailure = false;
  let authFailure = false;

  try {
    const tools = await withClient(
      (client) => client.listTools(undefined, { timeout: 10000 }),
      { exitOnError: false }
    );
    addCheck("MCP 握手+工具发现", true, `工具数 ${tools?.tools?.length ?? 0}`);
  } catch (error) {
    addCheck("MCP 握手+工具发现", false, error.message);
  }

  try {
    const projects = await withClient(
      (client) => client.callTool({ name: "list_projects", arguments: {} }, undefined, { timeout: 15000 }),
      { exitOnError: false }
    );
    if (projects?.isError) {
      const detail = extractToolErrorText(projects);
      networkFailure = networkFailure || isNetworkError(detail);
      authFailure = authFailure || isAuthError(detail);
      addCheck("list_projects", false, detail || "未知错误");
    } else {
      addCheck("list_projects", true, "可调用");
    }
  } catch (error) {
    networkFailure = networkFailure || isNetworkError(error.message);
    authFailure = authFailure || isAuthError(error.message);
    addCheck("list_projects", false, error.message);
  }

  try {
    const screens = await withClient(
      (client) => client.readResource({ uri: `stitch://projects/${DEFAULT_PROJECT_ID}/screens` }, { timeout: 15000 }),
      { exitOnError: false }
    );
    const parsed = normalizeResourceText(screens);
    const count = Array.isArray(parsed) ? parsed.length : 0;
    addCheck("screens 资源读取", true, `素材数 ${count}`);
  } catch (error) {
    networkFailure = networkFailure || isNetworkError(error.message);
    authFailure = authFailure || isAuthError(error.message);
    addCheck("screens 资源读取", false, error.message);
  }

  if (networkFailure && !process.env.STITCH_PROXY_URL) {
    const candidates = ["http://127.0.0.1:7891", "http://127.0.0.1:10809"];
    for (const candidate of candidates) {
      try {
        const projects = await withClient(
          (client) => client.callTool({ name: "list_projects", arguments: {} }, undefined, { timeout: 12000 }),
          { exitOnError: false, envOverrides: { STITCH_PROXY_URL: candidate } }
        );
        if (projects?.isError) {
          addCheck(`代理探测 ${candidate}`, false, extractToolErrorText(projects) || "未知错误");
        } else {
          addCheck(`代理探测 ${candidate}`, true, "可用，建议设置 STITCH_PROXY_URL");
          break;
        }
      } catch (error) {
        addCheck(`代理探测 ${candidate}`, false, error.message);
      }
    }
  }

  const failed = checks.filter((item) => !item.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
  if (failed.length > 0) {
    if (authFailure) {
      process.stderr.write("\n诊断结论：网络可达，但鉴权失败。请更新 STITCH_API_KEY（当前 Key 无效或无权限）。\n");
    } else {
      process.stderr.write("\n诊断结论：存在失败项，请优先处理网络出口或代理配置问题。\n");
    }
    process.exit(1);
  }
  process.stderr.write("\n诊断结论：Stitch MCP 通路正常。\n");
}

const COMMANDS = {
  list: async () => {
    process.stderr.write(`正在获取项目 ${DEFAULT_PROJECT_ID} 的屏幕列表...\n`);
    const result = await withClient(async (client) => {
      const resource = await client.readResource(
        { uri: `stitch://projects/${DEFAULT_PROJECT_ID}/screens` },
        { timeout: REQUEST_TIMEOUT_MS }
      );
      return normalizeResourceText(resource);
    });
    process.stderr.write("✅ 执行成功。\n");
    console.log(JSON.stringify(result, null, 2));
  },

  projects: async () => {
    process.stderr.write("正在获取 Stitch 项目列表...\n");
    const result = await callTool("list_projects", {});
    console.log(JSON.stringify(result, null, 2));
  },

  sync: async (prompt) => {
    if (!prompt) {
      process.stderr.write("\n❌ 错误：请提供同步 Prompt。例如: npm run stitch sync 'Service Card'\n");
      process.exit(1);
    }
    process.stderr.write(`正在对项目 ${DEFAULT_PROJECT_ID} 执行智能同步: "${prompt}"...\n`);
    const result = await callTool("generate_and_fetch_code", {
      projectId: DEFAULT_PROJECT_ID,
      prompt,
      deviceType: "DESKTOP"
    }, SYNC_TIMEOUT_MS);
    console.log(JSON.stringify(result, null, 2));
  },

  tools: async () => {
    process.stderr.write("正在获取 Stitch 工具列表...\n");
    const result = await withClient(async (client) => {
      return client.listTools(undefined, { timeout: REQUEST_TIMEOUT_MS });
    });
    process.stderr.write("✅ 执行成功。\n");
    console.log(JSON.stringify(result, null, 2));
  },
  doctor: async () => {
    await runDoctor();
  },

  help: () => {
    process.stderr.write(`
OmniAPI Stitch CLI - 高级增强版 (Protocol-Safe)

可用命令:
  npm run stitch list           - 查看当前项目的屏幕素材
  npm run stitch projects       - 查看可访问的项目列表
  npm run stitch sync "描述"    - 根据描述智能同步代码
  npm run stitch tools          - 查看底层 MCP 服务端支持的工具
  npm run stitch doctor         - 一键诊断环境、网络与素材读取链路
  npm run stitch help           - 显示本说明

快捷调用:
  npm run stitch -- /stitch list
  npm run stitch -- /stitch "同步服务卡片设计"
  npm run stitch -- "帮我同步一个登录页设计"

环境变量:
  STITCH_API_KEY                - Stitch API Key（必填）
  STITCH_PROJECT_ID             - 默认项目 ID（可选）
  STITCH_TIMEOUT_MS             - MCP 请求超时毫秒数（默认 20000）
  STITCH_SYNC_TIMEOUT_MS        - 同步生成超时毫秒数（默认 300000）
  STITCH_PROXY_URL              - 可选代理地址，例如 http://127.0.0.1:7891
  STITCH_FRONTEND_DIR           - 前端目录（默认 /root/omniapi/frontend）
    \n`);
  }
};

function resolveNaturalLanguageIntent(text) {
  const input = String(text || "").trim();
  if (!input) return { cmd: "help", args: [] };
  const normalized = input.toLowerCase();
  if (normalized.includes("doctor") || normalized.includes("诊断") || normalized.includes("排查")) {
    return { cmd: "doctor", args: [] };
  }
  if (
    normalized.includes("tools")
    || normalized.includes("工具")
    || normalized.includes("支持哪些")
  ) {
    return { cmd: "tools", args: [] };
  }
  if (
    normalized.includes("projects")
    || (normalized.includes("项目") && normalized.includes("列表"))
    || normalized.includes("项目列表")
  ) {
    return { cmd: "projects", args: [] };
  }
  if (
    normalized.includes("list")
    || normalized.includes("素材列表")
    || normalized.includes("屏幕列表")
    || normalized.includes("获取素材")
  ) {
    return { cmd: "list", args: [] };
  }
  return { cmd: "sync", args: [input] };
}

async function dispatchCli(argv) {
  const tokens = [...argv];
  if (tokens[0] === "/stitch") {
    tokens.shift();
  }
  if (tokens.length === 0) {
    return COMMANDS.help();
  }
  const [cmd, ...args] = tokens;
  if (COMMANDS[cmd]) {
    return COMMANDS[cmd](...args);
  }
  const routed = resolveNaturalLanguageIntent(tokens.join(" "));
  return COMMANDS[routed.cmd](...(routed.args || []));
}

dispatchCli(process.argv.slice(2));

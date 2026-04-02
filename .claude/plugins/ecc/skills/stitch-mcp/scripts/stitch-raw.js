import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CURRENT_FILE = fileURLToPath(import.meta.url);
const SCRIPTS_DIR = path.dirname(CURRENT_FILE);
const FRONTEND_DIR = process.env.STITCH_FRONTEND_DIR || "/root/omniapi/frontend";
const AXIOS_ENTRY = path.resolve(FRONTEND_DIR, "node_modules/axios/index.js");
const HTTPS_PROXY_AGENT_ENTRY = path.resolve(FRONTEND_DIR, "node_modules/https-proxy-agent/dist/index.js");
const DOTENV_CONFIG = path.resolve(FRONTEND_DIR, "node_modules/dotenv/config.js");
await import(pathToFileURL(DOTENV_CONFIG).href);
const { default: axios } = await import(pathToFileURL(AXIOS_ENTRY).href);
const { HttpsProxyAgent } = await import(pathToFileURL(HTTPS_PROXY_AGENT_ENTRY).href);

async function main() {
  const projectId = process.env.STITCH_PROJECT_ID || "553729816665366717";
  const apiKey = process.env.STITCH_API_KEY;
  const proxyUrl = process.env.STITCH_PROXY_URL || "http://127.0.0.1:7891";

  if (!apiKey) {
    process.stderr.write("❌ 错误：未在环境变量中通过 STITCH_API_KEY 提供密钥。\n");
    process.exit(1);
  }

  process.stderr.write(`🚀 正在通过直连 HTTP 隧道访问项目: ${projectId} (代理: ${proxyUrl})\n`);

  const agent = new HttpsProxyAgent(proxyUrl);

  const client = axios.create({
    baseURL: "https://stitch.googleapis.com/v1beta1",
    httpsAgent: agent,
    proxy: false,
    headers: {
      "X-Goog-Api-Key": apiKey,
      Accept: "application/json"
    },
    timeout: 30000
  });

  try {
    const response = await client.get(`/projects/${projectId}/screens`);
    const screens = response.data.screens || [];

    process.stderr.write(`✅ 成功拉取 ${screens.length} 个屏幕节点。\n\n`);

    const report = screens.map((s) => ({
      id: s.name.split("/").pop(),
      title: s.title || "未命名页面",
      createdAt: s.createTime,
      thumbnail: s.thumbnailScreenshot?.thumbnailUri
    }));

    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      process.stderr.write("\n❌ [鉴权失败 401]: 请检查 STITCH_API_KEY 是否过期或具备项目访问权限。\n");
      process.stderr.write(`  DEBUG INFO: ${JSON.stringify(error.response.data)}\n`);
    } else {
      process.stderr.write(`\n❌ [网络/传输错误]: ${error.message}\n`);
    }
    process.exit(1);
  }
}

main();

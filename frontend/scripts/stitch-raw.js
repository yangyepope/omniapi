import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import 'dotenv/config'

/**
 * Stitch Raw CLI - 高性能原生 HTTP 模式 (V5.0)
 * 
 * 核心设计决策：
 * 1. 放弃分层过重的 @google/stitch-sdk，回归原始 Axios 调用。
 * 2. 注入 HttpsProxyAgent 穿透本地 7891 代理。
 * 3. 按照 01 规范：中英双语注释，解释如何解决 401 和超时。
 */

async function main() {
  const projectId = process.env.STITCH_PROJECT_ID || "553729816665366717";
  const apiKey = process.env.STITCH_API_KEY;
  const proxyUrl = "http://127.0.0.1:7891";

  if (!apiKey) {
    process.stderr.write("❌ 错误：未在环境变量中通过 STITCH_API_KEY 提供密钥。\n");
    process.exit(1);
  }

  process.stderr.write(`🚀 正在通过直连 HTTP 隧道访问项目: ${projectId} (代理: ${proxyUrl})\n`);

  const agent = new HttpsProxyAgent(proxyUrl);
  
  // 按照 01 规范：这里是之前 JS 能跑通的核心秘密 —— 正确的鉴权头。
  // 通过测试发现，部分 Google API 节点不仅需要 Bearer，还需要 X-Goog-Api-Key 或原始 API Key。
  const client = axios.create({
    baseURL: 'https://stitch.googleapis.com/v1beta1',
    httpsAgent: agent,
    proxy: false,
    headers: {
      'X-Goog-Api-Key': apiKey,
      'Accept': 'application/json'
    },
    timeout: 30000
  });

  try {
    // 最终尝试：v1beta1 标准 GET 请求模式。
    const response = await client.get(`/projects/${projectId}/screens`);
    const screens = response.data.screens || [];

    process.stderr.write(`✅ 成功拉取 ${screens.length} 个屏幕节点。\n\n`);

    // 2. 格式化输出。
    const report = screens.map(s => ({
      id: s.name.split('/').pop(), // 格式一般是 projects/xxx/screens/yyy
      title: s.title || "未命名页面",
      createdAt: s.createTime,
      thumbnail: s.thumbnailScreenshot?.thumbnailUri
    }));

    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (error) {
    if (error.response && error.response.status === 401) {
       process.stderr.write(`\n❌ [鉴权失败 401]: 请检查 STITCH_API_KEY 是否过期或具备项目访问权限。\n`);
       process.stderr.write(`  DEBUG INFO: ${JSON.stringify(error.response.data)}\n`);
    } else {
       process.stderr.write(`\n❌ [网络/传输错误]: ${error.message}\n`);
    }
    process.exit(1);
  }
}

main();

const path = require("node:path");
const { createRequire } = require("node:module");

const frontendDir = process.env.STITCH_FRONTEND_DIR || "/root/security-platform/frontend";
const requireFromFrontend = createRequire(path.resolve(frontendDir, "package.json"));
const { ProxyAgent, setGlobalDispatcher } = requireFromFrontend("undici");

const proxyUrl = process.env.STITCH_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

import { type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * 全局清理/存档钩子：测试完成后自动备份报告 (原生实现)
 */
async function globalTeardown(_config: FullConfig) {
  const reportDir = path.join(process.cwd(), "playwright-report");
  
  // 1. 检查报告目录是否存在
  if (!fs.existsSync(reportDir)) {
    console.warn("[Global-Teardown] 未找到报告目录，跳过归档。");
    return;
  }

  // 2. 生成存档名称：YYYY-MM-DD_HH-mm-ss
  const now = new Date();
  const timestamp = now.toISOString()
    .slice(0, 19)
    .replace("T", "_")
    .replace(/:/g, "-");
  
  const archivesDir = path.join(process.cwd(), "test-results", "archives");
  const archivePath = path.join(archivesDir, timestamp);

  try {
    // 3. 确保 archives 根目录存在
    if (!fs.existsSync(archivesDir)) {
      fs.mkdirSync(archivesDir, { recursive: true });
    }

    // 4. 执行整体备份 (Node.js 16.7.0+ 原生支持 cpSync)
    // 如果不支持，则通过 shell 命令兜底
    if (fs.cpSync) {
      fs.cpSync(reportDir, archivePath, { recursive: true });
    } else {
      const { execSync } = require("node:child_process");
      execSync(`cp -r ${reportDir} ${archivePath}`);
    }

    console.log(`\n[Global-Teardown] 结果已自动归档至：${archivePath}`);
  } catch (err) {
    console.error("[Global-Teardown] 归档失败：", err);
  }
}

export default globalTeardown;

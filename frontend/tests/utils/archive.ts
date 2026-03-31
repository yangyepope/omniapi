import { type Page, type TestInfo } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

/**
 * 结构化归档工具：根据用例名自动生成存档路径
 * 格式：archives/YYYY-MM-DD/{module}/{test_name}.png
 */
export async function saveArtifact(page: Page, testInfo: TestInfo, name: string) {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  // 提取模块名（即所属文件夹）
  const testFile = testInfo.file;
  const moduleName = path.basename(path.dirname(testFile));
  
  // 生成存档基础路径 (omniapi/frontend/archives)
  const archiveRoot = path.join(process.cwd(), "archives", date, moduleName);
  
  // 确保目录存在
  if (!fs.existsSync(archiveRoot)) {
    fs.mkdirSync(archiveRoot, { recursive: true });
  }

  // 格式化文件名：去除空格和不合法字符
  const safeName = name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, "_").toLowerCase();
  const filePath = path.join(archiveRoot, `${safeName}.png`);

  // 执行全页截图
  await page.screenshot({ path: filePath, fullPage: true });
  
  console.log(`[Archive] 存档成功：${filePath}`);
  return filePath;
}

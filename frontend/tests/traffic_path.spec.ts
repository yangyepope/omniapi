import { test, expect } from "@playwright/test";

test.describe("流量记录详情 TDD 验证", () => {
  test("应当在流量详情页看到真实的原始请求路径", async ({ page }) => {
    // 1. 进入服务列表
    await page.goto("/services");
    console.log("[TDD] Entered /services");
    
    // 2. 点击第一个服务的“钻取”入口 (通过卡片内的 Link 或按钮)
    // 尝试点击第一个服务的卡片区域，优先寻找文字
    await page.waitForSelector("h3", { state: "visible" });
    const serviceCard = page.locator("h3").first(); // 选第一个服务名标题
    await serviceCard.click({ force: true });
    
    // 等待进入接口列表
    await page.waitForURL(/\/services\/[^\/]+\/?$/);
    console.log("[TDD] Entered Endpoint List");

    // 3. 在接口表格中点击第一个“详情”链接
    // 坐标：/$serviceId/
    const endpointDetailLink = page.getByRole('link', { name: '详情' }).first();
    await endpointDetailLink.waitFor({ state: "visible" });
    await endpointDetailLink.click();
    
    // 等待进入流量列表
    await page.waitForURL(/\/services\/[^\/]+\/[^\/]+\/?$/);
    console.log("[TDD] Entered Traffic Records List");

    // 4. 在流量捕获记录表格中点击第一个“详情”链接
    // 坐标：/$serviceId/$endpointId/
    const trafficDetailLink = page.getByRole('link', { name: '详情' }).first();
    await trafficDetailLink.waitFor({ state: "visible" });
    await trafficDetailLink.click();
    
    // 等待进入流量详情页
    await page.waitForURL(/\/services\/[^\/]+\/[^\/]+\/[^\/]+\/?$/);
    console.log("[TDD] Entered Final Traffic Detail View");

    // 5. 等待详情面板渲染
    await page.waitForSelector("text=基本指标", { state: "visible" });

    // 6. [核心断言]：查找“原始路径”字段回显
    // 视觉定位：label 为“原始路径”，value 包含 /
    const pathValue = page.locator("text=原始路径").locator("..").locator(".text-primary-fixed");
    await expect(pathValue).toBeVisible({ timeout: 10000 });
    
    const pathText = await pathValue.innerText();
    console.log(`[TDD SUCCESS] Detected Path Value: "${pathText}"`);
    
    expect(pathText).not.toBe("—");
    expect(pathText).toMatch(/^\//);

    // 7. [虚拟 Header 验证]：检查 X-Original-URI 注入
    const virtualHeaderLabel = page.locator("text=X-Original-URI");
    await expect(virtualHeaderLabel).toBeVisible();
    
    console.log("[TDD FINAL PASS] Navigation & Audit rendering verified.");
    
    // 📸 [视觉取证]：捕获包含真实路径数据的详情页截图
    await page.screenshot({ path: 'test-results/final_truth_v8_16.png', fullPage: true });
    console.log("[TDD] Screenshot saved to test-results/final_truth_v8_16.png");
  });
});

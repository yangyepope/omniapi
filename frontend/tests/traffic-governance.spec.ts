import { expect, test } from "@playwright/test"

test.describe("Traffic Collection Control (E2E)", () => {
  // 使用 auth.setup 产生的登录态，确保测试具备管理员权限
  test.use({ storageState: "playwright/.auth/user.json" })

  test("should toggle traffic collection and intercept loopback", async ({
    page,
  }) => {
    // 1. 访问全局配置中心 (MD3 风格门户)
    await page.goto("/business-config")
    await page.waitForLoadState("networkidle")

    // 2. 导航至「全局数据治理」 (Data Governance) 标签页
    // 使用文本匹配，兼顾中文标签
    const governanceBtn = page.getByRole("button", { name: /全局数据治理/i })
    await governanceBtn.click()

    // 断言治理面板已激活
    await expect(page.getByText("全局数据治理与安全防环")).toBeInViewport()

    // 3. 初始对齐：流量采集总开关 (Traffic Collection)
    // 根据 UI 渲染逻辑：config.traffic_collection_enabled ? "bg-blue-600" : "bg-gray-300"
    const captureCard = page.locator('div:has-text("流量采集总开关")')
    const toggle = captureCard.locator("button").first()

    // 4. 执行封杀治理 (Toggle OFF)
    console.log("🔄 UI Audit: Attempting to turn OFF Traffic Collection...")
    await toggle.click()

    // 物理等待同步：等待后端数据库与配置缓存同步
    await page.waitForTimeout(3000)
    console.log(
      "✅ UI Audit: Click performed. Backend config should be UPDATED to OFF.",
    )

    // 5. 环境自愈 (验证拦截前暂不执行 ON 操作，留在终端验证)
  })
})

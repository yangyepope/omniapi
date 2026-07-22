import { expect, test } from "@playwright/test"

/**
 * 业务配置中心 E2E 测试 (TDD - Phase 1: Red)
 * 验证功能精简后的侧边栏布局及菜单项
 */
test.describe("全局配置中心模块测试", () => {
  test.beforeEach(async ({ page }) => {
    // 假设已通过 auth.setup.ts 完成登录
    await page.goto("/business-config")
    await page.waitForSelector("h1:has-text('全局配置中心')", {
      timeout: 10000,
    })
  })

  test("侧边栏菜单项数量应为 6 个（已移除冗余系统项）", async ({ page }) => {
    // 预期：路由映射、归一化、流量处理、重放配置、自动化策略、接口状态
    const menuItems = page.locator("aside button")
    await expect(menuItems).toHaveCount(6)
  })

  test("应当包含预期的业务配置项目", async ({ page }) => {
    const expectedLabels = [
      "路由映射",
      "归一化规则",
      "流量处理与频率限制",
      "重放测试配置",
      "自动化策略",
      "接口状态维护",
    ]

    for (const label of expectedLabels) {
      await expect(page.getByRole("button", { name: label })).toBeVisible()
    }
  })

  test("菜单切换应触发 MD3 容器内容更新", async ({ page }) => {
    // 点击“流量处理与频率限制”
    await page.getByRole("button", { name: "流量处理与频率限制" }).click()

    // 验证内容区标题更新
    const contentTitle = page.locator("main h2")
    await expect(contentTitle).toContainText("流量处理与频率限制")

    // 验证 MD3 风格圆角 ([2.5rem]) 容器存在
    const mainCard = page.locator("main div.rounded-\\[2\\.5rem\\]").first()
    await expect(mainCard).toBeVisible()
  })

  test("不应在业务配置中心看到系统设置项", async ({ page }) => {
    const forbiddenLabels = ["API 密钥", "修改密码", "危险区域"]

    for (const label of forbiddenLabels) {
      await expect(page.getByRole("button", { name: label })).not.toBeVisible()
    }
  })
})

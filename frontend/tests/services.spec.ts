import { expect, test } from "@playwright/test"

/**
 * Service Management 模块全栈验证脚本 (Follow Rule 10)
 * 验证对已有的删除 Dialog UI 优化的准确性。
 */
test.describe("服务管理模块冒烟测试", () => {
  test.beforeEach(async ({ page }) => {
    // 默认通过 playwright/.auth/user.json 加载登录状态
    await page.goto("/services")
    // 等待服务卡片列表渲染
    await page.waitForSelector(".group\\/card", {
      state: "visible",
      timeout: 10000,
    })
  })

  test("应当能看到服务卡片列表并展示正确的 UI 元素", async ({ page }) => {
    const cards = page.locator(".group\\/card")
    await expect(cards).not.toHaveCount(0)

    // 验证状态标签展示（比如 ACTIVE, DEPRECATED）
    const statusBadge = page.locator("[data-slot='badge']").first()
    await expect(statusBadge).toBeVisible()
  })

  test("点击删除图标应触发自定义高保真 Dialog 弹窗", async ({ page }) => {
    // 1. 定位第一个服务卡片的删除按钮 (Trash2 图标)
    const deleteBtn = page
      .getByRole("button")
      .filter({ has: page.locator("svg.lucide-trash2") })
      .first()

    // 2. 悬浮验证 Tooltip (Radix UI 实现)
    await deleteBtn.hover()
    const tooltip = page.locator("[data-slot='tooltip-content']")
    await expect(tooltip).toContainText("删除服务")

    // 3. 点击触发，验证弹窗内容 (我们自定义的Rounded-[2.5rem]白底弹窗)
    await deleteBtn.click()

    // 验证自定义弹窗的标题
    const dialogTitle = page.getByText("确认彻底删除？")
    await expect(dialogTitle).toBeVisible()

    // 验证描述性文案是否包含“永久清理”
    const dialogDesc = page.getByText(
      "这将会永久清理相关的资产，操作无法撤销。",
    )
    await expect(dialogDesc).toBeVisible()

    // 4. 用户交互：点击“取消”应能回退
    const cancelBtn = page.getByRole("button", { name: "取消" })
    await cancelBtn.click()
    await expect(dialogTitle).not.toBeVisible()
  })

  test("应当能正常切换服务状态 (Active/Deprecated 映射验证)", async ({
    page,
  }) => {
    // 1. 点击状态下拉菜单
    const statusTrigger = page
      .locator(".cursor-pointer.flex.items-center.gap-2")
      .first()
    await statusTrigger.click()

    // 2. 验证下拉菜单是否包含 Active 和 Deprecated（我们在后端定义的合法状态）
    const activeOption = page
      .locator("[role='menuitem']")
      .filter({ hasText: "Active" })
    const deprecatedOption = page
      .locator("[role='menuitem']")
      .filter({ hasText: "Deprecated" })

    await expect(activeOption).toBeVisible()
    await expect(deprecatedOption).toBeVisible()
  })
})

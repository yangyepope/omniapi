import { test, expect } from "@playwright/test"

test.describe("变体管理库全链路验收", () => {
  test("应当能基于流量记录成功创建一个新变体", async ({ page }) => {
    await page.goto("/services")
    await page.waitForLoadState("networkidle")

    const firstService = page
      .locator(".group\\/card, .group")
      .filter({ has: page.locator("h3") })
      .first()
    await expect(firstService).toBeVisible({ timeout: 15000 })
    const serviceListUrl = page.url()
    await firstService.click({ timeout: 10000 })
    await expect.poll(() => page.url()).not.toBe(serviceListUrl)

    const firstEndpointLink = page.getByRole("link", { name: "详情" }).first()
    await expect(firstEndpointLink).toBeVisible({ timeout: 15000 })
    const endpointListUrl = page.url()
    await firstEndpointLink.click()
    await expect.poll(() => page.url()).not.toBe(endpointListUrl)

    const firstTrafficLink = page.getByRole("link", { name: "详情" }).first()
    await expect(firstTrafficLink).toBeVisible({ timeout: 15000 })
    const trafficListUrl = page.url()
    await firstTrafficLink.click()
    await expect.poll(() => page.url()).not.toBe(trafficListUrl)

    const variantsTab = page.getByRole("button", { name: /Variants/i })
    await expect(variantsTab).toBeVisible({ timeout: 15000 })
    await variantsTab.click()

    const addVariantBtn = page.getByText("基于当前流量构造新变体")
    await expect(addVariantBtn).toBeVisible({ timeout: 15000 })
    await addVariantBtn.click()

    const variantName = `E2E_Test_Variant_${Date.now()}`
    const nameInput = page.getByPlaceholder("例如: SQLi 注入测试")
    await expect(nameInput).toBeVisible({ timeout: 10000 })
    await nameInput.fill(variantName)

    const bodyInput = page.getByPlaceholder('{ "payload": "..." }')
    await expect(bodyInput).toBeVisible({ timeout: 10000 })
    await bodyInput.fill(
      `{ "e2e_verified": true, "timestamp": ${Date.now()}, "note": "variant-create-e2e" }`,
    )

    const saveBtn = page.getByText("保存并收录到变体库")
    await expect(saveBtn).toBeEnabled({ timeout: 10000 })
    await saveBtn.click()

    await expect(page.getByText(variantName).first()).toBeVisible({ timeout: 15000 })
    await page.screenshot({
      path: `tests/screenshots/variant-creation-${Date.now()}.png`,
      fullPage: true,
    })

    console.log(`✅ 变体全链路验证成功: ${variantName}`)
  })
})

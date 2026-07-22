import { expect, test } from "@playwright/test"
import { firstSuperuser, firstSuperuserPassword } from "./config.ts"

test("verify login flow and take screenshot", async ({ page }) => {
  // Go to login page
  await page.goto("/login")

  // 凭据统一从根 .env 读取(经 tests/config.ts),禁止硬编码——避免改密码后测试失效
  await page.getByTestId("email-input").fill(firstSuperuser)
  await page.getByTestId("password-input").fill(firstSuperuserPassword)

  // Click login button using data-testid
  await page.getByTestId("login-button").click()

  // Wait for navigation and dashboard elements
  await expect(page).toHaveURL("/")

  // Wait for the side navigation to appear, signaling a successful login
  await page.waitForSelector("nav", { state: "visible", timeout: 10000 })

  // Take full page screenshot (Will be archived automatically by globalTeardown)
  await page.screenshot({
    path: "playwright-report/login-success.png",
    fullPage: true,
  })

  console.log("Login successful and screenshot captured.")
})

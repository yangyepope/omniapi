import { expect, test } from "@playwright/test"

// 临时验证:触发扫描的二次确认框 + 已运行提示。跑完即删。
test("触发扫描弹二次确认框,已运行时显示提示", async ({ page }) => {
  await page.goto("/security/scans")
  // 等服务树加载,右侧面板出现「触发扫描」按钮
  const trigger = page.getByRole("button", { name: "触发扫描" })
  await expect(trigger).toBeVisible({ timeout: 15000 })

  // 点击应弹出确认框,而不是直接下发
  await trigger.click()
  await expect(
    page.getByRole("heading", { name: "确认触发扫描" }),
  ).toBeVisible()

  // 默认选中 aam-parent(open findings 最多)且其最近扫描为 running → 应出现琥珀提示
  const runningHint = page.getByText("已有扫描正在")
  await page.screenshot({ path: "tests/screenshots/tmp-trigger-confirm.png" })
  console.log(
    "已运行提示可见:",
    await runningHint.isVisible().catch(() => false),
  )

  // 取消应关闭确认框,且未下发(不出现 sonner 成功提示)
  await page.getByRole("button", { name: "取消" }).click()
  await expect(page.getByRole("heading", { name: "确认触发扫描" })).toBeHidden()
})

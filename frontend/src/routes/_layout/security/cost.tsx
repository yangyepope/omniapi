import { createFileRoute } from "@tanstack/react-router"
import { ScannerCostPage } from "@/security/CostPage"
import { ScanHubTabs } from "@/security/ScanHubTabs"

export const Route = createFileRoute("/_layout/security/cost")({
  component: CostRoute,
  head: () => ({
    meta: [{ title: "扫描成本 · GitLab Scanner" }],
  }),
})

// 区内枢纽:顶部「扫描」Tab 条 + 成本明细页
function CostRoute() {
  return (
    <div className="space-y-4">
      <ScanHubTabs />
      <ScannerCostPage />
    </div>
  )
}

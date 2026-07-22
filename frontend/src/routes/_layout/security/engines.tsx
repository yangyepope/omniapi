import { createFileRoute } from "@tanstack/react-router"
import { EnginesPage } from "@/security/EnginesPage"
import { SettingsHubTabs } from "@/security/SettingsHubTabs"

export const Route = createFileRoute("/_layout/security/engines")({
  component: EnginesRoute,
  head: () => ({
    meta: [{ title: "扫描引擎 · GitLab Scanner" }],
  }),
})

// 区内枢纽:顶部「全局配置」Tab 条 + 扫描引擎目录页
function EnginesRoute() {
  return (
    <div className="space-y-4">
      <SettingsHubTabs />
      <EnginesPage />
    </div>
  )
}

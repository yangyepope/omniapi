import { createFileRoute } from "@tanstack/react-router"
import { ScannerConfigPage } from "@/security/ConfigPage"
import { SettingsHubTabs } from "@/security/SettingsHubTabs"

export const Route = createFileRoute("/_layout/security/config")({
  component: ConfigRoute,
  head: () => ({
    meta: [{ title: "扫描配置 · GitLab Scanner" }],
  }),
})

// 区内枢纽:顶部「全局配置」Tab 条 + 全局参数页
function ConfigRoute() {
  return (
    <div className="space-y-4">
      <SettingsHubTabs />
      <ScannerConfigPage />
    </div>
  )
}

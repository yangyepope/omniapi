import { createFileRoute } from "@tanstack/react-router"
import { RulesPage } from "@/security/RulesPage"
import { SettingsHubTabs } from "@/security/SettingsHubTabs"

export const Route = createFileRoute("/_layout/security/rules")({
  component: RulesRoute,
  head: () => ({
    meta: [{ title: "规则与 Skills · Security Platform" }],
  }),
})

// 区内枢纽:顶部「全局配置」Tab 条 + 规则库/自定义规则/Skills(RulesPage 内含子 Tab)
function RulesRoute() {
  return (
    <div className="space-y-4">
      <SettingsHubTabs />
      <RulesPage />
    </div>
  )
}

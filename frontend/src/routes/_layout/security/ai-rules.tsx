import { createFileRoute } from "@tanstack/react-router"
import { AiCategoriesPage } from "@/security/AiCategoriesPage"
import { SettingsHubTabs } from "@/security/SettingsHubTabs"

export const Route = createFileRoute("/_layout/security/ai-rules")({
  component: AiCategoriesRoute,
  head: () => ({
    meta: [{ title: "AI 分类 · Security Platform" }],
  }),
})

// 区内枢纽:顶部「全局配置」Tab 条 + AI 猎捕分类页
function AiCategoriesRoute() {
  return (
    <div className="space-y-4">
      <SettingsHubTabs />
      <AiCategoriesPage />
    </div>
  )
}

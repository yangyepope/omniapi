// 「全局配置」区的区内子导航条。IA 把全局配置区收拢为:全局参数(config)、
// 扫描引擎(engines)、AI 分类(categories)、规则与 Skills(RulesPage 内含
// 规则库/自定义规则/Skills 三个子 Tab)。均为全局共享配置,不随项目切换。
import { HubTabs } from "@/components/security/ui"

const TABS = [
  { to: "/security/config", label: "全局参数" },
  { to: "/security/engines", label: "扫描引擎" },
  { to: "/security/ai-rules", label: "AI 分类" },
  // 规则库 / 自定义规则 / Skills 三个子页面由 RulesPage 自身的 Tab 承载,
  // 故此处作为一个入口,命中规则用 startsWith 覆盖其内部 Tab 切换。
  {
    to: "/security/rules",
    label: "规则与 Skills",
    match: (p: string) => p.startsWith("/security/rules"),
  },
]

export function SettingsHubTabs() {
  return <HubTabs tabs={TABS} />
}

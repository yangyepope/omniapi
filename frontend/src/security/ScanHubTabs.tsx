// 「扫描」区的区内子导航条。IA 把扫描区收拢为三块:运行记录(scan-runs 汇总)、
// 成本明细(cost-runs)、回归对比(两次扫描 diff)。手动触发(POST /scan)由各页内嵌的
// TriggerScanButton 承担,故此处只做三块之间的 Tab 切换。
import { HubTabs } from "@/components/security/ui"

// 三块子页面各自是独立路由(保留 service/status、base/head 等 search 参数状态)。
// active 命中:精确匹配各自路径即可(均为叶子路由,无更深层级)。
const TABS = [
  { to: "/security/tasks", label: "运行记录" },
  { to: "/security/cost", label: "成本明细" },
  { to: "/security/regression", label: "回归对比" },
]

export function ScanHubTabs() {
  return <HubTabs tabs={TABS} />
}

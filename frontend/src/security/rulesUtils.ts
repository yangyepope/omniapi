// 规则库 / 自定义规则页的纯工具(source 标签 + refs 展示)。
// list/string 互转复用 aiCategoryUtils 的 toList/fromList(单一真相源)。
export { fromList, toList } from "./aiCategoryUtils"

// 规则来源展示标签
export const RULE_SOURCE_LABEL: Record<string, string> = {
  master_rules: "内置",
  asvs: "ASVS",
  custom: "自定义",
}

export function ruleSourceLabel(source: string): string {
  return RULE_SOURCE_LABEL[source] ?? source
}

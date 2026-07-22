// AI 扫描规则编辑相关的纯函数(占位符校验 + list/string 互转)。
// 抽出到独立文件供 CreateDialog / Editor 共用,避免各写各的(05 规范:单一真相源)。

// user_prompt_template 必须保留的占位符——缺任一,扫描时拼 prompt 会出错。
export const PLACEHOLDERS = [
  "{service_context}",
  "{file_path}",
  "{code}",
  "{rules_block}",
] as const

// 返回模板里缺失的占位符列表(空 = 全齐)
export function missingPlaceholders(template: string): string[] {
  return PLACEHOLDERS.filter((p) => !template.includes(p))
}

// 逗号分隔字符串 → 去空的字符串数组(仿 ConfigPage parseValue 的 list 分支)
export function toList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

// 字符串数组 → 逗号分隔展示字符串
export function fromList(v: string[] | null | undefined): string {
  return (v ?? []).join(", ")
}

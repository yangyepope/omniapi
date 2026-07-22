// 安全区表单小件 — 供项目/服务 CRUD 弹窗复用(输入框样式 + 字段包裹)。
// 亮色字面类(不用随 .dark 翻转的语义 token,见踩坑 F-004);与既有创建弹窗
// (CustomRuleCreateDialog 等)同一视觉语言,仅抽出以复用、避免各弹窗超 150 行。
import type { ReactNode } from "react"

// 输入框统一样式:白底 + 浅灰边 + 蓝色聚焦环
export const inputCls =
  "w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"

// 字段:标签 + 可选提示 + 控件
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      {hint && <div className="text-[11px] text-gray-400 mb-1">{hint}</div>}
      {children}
    </div>
  )
}

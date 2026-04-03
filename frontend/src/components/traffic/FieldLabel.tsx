/**
 * FieldLabel — 左栏字段标签
 *
 * [Why]：新建变体页面左栏每行均需要统一样式的标签（等宽、全大写、灰色），
 * 提取为独立组件后与流量详情页的 MetaRow 风格保持一致，
 * 同时避免在主页面中内联重复的 className 字符串。
 */

import type { ReactNode } from "react"

interface FieldLabelProps {
  children: ReactNode
}

/**
 * 用于新建变体页面左栏的字段名称标签
 * 样式：小号等宽大写字体，固定最小宽度，顶部对齐
 */
export function FieldLabel({ children }: FieldLabelProps) {
  return (
    <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest min-w-[72px] pt-2.5 shrink-0">
      {children}
    </span>
  )
}

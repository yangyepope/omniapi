// 安全区亮色布局原子 — 页头 / KPI 卡 / 区块卡 / 四态占位 / KV 行。
// 全部用**字面亮色调色板**(白卡片 / gray-100 边 / blue-600 点缀),与 ServiceCard 等
// 全站页面同一视觉语言;不用会随 .dark 翻转的语义 token(见 theme.ts 顶部说明)。
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Link, useRouterState } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Inbox, Loader2 } from "lucide-react"
import type { CSSProperties, ReactNode } from "react"

// 卡片基类:白底、浅灰细边、圆角、轻阴影(= 全站 ServiceCard 语言)
const CARD = "bg-white border border-gray-100 rounded-2xl shadow-sm"

// 通用白卡片(替代 shadcn ui/card,后者走 bg-card 语义 token 会随 .dark 变深)
export function Card({
  className = "",
  children,
  style,
}: {
  className?: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div className={`${CARD} ${className}`} style={style}>
      {children}
    </div>
  )
}

// ── 页头:图标 + 标题 + 副标题 + 右侧操作 ───────────────────────────
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon?: LucideIcon
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0 shadow-sm">
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// KPI 卡强调色(数据语义):品牌蓝 / 危险红 / 告警琥珀 / 正向绿
const TONES = {
  brand: { chip: "bg-blue-50 text-blue-600", value: "text-blue-600" },
  danger: { chip: "bg-red-50 text-red-600", value: "text-red-600" },
  warning: { chip: "bg-amber-50 text-amber-600", value: "text-amber-600" },
  success: { chip: "bg-green-50 text-green-600", value: "text-green-600" },
} as const

// ── KPI 卡 ──────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  tone?: keyof typeof TONES
}) {
  const t = TONES[tone]
  return (
    <div
      className={`${CARD} p-5 hover:shadow-lg hover:shadow-gray-100 transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {label}
          </div>
          <div className={`text-3xl font-black mt-2 tabular-nums ${t.value}`}>
            {value}
          </div>
          {hint && (
            <div className="text-xs text-gray-400 mt-1 truncate">{hint}</div>
          )}
        </div>
        <div className={`p-2 rounded-xl shrink-0 ${t.chip}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

// ── 区块卡:标题 + 右侧操作 + 内容 ──────────────────────────────────
export function SectionCard({
  title,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <div className={`${CARD} overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {action}
        </div>
      )}
      <div className={bodyClassName || "p-4"}>{children}</div>
    </div>
  )
}

// ── 四态占位 ────────────────────────────────────────────────────────
export function LoadingBlock({ text = "加载中…" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 h-40 text-gray-400 text-sm">
      <Loader2 className="w-5 h-5 animate-spin" /> {text}
    </div>
  )
}

export function EmptyBlock({
  icon: Icon = Inbox,
  text,
}: {
  icon?: LucideIcon
  text: string
}) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
      <Icon className="w-8 h-8 text-gray-300" />
      {text}
    </div>
  )
}

export function ErrorBlock({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 h-40 text-red-500 text-sm">
      <AlertTriangle className="w-5 h-5" /> {text}
    </div>
  )
}

// ── 破坏性操作确认框(安全区亮色版)──────────────────────────────
// 替代原生 window.confirm:全站破坏性操作走此受控弹窗(见 05 规范 §七)。
// 为何不用 shadcn ui/dialog:后者内容用 bg-background、描述用 text-muted-foreground
// 等语义 token,安全区常带 .dark 会渲染成深色(见 theme.ts / bug 档案 F-004);
// 故直接用 Radix Dialog 原语 + 字面亮色调色板,与全站白卡片视觉一致。
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  tone = "danger",
  busy = false,
  onConfirm,
  onOpenChange,
}: {
  open: boolean // 受控:是否显示
  title: string // 弹窗标题(一句话说清要做什么)
  description?: ReactNode // 补充说明(后果 / 前置条件)
  confirmText?: string // 确认按钮文案
  cancelText?: string // 取消按钮文案
  tone?: "danger" | "brand" // 语气:危险红 / 品牌蓝
  busy?: boolean // 处理中:禁用两个按钮防重复提交
  onConfirm: () => void // 点确认回调(执行破坏性操作)
  onOpenChange: (open: boolean) => void // 开关状态变更(点取消 / 遮罩 / Esc 关闭)
}) {
  // 确认按钮语气色:危险操作用红,一般操作用品牌蓝
  const accent =
    tone === "danger"
      ? { icon: "bg-red-50 text-red-600", btn: "bg-red-600 hover:bg-red-700" }
      : {
          icon: "bg-blue-50 text-blue-600",
          btn: "bg-blue-600 hover:bg-blue-700",
        }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* 遮罩:半透明黑,与 shadcn 一致 */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        {/* 内容:字面白底 + 浅灰细边 + 大圆角 = 全站亮色卡片语言 */}
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-gray-100 shadow-xl p-5 focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <div className="flex items-start gap-3">
            {/* 语气图标 */}
            <div className={`p-2 rounded-xl shrink-0 ${accent.icon}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-base font-bold text-gray-900">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm text-gray-500 mt-1 break-words">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          </div>
          {/* 底部动作:取消(幽灵)+ 确认(语气色) */}
          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${accent.btn}`}
            >
              {busy ? "处理中…" : confirmText}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ── 区级子导航条(枢纽 Tab)──────────────────────────────────────────
// 一个「区」下辖多个子页面(如「扫描」下的运行记录/成本/回归)时,用这条 Link
// 组成的下划线 Tab 条做区内切换。每个 tab 是独立路由(保留各自的 search 参数状态),
// 高亮由当前 pathname 决定;传 `match` 可自定义命中规则(如详情页归属某 tab)。
export function HubTabs({
  tabs,
}: {
  tabs: { to: string; label: string; match?: (pathname: string) => boolean }[]
}) {
  // 只订阅 pathname,避免 search 变化引发无谓重渲染
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.match ? t.match(pathname) : pathname === t.to
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              active
                ? "border-blue-300 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}

// ── 元数据 KV 行 ────────────────────────────────────────────────────
export function KV({
  k,
  v,
  mono,
}: {
  k: string
  v: ReactNode
  mono?: boolean
}) {
  return (
    <li className="flex gap-3 justify-between">
      <span className="text-gray-400 shrink-0">{k}</span>
      <span
        className={`text-gray-900 text-right break-all ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {v}
      </span>
    </li>
  )
}

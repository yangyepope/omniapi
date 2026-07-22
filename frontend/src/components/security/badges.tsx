// 安全区徽章 — 字面亮色 chip(映射与渲染分离,消费 theme.ts)。全站同一状态长相一致。
import type { ReactNode } from "react"
import {
  METHOD_CHIP,
  RISK_META,
  SCAN_STATUS_META,
  SEVERITY_META,
  TRIGGER_META,
} from "./theme"

// 基础 chip:圆角小胶囊,字面色由调用方传入
function Chip({
  chip,
  children,
  className = "",
}: {
  chip: string
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${chip} ${className}`}
    >
      {children}
    </span>
  )
}

// 严重度徽章
export function SeverityBadge({ severity }: { severity: string }) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.INFO
  return <Chip chip={meta.chip}>{meta.label}</Chip>
}

// 扫描任务状态徽章:running 带脉冲点
export function ScanStatusBadge({ status }: { status: string }) {
  const meta = SCAN_STATUS_META[status] ?? SCAN_STATUS_META.aborted
  return (
    <Chip chip={meta.chip}>
      {status === "running" && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: meta.hex }}
        />
      )}
      {meta.label}
    </Chip>
  )
}

// 扫描触发来源徽章:push/merge_request(webhook 自动)/ manual(手动)。
// trigger_type 缺失(存量任务)→ 中性「未知」。
export function TriggerBadge({ type }: { type: string | null | undefined }) {
  if (!type)
    return <Chip chip="bg-gray-100 text-gray-500 border-gray-200">未知</Chip>
  const meta = TRIGGER_META[type]
  return (
    <Chip chip={meta?.chip ?? "bg-gray-100 text-gray-500 border-gray-200"}>
      {meta?.label ?? type}
    </Chip>
  )
}

// 接口风险等级徽章
export function RiskBadge({ risk }: { risk: string | null | undefined }) {
  if (!risk)
    return <Chip chip="bg-gray-100 text-gray-500 border-gray-200">未分级</Chip>
  const meta = RISK_META[risk]
  return (
    <Chip chip={meta?.chip ?? "bg-gray-100 text-gray-500 border-gray-200"}>
      {meta?.label ?? risk}
    </Chip>
  )
}

// HTTP 方法徽章:等宽字体
export function MethodBadge({ method }: { method: string }) {
  return (
    <Chip
      chip={METHOD_CHIP[method] ?? "bg-gray-100 text-gray-600 border-gray-200"}
      className="font-mono"
    >
      {method}
    </Chip>
  )
}

// 通用中性小标签(如引擎名、op_type)
export function Tag({ children }: { children: ReactNode }) {
  return (
    <Chip chip="bg-gray-100 text-gray-600 border-gray-200">{children}</Chip>
  )
}

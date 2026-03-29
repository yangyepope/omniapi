import { cn } from "@/lib/utils"

interface SourceBadgeProps {
  source?: string | null
  className?: string
}

export const getSourceMeta = (source?: string | null) => {
  if (source === "auto_discovered") {
    return {
      dotClass: "bg-[#00e2ee] shadow-[0_0_8px_rgba(0,226,238,0.6)]",
      label: "Auto-Discovered",
    }
  }
  if (source === "documented") {
    return {
      dotClass: "bg-slate-500",
      label: "Manual Registry",
    }
  }
  return {
    dotClass: "bg-slate-500",
    label: source || "未知",
  }
}

export const SourceBadge = ({ source, className }: SourceBadgeProps) => {
  const meta = getSourceMeta(source)
  return (
    <div className={cn("flex items-center gap-2 whitespace-nowrap", className)}>
      <span className={cn("h-2 w-2 rounded-full", meta.dotClass)} />
      <span className="text-sm text-[#f1f3fc]">{meta.label}</span>
    </div>
  )
}

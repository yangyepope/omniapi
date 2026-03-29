import { cn } from "@/lib/utils"

interface MethodBadgeProps {
  method: string
  className?: string
}

export const listMethodClass = (method: string) => {
  const current = method.toUpperCase()
  if (current === "GET") return "bg-[#00f1fe]/20 text-[#00f1fe] border-[#00f1fe]/30 shadow-[0_0_8px_rgba(0,241,254,0.3)]"
  if (current === "POST" || current === "PUT" || current === "PATCH") return "bg-[#9d50ff]/20 text-[#b884ff] border-[#9d50ff]/30 shadow-[0_0_8px_rgba(157,80,255,0.3)]"
  if (current === "DELETE") return "bg-[#ff5d5d]/20 text-[#ff7d7d] border-[#ff5d5d]/30 shadow-[0_0_8px_rgba(255,93,93,0.3)]"
  return "bg-slate-500/20 text-slate-300 border-slate-500/20"
}

export const MethodBadge = ({ method, className }: MethodBadgeProps) => {
  return (
    <span className={cn("rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wider", listMethodClass(method), className)}>
      {method}
    </span>
  )
}

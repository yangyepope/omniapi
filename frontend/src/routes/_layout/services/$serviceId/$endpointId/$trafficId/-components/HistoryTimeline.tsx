import { motion } from "motion/react"
import { Clock, CheckCircle2, XCircle, ChevronRight, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReplayHistoryItem {
  id: string
  source_id: string
  status: string
  request_method: string
  request_url: string
  response_status?: number
  latency_ms?: number
  executed_at: string
  error_message?: string
}

interface HistoryTimelineProps {
  history: ReplayHistoryItem[]
  variantNames: Record<string, string>
}

const formatAbsoluteTime = (value?: string | null): string => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

export function HistoryTimeline({ history, variantNames }: HistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center gap-4 text-on-surface-variant/30">
        <Clock className="w-12 h-12 opacity-10" />
        <p className="text-sm font-bold">暂无重放历史记录</p>
      </div>
    )
  }

  return (
    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant/10">
      {history.map((item, idx) => {
        const isSuccess = item.response_status && item.response_status < 400
        const variantName = variantNames[item.source_id] || "Unknown Variant"

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative group"
          >
            {/* Timeline Dot */}
            <div className={cn(
              "absolute -left-[31px] top-1 w-6 h-6 rounded-full border-4 border-surface-container-lowest flex items-center justify-center z-10 transition-transform group-hover:scale-110",
              isSuccess ? "bg-green-500 text-white" : "bg-red-500 text-white"
            )}>
              {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-5 shadow-sm hover:shadow-md hover:border-primary-fixed/20 transition-all">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                     <span className="text-xs font-black text-on-surface uppercase tracking-tight">{variantName}</span>
                     <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded border uppercase",
                        isSuccess ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                     )}>
                        HTTP {item.response_status || "ERR"}
                     </span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/40 font-mono">{formatAbsoluteTime(item.executed_at)}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                   <div className="text-right">
                      <p className="text-[10px] font-black text-on-surface-variant/60 uppercase">Latency</p>
                      <p className="text-xs font-mono font-bold text-primary-fixed">{item.latency_ms || 0}ms</p>
                   </div>
                   <button className="p-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:text-primary-fixed transition-all">
                      <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-surface-container-low/30 border border-outline-variant/5">
                 <Activity className="w-3 h-3 text-on-surface-variant/40" />
                 <span className="text-[10px] font-mono text-on-surface-variant/60 truncate flex-1">{item.request_method} {item.request_url}</span>
              </div>

              {item.error_message && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100">
                   <p className="text-[10px] font-mono text-red-600 leading-relaxed">{item.error_message}</p>
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

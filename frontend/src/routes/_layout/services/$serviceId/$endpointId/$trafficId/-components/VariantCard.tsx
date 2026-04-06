import { Play, GitBranch, Clock, ChevronRight, CheckCircle2, AlertCircle, Timer, ArrowRightLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"

interface VariantCardProps {
  variant: any
  index?: number
  onSelect: (v: any) => void
  onReplay: (id: string) => void
  isReplaying?: boolean
}

const format24H = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "从未重放"
  try {
    return new Date(dateStr).toLocaleString('zh-CN', { hour12: false })
  } catch (e) {
    return "格式错误"
  }
}

export function VariantCard({ variant, index = 0, onSelect, onReplay, isReplaying }: VariantCardProps) {
  const isSuccess = variant.last_response_code !== null && variant.last_response_code >= 200 && variant.last_response_code < 400
  const hasError = variant.last_response_code !== null && (variant.last_response_code === 0 || variant.last_response_code >= 400)
  const isPending = variant.last_response_code === null && !isReplaying

  // 格式化三位数 ID
  const displayId = String(index + 1).padStart(3, '0')

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onSelect(variant)}
      className={cn(
        "group relative flex items-center gap-6 p-4 bg-surface-container-lowest border rounded-2xl transition-all cursor-pointer overflow-hidden",
        isReplaying ? "border-primary-fixed/50 shadow-lg shadow-primary-fixed/10" : "border-outline-variant/10 hover:border-primary-fixed/30 hover:shadow-xl hover:shadow-primary-fixed/5"
      )}
    >
      {/* 🔮 激光扫描进度条 (位于顶部) */}
      <AnimatePresence mode="wait">
        {isReplaying && (
          <motion.div 
            key="replay-shimmer"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-fixed to-transparent origin-left z-[50] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* 1. 左侧：编号与微标 (Identity) */}
      <div className="shrink-0 flex items-center gap-4">
         <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] font-black text-on-surface-variant/20 tracking-tighter leading-none mb-0.5">{displayId}</span>
            <div className={cn(
               "p-2.5 rounded-xl transition-colors",
               isReplaying ? "bg-primary-fixed/10 text-primary-fixed animate-pulse" :
               isPending ? "bg-surface-container-low text-on-surface-variant/40" : 
               isSuccess ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
            )}>
               <GitBranch className="w-5 h-5" />
            </div>
         </div>
      </div>

      {/* 2. 核心信息区 (Content) */}
      <div className="flex-1 min-w-0 space-y-1.5">
         <div className="flex items-center gap-3">
            <span className={cn(
               "text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider",
               variant.method === "GET" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"
            )}>{variant.method}</span>
            <h4 className="text-sm font-black text-on-surface truncate group-hover:text-primary-fixed transition-colors italic">{variant.name}</h4>
         </div>
         <div className="flex items-center gap-6 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest leading-none">
            <div className="flex items-center gap-1.5">
               <Clock className="w-3 h-3" />
               <span className="text-[9px] opacity-60">构造:</span> {format24H(variant.created_at)}
            </div>
            <div className="flex items-center gap-1.5 truncate max-w-[240px]">
               <ArrowRightLeft className="w-3 h-3" />
               <span className="text-[9px] opacity-60">最近:</span> {format24H(variant.last_replay_at)}
            </div>
            {variant.last_latency_ms && (
               <div className="flex items-center gap-1.5 text-primary-fixed/60">
                  <Timer className="w-3 h-3" />
                  {variant.last_latency_ms}ms
               </div>
            )}
         </div>
      </div>

      {/* 3. 状态与响应 (Status) */}
      <div className="shrink-0 flex items-center gap-8">
         <div className="flex flex-col items-end gap-1">
            {isReplaying && (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-fixed/10 text-primary-fixed text-[10px] font-black uppercase italic tracking-tighter">
                  <span className="flex gap-1">
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>.</motion.span>
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}>.</motion.span>
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}>.</motion.span>
                  </span>
                  重放中 (REPLAYING)
               </div>
            )}
            {!isReplaying && isSuccess && (
               <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100 text-green-600 text-[9px] font-black uppercase">
                  <CheckCircle2 className="w-3 h-3" /> 成功
               </div>
            )}
            {!isReplaying && hasError && (
               <div 
                 onClick={(e) => { e.stopPropagation(); onSelect(variant) }}
                 className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-[9px] font-black uppercase cursor-help hover:bg-red-500 hover:text-white transition-all shadow-sm"
               >
                  <AlertCircle className="w-3 h-3" /> 
                  {variant.last_response_code === 0 
                    ? (variant.last_response_body?.includes("TIMEOUT") ? "请求超时" : "连接失败")
                    : `失败 ${variant.last_response_code}`
                  }
               </div>
            )}
            {!isReplaying && isPending && (
               <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high border border-outline-variant/10 text-on-surface-variant/50 text-[9px] font-black uppercase tracking-widest">
                  等待重放
               </div>
            )}
         </div>

         {/* 4. 动作组合 (Actions) */}
         <div className="flex items-center gap-2 pr-2">
            <button 
              disabled={isReplaying}
              onClick={(e) => { e.stopPropagation(); onReplay(variant.id) }} 
              className={cn(
                "p-2.5 rounded-xl transition-all active:scale-90",
                isReplaying ? "bg-surface-container-high text-on-surface-variant/20 border border-outline-variant/5" : "bg-primary-fixed/5 text-primary-fixed border border-primary-fixed/10 hover:bg-primary-fixed hover:text-on-primary hover:shadow-lg hover:shadow-primary-fixed/30"
              )}
              title="立即重放 (Immediate Replay)"
            >
               <Play className={cn("fill-current w-4 h-4", isReplaying && "animate-pulse")} />
            </button>
            <ChevronRight className="w-5 h-5 text-on-surface-variant/20 group-hover:text-primary-fixed group-hover:translate-x-1 transition-all" />
         </div>
      </div>

      {/* 动态扫描线 (扫描美感) */}
      {!isReplaying && isPending && (
         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-fixed/[0.03] to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
      )}
    </motion.div>
  )
}

import { Play, GitBranch, Clock, ChevronRight, CheckCircle2, AlertCircle, Timer, ArrowRightLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"

interface VariantCardProps {
  variant: any
  index?: number
  onSelect: (v: any) => void
  onReplay: (id: string) => void
}

export function VariantCard({ variant, index = 0, onSelect, onReplay }: VariantCardProps) {
  const isSuccess = variant.last_response_code && variant.last_response_code >= 200 && variant.last_response_code < 400
  const hasError = variant.last_response_code && variant.last_response_code >= 400
  const isPending = !variant.last_response_code

  // 格式化三位数 ID
  const displayId = String(index + 1).padStart(3, '0')

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onSelect(variant)}
      className="group relative flex items-center gap-6 p-4 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl hover:border-primary-fixed/30 hover:shadow-xl hover:shadow-primary-fixed/5 transition-all cursor-pointer overflow-hidden"
    >
      {/* 1. 左侧：编号与微标 (Identity) */}
      <div className="shrink-0 flex items-center gap-4">
         <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] font-black text-on-surface-variant/20 tracking-tighter leading-none mb-0.5">{displayId}</span>
            <div className={cn(
               "p-2.5 rounded-xl transition-colors",
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
               <span className="text-[9px] opacity-60">构造:</span> {new Date(variant.created_at).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 truncate max-w-[240px]">
               <ArrowRightLeft className="w-3 h-3" />
               <span className="text-[9px] opacity-60">最近:</span> {variant.last_replay_at ? new Date(variant.last_replay_at).toLocaleString() : "从未重放"}
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
            {isSuccess && (
               <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100 text-green-600 text-[9px] font-black uppercase">
                  <CheckCircle2 className="w-3 h-3" /> 成功
               </div>
            )}
            {hasError && (
               <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-[9px] font-black uppercase">
                  <AlertCircle className="w-3 h-3" /> 失败 {variant.last_response_code}
               </div>
            )}
            {isPending && (
               <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high border border-outline-variant/10 text-on-surface-variant/50 text-[9px] font-black uppercase tracking-widest">
                  等待重放
               </div>
            )}
         </div>

         {/* 4. 动作组合 (Actions) */}
         <div className="flex items-center gap-2 pr-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onReplay(variant.id) }} 
              className="p-2.5 rounded-xl bg-primary-fixed/5 text-primary-fixed border border-primary-fixed/10 hover:bg-primary-fixed hover:text-on-primary hover:shadow-lg hover:shadow-primary-fixed/30 transition-all active:scale-90"
              title="立即重放 (Immediate Replay)"
            >
               <Play className="fill-current w-4 h-4" />
            </button>
            <ChevronRight className="w-5 h-5 text-on-surface-variant/20 group-hover:text-primary-fixed group-hover:translate-x-1 transition-all" />
         </div>
      </div>

      {/* 动态扫描线 (扫描美感) */}
      {isPending && (
         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-fixed/[0.03] to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
      )}
    </motion.div>
  )
}

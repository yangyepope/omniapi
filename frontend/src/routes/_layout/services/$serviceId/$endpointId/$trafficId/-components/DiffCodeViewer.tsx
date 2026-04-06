import { useMemo } from "react"
import { BodyCodeViewer } from "./BodyCodeViewer"
import { ArrowRightLeft, Hash, Zap, PlusCircle, MinusCircle, AlertCircle, Database, Cpu, Activity } from "lucide-react"
import { getJsonDiff } from "./json-diff"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"

interface DiffCodeViewerProps {
  original?: string | null
  current?: string | null
  originalTitle?: string
  currentTitle?: string
}

export function DiffCodeViewer({ 
  original, 
  current, 
  originalTitle = "原始流量", 
  currentTitle = "变体响应"
}: DiffCodeViewerProps) {
  // 1. 解析并计算差异
  const isNetworkError = current?.includes("CONNECTION_ERROR") || current?.includes("TIMEOUT_ERROR")
  
  const diffs = useMemo(() => {
    if (!original || !current || isNetworkError) return []
    try {
      const oldObj = JSON.parse(original)
      const newObj = JSON.parse(current)
      return getJsonDiff(oldObj, newObj)
    } catch {
      return [] // 非 JSON 则无法路径级对比
    }
  }, [original, current, isNetworkError])

  // 辅助：自动格式化 JSON 字符串以便对比
  const formatJSON = (val?: string | null) => {
     if (!val) return val
     try {
        return JSON.stringify(JSON.parse(val), null, 2)
     } catch {
        return val
     }
  }

  const formattedOriginal = useMemo(() => formatJSON(original), [original])
  const formattedCurrent = useMemo(() => formatJSON(current), [current])

  const stats = useMemo(() => ({
    added: diffs.filter(d => d.type === "added").length,
    removed: diffs.filter(d => d.type === "removed").length,
    modified: diffs.filter(d => d.type === "modified").length
  }), [diffs])

  return (
    <div className="space-y-6">
      {/* 差异摘要条 (Stats Bar) - 升级为渐变背景与动态状态 */}
      <div className={cn(
        "flex items-center justify-between px-8 py-4 rounded-[2rem] border shadow-sm transition-all duration-500",
        isNetworkError 
          ? "bg-red-500/5 border-red-500/20" 
          : diffs.length > 0 
            ? "bg-surface-container-low/40 border-outline-variant/10 shadow-sm"
            : "bg-green-500/5 border-green-500/20"
      )}>
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
               <div className={cn(
                 "p-2 rounded-xl flex items-center justify-center",
                 isNetworkError ? "bg-red-500/10 text-red-500" : "bg-primary-fixed/10 text-primary-fixed"
               )}>
                  <Zap className="w-4 h-4 shadow-sm" />
               </div>
               <div>
                  <h5 className="text-[11px] font-black uppercase tracking-tight text-on-surface">响应差异智能扫描</h5>
                  <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-0.5">Response Semantic Audit</p>
               </div>
            </div>
            
            <div className="w-px h-6 bg-outline-variant/10 mx-2" />
            
            {isNetworkError ? (
               <div className="flex items-center gap-3 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none">检测到网络链路故障 (NETWORK_FAILURE)</span>
               </div>
            ) : (
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 group">
                     <PlusCircle className="w-3.5 h-3.5 text-green-500 transition-transform group-hover:scale-110" />
                     <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase">新增: {stats.added}</span>
                  </div>
                  <div className="flex items-center gap-2 group">
                     <MinusCircle className="w-3.5 h-3.5 text-red-500 transition-transform group-hover:scale-110" />
                     <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase">删除: {stats.removed}</span>
                  </div>
                  <div className="flex items-center gap-2 group">
                     <AlertCircle className="w-3.5 h-3.5 text-orange-500 transition-transform group-hover:scale-110" />
                     <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase">变更: {stats.modified}</span>
                  </div>
               </div>
            )}
         </div>

         {/* 状态指示器 */}
         <div className={cn(
            "flex items-center gap-2.5 px-4 py-1.5 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all",
            isNetworkError 
               ? "bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/20"
               : diffs.length > 0
                  ? "bg-surface-container-high border-outline-variant/10 text-on-surface-variant/60"
                  : "bg-green-500 text-white border-green-400 shadow-lg shadow-green-500/20"
         )}>
            <Hash className="w-3.5 h-3.5 opacity-50" />
            {isNetworkError ? "连接故障" : diffs.length > 0 ? `${diffs.length} 处变更` : "完全一致"}
         </div>
      </div>

      {/* 并排视图核心区 - 极致美学对齐与 VS 毛玻璃勋章 */}
      <div className="relative group/diff-container px-2 pb-10">
        <div className={cn(
          "grid grid-cols-1 xl:grid-cols-2 gap-px bg-outline-variant/5 rounded-[3.5rem] overflow-hidden border border-outline-variant/10 shadow-2xl transition-all duration-700",
          isNetworkError ? "ring-2 ring-red-500/20 shadow-red-500/5" : "hover:shadow-primary-fixed/5"
        )}>
          {/* 左侧：原始流量 (The Source) */}
          <div className="bg-surface-container-lowest">
            <div className="px-10 py-5 border-b border-outline-variant/5 bg-gradient-to-r from-surface-container-low/30 to-transparent h-16 flex items-center gap-3">
              <Database className="w-4 h-4 text-on-surface-variant/20" />
              <span className="text-[11px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em]">{originalTitle}</span>
            </div>
            <div className="p-2">
              <BodyCodeViewer body={formattedOriginal} maxHeight="540px" />
            </div>
          </div>

          {/* 右侧：变体响应 (The Result) */}
          <div className={cn(
            "bg-surface-container-lowest relative group/right",
            isNetworkError && "bg-red-500/[0.01]"
          )}>
            <div className={cn(
              "px-10 py-5 border-b border-outline-variant/5 h-16 flex items-center justify-between",
              isNetworkError ? "bg-red-500/[0.03]" : "bg-gradient-to-l from-primary-fixed/[0.03] to-transparent"
            )}>
              <div className="flex items-center gap-3">
                <Cpu className={cn("w-4 h-4", isNetworkError ? "text-red-500/30" : "text-primary-fixed/30")} />
                <span className={cn(
                  "text-[11px] font-black uppercase tracking-[0.3em]",
                  isNetworkError ? "text-red-500/80" : "text-primary-fixed/80"
                )}>{currentTitle}</span>
                {isNetworkError && (
                  <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black tracking-tighter"
                  >
                    智能诊断模式
                  </motion.span>
                )}
              </div>
              <Activity className={cn(
                "w-4 h-4 transition-all duration-1000",
                isNetworkError ? "text-red-500/20 rotate-180" : "text-primary-fixed/20 animate-pulse"
              )} />
            </div>
            <div className="p-2">
              <BodyCodeViewer 
                body={formattedCurrent} 
                maxHeight="540px" 
                title={isNetworkError ? "故障追踪" : "响应体"}
              />
            </div>
            {isNetworkError && (
              <div className="absolute inset-0 pointer-events-none border-l-2 border-red-500/10" />
            )}
          </div>
        </div>

        {/* 极致美学：浮动 VS 勋章 (Mid-Center Glassmorphism & Orb) */}
        <div className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center gap-2 z-20 pointer-events-none">
           {/* 上部激光线 */}
           <div className={cn(
             "h-32 w-px bg-gradient-to-b from-transparent transition-all duration-1000",
             isNetworkError ? "via-red-500/40" : "via-primary-fixed/30"
           )} />
           
           {/* 核心 VS 勋章 - 重构为多重圆环动态球体 */}
           <div className="relative group/vs-orb">
              {/* 外层呼吸环 (Outer Glow Ring) */}
              <motion.div 
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "absolute -inset-4 rounded-full blur-xl opacity-30",
                  isNetworkError ? "bg-red-500" : "bg-primary-fixed"
                )}
              />
              
              {/* 中层光轮 (Outer Border) */}
              <div className={cn(
                "absolute -inset-1 rounded-full border-2 animate-spin-slow opacity-20",
                isNetworkError ? "border-red-400" : "border-primary-fixed/40"
              )} />

              {/* 核心球体 (Core Orb) */}
              <motion.div 
                whileHover={{ scale: 1.25, rotate: 15 }}
                className={cn(
                  "w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-[13px] shadow-2xl backdrop-blur-2xl transition-all duration-700 relative z-10",
                  isNetworkError 
                    ? "bg-gradient-to-br from-red-600 to-red-900 text-white border-white/20 shadow-red-500/50" 
                    : "bg-gradient-to-br from-primary-fixed to-blue-700 text-white border-white/30 shadow-primary-fixed/40"
                )}
              >
                <span className="drop-shadow-md tracking-tighter">VS</span>
              </motion.div>
           </div>
           
           {/* 下部激光线 */}
           <div className={cn(
             "h-48 w-px bg-gradient-to-b via-primary-fixed/30 to-transparent transition-all duration-1000",
             isNetworkError ? "via-red-500/40" : "via-primary-fixed/30"
           )} />
        </div>
      </div>

      {/* 详细差异列表 (Diff Paths) */}
      {diffs.length > 0 ? (
        <section className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="px-8 py-4 border-b border-outline-variant/5 bg-surface-container-low/20 flex items-center gap-3">
            <Hash className="w-4 h-4 text-primary-fixed/40" />
            <div>
               <span className="text-[11px] font-black uppercase tracking-tight text-on-surface">变更路径详情</span>
               <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest leading-none mt-0.5">JSON Path Audit</p>
            </div>
          </div>
          <div className="max-h-[320px] overflow-auto divide-y divide-outline-variant/5 scrollbar-thin">
             {diffs.map((diff, idx) => (
                <div key={idx} className="px-8 py-4 flex items-start gap-4 hover:bg-surface-container-low/20 transition-all group">
                   <div className="mt-1 shrink-0">
                      {diff.type === "added" && <PlusCircle className="w-4 h-4 text-green-500 shadow-sm" />}
                      {diff.type === "removed" && <MinusCircle className="w-4 h-4 text-red-500 shadow-sm" />}
                      {diff.type === "modified" && <AlertCircle className="w-4 h-4 text-orange-500 shadow-sm" />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                         <span className="text-xs font-mono font-black text-on-surface-variant group-hover:text-primary-fixed transition-colors truncate">{diff.path}</span>
                         <span className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border shadow-sm",
                            diff.type === "added" && "bg-green-50 text-green-600 border-green-100",
                            diff.type === "removed" && "bg-red-50 text-red-600 border-red-100",
                            diff.type === "modified" && "bg-orange-50 text-orange-600 border-orange-100"
                         )}>
                            {diff.type}
                         </span>
                      </div>
                      {diff.type === "modified" && (
                         <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low/40 text-[11px] font-mono text-on-surface-variant/50">
                            <span className="line-through decoration-red-500/20">{JSON.stringify(diff.oldValue)}</span>
                            <ArrowRightLeft className="w-3 h-3 shrink-0 text-primary-fixed/20" />
                            <span className="text-primary-fixed/80 font-black">{JSON.stringify(diff.newValue)}</span>
                         </div>
                      )}
                   </div>
                </div>
             ))}
          </div>
        </section>
      ) : isNetworkError && (
        <div className="p-8 rounded-[2rem] bg-red-500/[0.03] border border-dashed border-red-500/20 flex flex-col items-center justify-center text-center gap-3 animate-pulse">
           <AlertCircle className="w-10 h-10 text-red-500/20" />
           <div>
              <p className="text-xs font-black text-red-500/60 uppercase tracking-widest">自动对比引擎跳过</p>
              <p className="text-[10px] font-bold text-on-surface-variant/40 mt-1 max-w-[320px]">由于响应体包含连接异常诊断信息而非标准的业务数据包，系统已自动切换至“手动诊断模式”。</p>
           </div>
        </div>
      )}
      
      <div className="px-8 flex items-center gap-2">
         <div className="w-1.5 h-1.5 rounded-full bg-primary-fixed/20" />
         <p className="text-[10px] text-on-surface-variant/30 italic font-bold">
           * 系统目前采用递归路径对比。检测到结构层次差异时，将以点号路径标记变更位置。
         </p>
      </div>
    </div>
  )
}

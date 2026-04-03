import { useMemo } from "react"
import { BodyCodeViewer } from "./BodyCodeViewer"
import { ArrowRightLeft, FastForward, Hash, Zap, PlusCircle, MinusCircle, AlertCircle } from "lucide-react"
import { getJsonDiff } from "./json-diff"
import { cn } from "@/lib/utils"

interface DiffCodeViewerProps {
  original?: string | null
  current?: string | null
  originalTitle?: string
  currentTitle?: string
}

export function DiffCodeViewer({ 
  original, 
  current, 
  originalTitle = "Original Traffic", 
  currentTitle = "Variant Response"
}: DiffCodeViewerProps) {
  // 1. 解析并计算差异
  const diffs = useMemo(() => {
    if (!original || !current) return []
    try {
      const oldObj = JSON.parse(original)
      const newObj = JSON.parse(current)
      return getJsonDiff(oldObj, newObj)
    } catch {
      return [] // 非 JSON 则无法路径级对比
    }
  }, [original, current])

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
    <div className="space-y-4">
      {/* 差异摘要条 (Stats Bar) */}
      <div className="flex items-center justify-between px-6 py-3 bg-surface-container-low/40 rounded-3xl border border-outline-variant/10">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <Zap className="w-4 h-4 text-primary-fixed" />
               <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">响应差异智能扫描</span>
            </div>
            <div className="w-px h-3 bg-outline-variant/20 mx-2" />
            <div className="flex items-center gap-5">
               <div className="flex items-center gap-1.5">
                  <PlusCircle className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase">新增: {stats.added}</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <MinusCircle className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase">删除: {stats.removed}</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase">变更: {stats.modified}</span>
               </div>
            </div>
         </div>
         <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/10">
            <Hash className="w-3 h-3 text-on-surface-variant/40" />
            <span className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-widest">{diffs.length} CHANGES FOUND</span>
         </div>
      </div>

      {/* 并排视图核心区 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-px bg-outline-variant/10 rounded-3xl overflow-hidden border border-outline-variant/10">
        <div className="bg-surface-container-lowest">
           <div className="px-6 py-2 border-b border-outline-variant/5 bg-surface-container-low/20">
              <span className="text-[9px] font-black text-on-surface-variant/40 uppercase">{originalTitle}</span>
           </div>
           <BodyCodeViewer body={formattedOriginal} maxHeight="500px" />
        </div>
        <div className="bg-surface-container-lowest relative">
           <div className="px-6 py-2 border-b border-outline-variant/5 bg-surface-container-low/20 flex items-center justify-between">
              <span className="text-[9px] font-black text-primary-fixed uppercase">{currentTitle}</span>
              <FastForward className="w-3 h-3 text-primary-fixed/40 animate-pulse" />
           </div>
           <BodyCodeViewer body={formattedCurrent} maxHeight="500px" />
        </div>
      </div>

      {/* 详细差异列表 (Diff Paths) */}
      {diffs.length > 0 && (
        <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="px-6 py-3 border-b border-outline-variant/5 bg-surface-container-low/20 flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-on-surface-variant/60" />
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">变更路径详情 (JSON Path Audit)</span>
          </div>
          <div className="max-h-[240px] overflow-auto divide-y divide-outline-variant/5">
             {diffs.map((diff, idx) => (
                <div key={idx} className="px-6 py-2.5 flex items-start gap-4 hover:bg-surface-container-low/20 transition-colors group">
                   <div className="mt-0.5 shrink-0">
                      {diff.type === "added" && <PlusCircle className="w-3.5 h-3.5 text-green-500" />}
                      {diff.type === "removed" && <MinusCircle className="w-3.5 h-3.5 text-red-500" />}
                      {diff.type === "modified" && <AlertCircle className="w-3.5 h-3.5 text-orange-500" />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                         <span className="text-[11px] font-mono font-black text-on-surface-variant group-hover:text-primary-fixed transition-colors truncate">{diff.path}</span>
                         <span className={cn(
                            "text-[8px] font-black uppercase px-1 rounded-sm border",
                            diff.type === "added" && "bg-green-50 text-green-600 border-green-100",
                            diff.type === "removed" && "bg-red-50 text-red-600 border-red-100",
                            diff.type === "modified" && "bg-orange-50 text-orange-600 border-orange-100"
                         )}>
                            {diff.type}
                         </span>
                      </div>
                      {diff.type === "modified" && (
                         <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant/40 truncate">
                            <span className="line-through">{JSON.stringify(diff.oldValue)}</span>
                            <ArrowRightLeft className="w-2 h-2 shrink-0" />
                            <span className="text-primary-fixed/60">{JSON.stringify(diff.newValue)}</span>
                         </div>
                      )}
                   </div>
                </div>
             ))}
          </div>
        </section>
      )}
      
      <p className="px-6 text-[9px] text-on-surface-variant/30 italic font-bold">
        * 系统目前采用递归路径对比。检测到结构层次差异时，将以点号路径标记变更位置。
      </p>
    </div>
  )
}

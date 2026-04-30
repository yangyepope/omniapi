import React, { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { 
  CheckCircle2, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  RotateCw,
  Eye,
  Split,
  Search
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 重放历史记录项类型定义 (Correct Type Definitions)
 */
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

/**
 * 组件属性定义
 */
interface HistoryTimelineProps {
  history: ReplayHistoryItem[]
  variantNames: Record<string, string>
  currentPage: number        // 📜 新增：当前页码
  totalCount: number          // 📜 新增：服务端返回的总条数
  onPageChange: (page: number) => void // 📜 新增：翻页回调
  onReplay?: (variantId: string) => void
  onView?: (item: ReplayHistoryItem) => void 
  onClone?: (item: ReplayHistoryItem) => void
}

/**
 * 格式化时间为：YYYY-MM-DD HH:mm:ss (完整时刻)
 */
const formatFullDateTime = (value?: string | null): string => {
  if (!value) return "----/--/-- --:--:--"
  try {
    const date = new Date(value)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const time = date.toLocaleTimeString('zh-CN', { hour12: false })
    return `${y}-${m}-${d} ${time}`
  } catch (e) {
    return "----/--/-- --:--:--"
  }
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ 
  history, 
  variantNames,
  currentPage,
  totalCount,
  onPageChange,
  onReplay,
  onView,
  onClone
}) => {
  // ────────────────────────────────────────────────────────────────────────────
  // 1. 状态管理 (已简化：page 状态上移至父组件)
  // ────────────────────────────────────────────────────────────────────────────
  const [filterKeyword, setFilterKeyword] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterHost, setFilterHost] = useState("all")
  const [latencyRange, setLatencyRange] = useState<{ min?: number, max?: number }>({})
  const perPage = 10
  
  // ────────────────────────────────────────────────────────────────────────────
  // 2. 数据统计聚合 (Stats Aggregation)
  // ────────────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = (history || []).length
    if (total === 0) return null

    const successCount = (history || []).filter(h => h.response_status && h.response_status < 400).length
    const errorCount = total - successCount
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0
    
    const avgLatency = total > 0 ? Math.round((history || []).reduce((acc, curr) => acc + (curr.latency_ms || 0), 0) / total) : 0
    
    // 最近 15 次重放的延迟趋势数据
    const trendData = (history || []).slice(0, 15).reverse().map(h => ({
      val: h.latency_ms || 0,
      status: h.response_status
    }))

    return { total, successCount, errorCount, successRate, avgLatency, trendData }
  }, [history])

  // ────────────────────────────────────────────────────────────────────────────
  // 3. 联动过滤逻辑 (Multi-dimensional Filter)
  // ────────────────────────────────────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    return (history || []).filter(item => {
      // a. 关键字检索 (URL 或 变体名)
      const matchesKeyword = item.request_url.toLowerCase().includes(filterKeyword.toLowerCase()) ||
                             (variantNames[item.source_id]?.toLowerCase().includes(filterKeyword.toLowerCase()))

      // b. 状态码过滤
      let matchesStatus = true
      if (filterStatus === "success") matchesStatus = !!item.response_status && item.response_status < 400
      if (filterStatus === "4xx") matchesStatus = !!item.response_status && item.response_status >= 400 && item.response_status < 500
      if (filterStatus === "5xx") matchesStatus = !item.response_status || item.response_status >= 500

      // c. Host 环境过滤
      let matchesHost = true
      if (filterHost !== "all") {
        matchesHost = item.request_url.includes(filterHost)
      }

      // d. 耗时区间过滤
      const matchesLatency = (!latencyRange.min || (item.latency_ms || 0) >= latencyRange.min) &&
                             (!latencyRange.max || (item.latency_ms || 0) <= latencyRange.max)

      return matchesKeyword && matchesStatus && matchesHost && matchesLatency
    })
  }, [history, filterKeyword, filterStatus, filterHost, latencyRange, variantNames])

  const totalPages = Math.ceil(totalCount / perPage)
  const paginatedHistory = history // 直接使用父组件传入的当前页数据

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* ────────────────────────────────────────────────────────────────────────
          看板区域 (Bento Dashboard)
          ──────────────────────────────────────────────────────────────────────── */}
      <section className="p-8 grid grid-cols-12 gap-5 shrink-0 bg-surface-container-lowest/30 border-b border-outline-variant/5">
        {/* 左侧核心指标 */}
        <div className="col-span-8 grid grid-cols-3 gap-5">
          {[
            { label: "平均延迟", value: `${stats?.avgLatency || 0}ms`, sub: "Avg Latency", icon: <RotateCw className="w-4 h-4 text-primary-fixed" />, color: "bg-primary-fixed/5 border-primary-fixed/10" },
            { label: "成功率", value: `${stats?.successRate || 0}%`, sub: `${stats?.total || 0} Total`, icon: <CheckCircle2 className="w-4 h-4 text-secondary-fixed" />, color: "bg-secondary-fixed/5 border-secondary-fixed/10" },
            { label: "故障数", value: stats?.errorCount || 0, sub: "Errors Detected", icon: <AlertTriangle className="w-4 h-4 text-tertiary" />, color: "bg-tertiary/5 border-tertiary/10" }
          ].map((item, idx) => (
            <motion.div 
               key={idx}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.1 }}
               className={cn("p-5 rounded-[2.5rem] border flex flex-col justify-between", item.color)}
            >
               <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-xl bg-white/50">{item.icon}</div>
                  <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">{item.sub}</span>
               </div>
               <div>
                  <h4 className="text-3xl font-black tracking-tighter text-on-surface mb-1">{item.value}</h4>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-wider">{item.label}</p>
               </div>
            </motion.div>
          ))}
        </div>

        {/* 右侧：延迟趋势分布 */}
        <div className="col-span-4 p-5 rounded-[2.5rem] border border-outline-variant/10 bg-surface-container-low/20 flex flex-col">
           <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">{`响应趋势 (Last 15)`}</span>
              <BarChart3 className="w-4 h-4 opacity-20" />
           </div>
           <div className="flex-1 flex items-end justify-between gap-1.5 h-32 mb-2">
              {(stats?.trendData || []).map((d, i) => {
                 const currentTrend = stats?.trendData || []
                 const max = Math.max(...(currentTrend.map(x => x.val) || [1])) || 1
                 const h = (d.val / max) * 100
                 const isErr = (d.status || 0) >= 400 || !d.status
                 return (
                   <div key={i} className="flex-1 relative group/bar flex flex-col justify-end h-full">
                      <motion.div 
                         initial={{ height: 0 }}
                         animate={{ height: `${Math.max(8, h)}%` }}
                         className={cn(
                           "w-full rounded-sm transition-all",
                           isErr ? "bg-tertiary/60" : "bg-primary-fixed/30 group-hover/bar:bg-primary-fixed/60"
                         )}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-on-surface text-surface text-[8px] font-black rounded opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none whitespace-nowrap z-10 transition-all scale-75 group-hover/bar:scale-100">
                         {d.val}ms
                      </div>
                   </div>
                 )
              })}
           </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────────
          过滤器与工具栏 (Search & Filter Bar)
          ──────────────────────────────────────────────────────────────────────────── */}
      <section className="px-8 py-6 grid grid-cols-12 gap-4 bg-surface-container-low/30 border-b border-outline-variant/5 shadow-inner">
         {/* 响应体搜索 */}
         <div className="col-span-5 flex flex-col gap-2">
            <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">响应体关键字搜索</span>
            <div className="relative group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/30 group-focus-within:text-primary-fixed transition-colors" />
               <input 
                  type="text" placeholder="输入搜索词..." 
                  value={filterKeyword}
                  onChange={(e) => { setFilterKeyword(e.target.value); onPageChange(1); }}
                  className="w-full pl-9 pr-4 py-3 bg-white/80 backdrop-blur-sm rounded-xl border border-outline-variant/10 text-xs font-bold text-on-surface placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-primary-fixed/30 transition-all shadow-sm" 
               />
            </div>
         </div>
         {/* Host / 环境筛选 */}
         <div className="col-span-2 flex flex-col gap-2">
            <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">目标环境过滤</span>
            <select 
               value={filterHost}
               onChange={(e) => { setFilterHost(e.target.value); onPageChange(1); }}
               className="w-full bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-outline-variant/10 text-xs font-bold text-on-surface focus:ring-1 focus:ring-primary-fixed/30 transition-all cursor-pointer shadow-sm"
            >
               <option value="all">全部环境</option>
               <option value="prod">Production</option>
               <option value="staging">Staging</option>
               <option value="dev">Development</option>
            </select>
         </div>
         {/* 状态码区间 */}
         <div className="col-span-2 flex flex-col gap-2">
            <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">诊断器状态</span>
            <select 
               value={filterStatus}
               onChange={(e) => { setFilterStatus(e.target.value); onPageChange(1); }}
               className="w-full bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-outline-variant/10 text-xs font-bold text-on-surface focus:ring-1 focus:ring-primary-fixed/30 transition-all cursor-pointer shadow-sm"
            >
               <option value="all">所有记录码</option>
               <option value="success">Success (2xx/3xx)</option>
               <option value="4xx">Client Err (4xx)</option>
               <option value="5xx">Server Err (5xx)</option>
            </select>
         </div>
         {/* 耗时区间 */}
         <div className="col-span-2 flex flex-col gap-2">
            <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">耗时阈值 (MS)</span>
            <div className="flex items-center gap-2">
               <input 
                  type="number" placeholder="Min" 
                  value={latencyRange.min || ""}
                  onChange={(e) => { setLatencyRange(prev => ({ ...prev, min: parseInt(e.target.value) || undefined })); onPageChange(1); }}
                  className="w-full bg-white/80 backdrop-blur-sm px-3 py-3 rounded-xl border border-outline-variant/10 text-xs font-bold font-mono text-on-surface placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-primary-fixed/30 shadow-sm" 
               />
               <input 
                  type="number" placeholder="Max" 
                  value={latencyRange.max || ""}
                  onChange={(e) => { setLatencyRange(prev => ({ ...prev, max: parseInt(e.target.value) || undefined })); onPageChange(1); }}
                  className="w-full bg-white/80 backdrop-blur-sm px-3 py-3 rounded-xl border border-outline-variant/10 text-xs font-bold font-mono text-on-surface placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-primary-fixed/30 shadow-sm" 
               />
            </div>
         </div>
         {/* 刷新 */}
         <div className="col-span-1 flex flex-col gap-2">
            <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest opacity-0 px-1">RESET</span>
            <button 
              onClick={() => { setFilterKeyword(""); setFilterStatus("all"); setFilterHost("all"); setLatencyRange({}); onPageChange(1); }}
              className="w-full h-[46px] bg-primary-fixed/10 hover:bg-primary-fixed text-primary-fixed hover:text-on-primary rounded-xl flex items-center justify-center transition-all active:scale-95 border border-primary-fixed/10"
            >
               <RotateCw className="w-5 h-5" />
            </button>
         </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          底部容器：审计流水表格 (Replay Audit table)
          ──────────────────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white/40 backdrop-blur-md">
        <div className="px-8 py-5 border-b border-outline-variant/5 bg-surface-container-lowest/50 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-primary-fixed rounded-full animate-pulse" />
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest">重放诊断流水 (Auditlogs)</h3>
           </div>
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/5">
                 <Search className="w-3.5 h-3.5 opacity-20" />
                 <span className="text-[10px] font-bold text-on-surface-variant/40">已过滤 {totalCount} 条</span>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
           <table className="w-full border-collapse">
              <thead>
                 <tr className="border-b border-outline-variant/10 bg-surface-container-low/20">
                    <th className="pl-8 pr-4 py-5 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em] text-left w-[15%]">执行时间 (UTC)</th>
                    <th className="px-4 py-5 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em] text-left w-[18%]">目标环境 (HOST)</th>
                    <th className="px-4 py-5 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em] text-left w-[10%]">状态码</th>
                    <th className="px-4 py-5 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em] text-left w-[10%]">响应耗时</th>
                    <th className="px-4 py-5 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em] text-left">关联变体名称</th>
                    <th className="pr-8 pl-4 py-5 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em] text-right w-[12%]">操作项</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                 {paginatedHistory.map((item) => {
                    const isSuccess = item.response_status && item.response_status < 400
                    const vName = variantNames[item.source_id] || "--"
                    
                    let displayHost = "--"
                    try {
                       displayHost = new URL(item.request_url).hostname
                    } catch {
                       displayHost = "Unknown"
                    }

                    return (
                       <tr key={item.id} className="group hover:bg-white/60 transition-all cursor-default">
                          <td className="pl-8 pr-4 py-6">
                             <span className="text-[11px] font-mono font-bold text-on-surface-variant/80">{formatFullDateTime(item.executed_at)}</span>
                          </td>
                          <td className="px-4 py-6" title={item.request_url}>
                             <div className="flex flex-col group/host cursor-help">
                                <span className="text-[11px] font-black text-on-surface truncate max-w-[160px] leading-tight group-hover/host:text-primary-fixed">{displayHost}</span>
                                <span className="text-[9px] font-medium text-on-surface-variant/40 truncate max-w-[160px] font-mono mt-0.5">{item.request_url}</span>
                             </div>
                          </td>
                          <td className="px-4 py-6">
                             <div className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-widest",
                                isSuccess ? "bg-secondary-fixed/5 text-secondary-fixed border-secondary-fixed/10" : "bg-tertiary/5 text-tertiary border-tertiary/10"
                             )}>
                                <span>{item.response_status || "ERR"}</span>
                             </div>
                          </td>
                          <td className="px-4 py-6">
                             <span className={cn(
                               "text-[11px] font-mono font-bold",
                               (item.latency_ms || 0) > 1000 ? "text-tertiary" : "text-on-surface-variant/80"
                             )}>
                                {item.latency_ms ? `${item.latency_ms}ms` : "--"}
                             </span>
                          </td>
                          <td className="px-4 py-6">
                             <span className="text-[11px] font-bold text-on-surface truncate max-w-[280px] block font-mono hover:text-primary-fixed transition-colors">
                                {vName}
                             </span>
                          </td>
                          <td className="pr-8 pl-4 py-6 text-right">
                             <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                <button 
                                  onClick={() => onView?.(item)}
                                  className="w-8 h-8 rounded-lg text-on-surface-variant/40 hover:text-primary-fixed hover:bg-surface-container-high flex items-center justify-center transition-all active:scale-95"
                                  title="查看详情"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => onReplay?.(item.source_id)}
                                  className="w-8 h-8 rounded-lg text-on-surface-variant/40 hover:text-secondary-fixed hover:bg-surface-container-high flex items-center justify-center transition-all active:scale-95"
                                  title="立即重放"
                                >
                                  <RotateCw className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => onClone?.(item)}
                                  className="w-8 h-8 rounded-lg text-on-surface-variant/40 hover:text-tertiary hover:bg-surface-container-high flex items-center justify-center transition-all active:scale-95"
                                  title="克隆变体"
                                >
                                  <Split className="w-4 h-4" />
                                </button>
                             </div>
                          </td>
                       </tr>
                    )
                 })}
              </tbody>
           </table>
        </div>

        <div className="px-8 py-10 bg-transparent flex items-center justify-between border-t border-gray-100">
           <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">
              显示第 {(currentPage - 1) * perPage + 1} 到 {Math.min(currentPage * perPage, totalCount)} 条结果，共 {totalCount} 条
           </span>

           <div className="flex items-center gap-2">
              <button 
                 disabled={currentPage <= 1}
                 onClick={() => onPageChange(currentPage - 1)}
                 className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-30"
              >
                 <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1">
                 {Array.from({ length: totalPages }, (_, i) => i + 1)
                 .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                 .map((p, i, arr) => (
                   <React.Fragment key={p}>
                     {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-gray-400/30 text-xs text-center">...</span>}
                     <button 
                       onClick={() => onPageChange(p)}
                       className={cn(
                         "w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black transition-all",
                         p === currentPage 
                           ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                           : "border border-gray-100 text-gray-400 hover:bg-gray-50"
                       )}
                     >
                       {p}
                     </button>
                   </React.Fragment>
                 ))}
              </div>

              <button 
                 disabled={currentPage >= totalPages}
                 onClick={() => onPageChange(currentPage + 1)}
                 className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-30"
              >
                 <ChevronRight className="w-5 h-5" />
              </button>
           </div>
        </div>
      </section>
    </div>
  )
}

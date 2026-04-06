import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  GitBranch,
  History,
  Info,
  Play,
  Plus,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowRightLeft,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"

import { TrafficManagerService } from "@/client"
import { OpenAPI } from "@/client/core/OpenAPI"
import { request as __request } from "@/client/core/request"
import { cn } from "@/lib/utils"

// 引入提取出的原子组件
import { BodyCodeViewer } from "./-components/BodyCodeViewer"
import { VariantCard } from "./-components/VariantCard"
import { TrafficMetaPanel } from "./-components/TrafficMetaPanel"
import { HistoryTimeline } from "./-components/HistoryTimeline"
import { DiffCodeViewer } from "./-components/DiffCodeViewer"
import { VariantEditor } from "./-components/VariantEditor"

// ─────────────────────────────────────────────
// 类型定义恢复
// ─────────────────────────────────────────────
export type VariantPublic = {
  id: string
  root_flow_id: string
  name: string
  description?: string | null
  method: string
  url: string
  headers?: Record<string, any> | null
  body_str?: string | null
  last_response_code?: number | null
  last_response_body?: string | null
  last_response_headers?: Record<string, any> | null
  last_request_curl?: string | null
  last_latency_ms?: number | null
  last_replay_at?: string | null
  created_at: string
}

export type VariantsPublic = {
  data: VariantPublic[]
  count: number
}

export type BaselineResult = {
  status_code: number
  body: string
  headers: Record<string, any>
  latency_ms: number
}

export const Route = createFileRoute(
  "/_layout/services/$serviceId/$endpointId/$trafficId/",
)({
  component: TrafficDetailIndex,
})

function TrafficDetailIndex() {
  const { serviceId, endpointId, trafficId } = Route.useParams() as any
  const [activeTab, setActiveTab] = useState<"info" | "variants" | "history">("info")
  const [selectedVariant, setSelectedVariant] = useState<VariantPublic | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [page, setPage] = useState(1)
  const [replayingIds, setReplayingIds] = useState<Set<string>>(new Set()) // 进度追踪
  const [baselineResult, setBaselineResult] = useState<BaselineResult | null>(null)
  const [isFetchingBaseline, setIsFetchingBaseline] = useState(false)
  const limit = 10

  // 防止侧滑层打开时出现双滚动条
  React.useEffect(() => {
    if (selectedVariant) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [selectedVariant])

  const handleFetchBaseline = async () => {
    if (baselineResult || isFetchingBaseline) return
    setIsFetchingBaseline(true)
    try {
      const res = await __request(OpenAPI, {
        method: "POST",
        url: `/api/v1/replays/baseline/${trafficId}`
      })
      setBaselineResult(res as BaselineResult)
    } catch (e: any) {
      console.error("Fetch baseline failed:", e)
      toast.error("获取基准响应失败，请重试")
    } finally {
      setIsFetchingBaseline(false)
    }
  }

  const handleToggleDiff = (val: boolean) => {
    setShowDiff(val)
    if (val && !baselineResult) {
      handleFetchBaseline()
    }
  }

  // 1. 获取主流量记录
  const trafficQuery = useQuery({
    queryKey: ["traffic-manager", "endpoint-traffic", endpointId],
    queryFn: () => TrafficManagerService.getEndpointTraffic({ endpointId, skip: 0, limit: 100 }),
  })
  const record = (trafficQuery.data?.data ?? []).find((r) => r.id === trafficId)

  // 2. 获取变体列表 (分页模式)
  const variantsQuery = useQuery({
    queryKey: ["variants", trafficId, page],
    queryFn: async () => {
      const res = await __request(OpenAPI, {
        method: "GET",
        url: "/api/v1/variants/",
        query: { root_flow_id: trafficId, skip: (page - 1) * limit, limit },
      })
      return res as VariantsPublic
    },
  })

  // 3. 获取历史执行流水
  const historyQuery = useQuery({
    queryKey: ["history", trafficId],
    queryFn: async () => {
       const res = await __request(OpenAPI, {
          method: "GET",
          url: "/api/v1/variants/history",
          query: { root_flow_id: trafficId }
       })
       return res as { data: any[] }
    },
    enabled: activeTab === "history"
  })

  const variantNames = (variantsQuery.data?.data ?? []).reduce((acc: any, v: any) => {
    acc[v.id] = v.name
    return acc
  }, {})

  const handleReplay = async (id: string) => {
    toast.promise(
      (async () => {
        try {
          setReplayingIds(prev => new Set(prev).add(id))
          await __request(OpenAPI, { 
            method: "POST", 
            url: `/api/v1/replays/${id}` 
          })
          // 给数据库一点缓冲时间再刷新列表
          await new Promise(resolve => setTimeout(resolve, 500))
          await variantsQuery.refetch()
        } catch (e: any) {
          console.error("Replay execution failed:", e)
          // 提取后端返回的详细错误
          const detail = e.body?.detail || e.message || "未知原因导致重放失败"
          throw new Error(detail)
        } finally {
          setReplayingIds(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      })(),
      {
        loading: "🚀 正在触发重放攻击 (Executing Replay)...",
        success: "✅ 重放请求已发送并执行成功！",
        error: (err) => `❌ 重放执行失败: ${err.message}`
      }
    )
  }

  if (trafficQuery.isLoading) return <div className="p-20 text-center font-bold opacity-30 animate-pulse">正在解析报文...</div>
  if (!record) return <div className="p-20 text-center font-bold opacity-30">未找到该流量记录</div>

  const variants = Array.isArray(variantsQuery.data?.data) ? variantsQuery.data.data : []

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/services/$serviceId/$endpointId"
            params={{ serviceId, endpointId }}
            className="p-2.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 text-on-surface-variant hover:text-primary-fixed transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">流量记录详情</h1>
            <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest leading-none">Traffic Analysis & Governance</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-secondary-fixed/10 text-secondary-fixed border border-secondary-fixed/20 text-[9px] font-black uppercase tracking-widest ml-2">VERIFIED FLOW</span>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-fixed text-on-primary text-xs font-bold shadow-xl shadow-primary-fixed/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Play className="w-4 h-4" />
              执行整体重放
            </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <nav className="flex items-center gap-2 border-b border-outline-variant/10">
        {(
          [
            { key: "info", label: "捕获报文 (Request)", icon: Info },
            { key: "variants", label: "变体管理库 (Variants)", icon: GitBranch },
            { key: "history", label: "测试重放历史 (History)", icon: History },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-6 py-3.5 text-xs font-black transition-all relative",
              activeTab === key ? "text-primary-fixed" : "text-on-surface-variant/40 hover:text-on-surface-variant"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {activeTab === key && (
              <motion.div layoutId="active-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-fixed rounded-t-full shadow-[0_-2px_8px_rgba(var(--primary-fixed),0.5)]" />
            )}
          </button>
        ))}
      </nav>

      {/* Tab Content Rendering */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 5 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -5 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "info" && (
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-4 translate-y-1">
                 <TrafficMetaPanel record={record} />
              </div>
              <div className="col-span-12 lg:col-span-8">
                <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden">
                  <div className="px-8 py-5 border-b border-outline-variant/5 bg-surface-container-low/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <span className="p-2 rounded-xl bg-primary-fixed/5 text-primary-fixed font-black text-[10px] border border-primary-fixed/10">{record.method}</span>
                       <h3 className="text-sm font-black text-on-surface">捕获请求体 (Payload)</h3>
                    </div>
                  </div>
                  <BodyCodeViewer body={record.body} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "variants" && (
            <div className="space-y-6">
              {isCreating ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between bg-surface-container-low/50 px-8 py-4 rounded-3xl border border-outline-variant/10">
                     <span className="text-[10px] font-black uppercase text-primary-fixed tracking-widest">变体编辑器激活 / Lab Mode Active</span>
                     <button 
                       onClick={() => setIsCreating(false)} 
                       className="px-6 py-2 rounded-xl bg-surface-container-high text-xs font-black text-on-surface-variant hover:text-primary-fixed transition-all"
                     >取消并返回列表</button>
                  </div>
                  <VariantEditor 
                    trafficId={trafficId}
                    initialData={{
                      method: record.method,
                      url: record.original_path || "/",
                      headers: typeof record.headers === "string" ? JSON.parse(record.headers || "{}") : record.headers,
                      body: record.body || "",
                    }}
                    onSuccess={() => {
                        setIsCreating(false)
                        variantsQuery.refetch()
                    }}
                  />
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-[2.5rem] border-2 border-dashed border-primary-fixed/20 bg-primary-fixed/[0.02] text-primary-fixed hover:border-primary-fixed/50 hover:bg-primary-fixed/5 transition-all group"
                  >
                    <div className="p-3 rounded-2xl bg-primary-fixed/10 group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black">基于当前流量构造新变体 (In-place Editor)</p>
                      <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">Create an attack payload or test case</p>
                    </div>
                  </button>

                  <div className="flex flex-col gap-3">
                    {variants.length === 0 ? (
                       <div className="py-20 flex flex-col items-center justify-center text-center gap-4 text-on-surface-variant/30">
                          <GitBranch className="w-12 h-12 opacity-10" />
                          <p className="text-sm font-bold">暂无变体库内容，请点击上方按钮开始构造</p>
                       </div>
                    ) : (
                      <>
                        {variants.map((v, i) => (
                          <VariantCard 
                            key={v.id} 
                            variant={v} 
                            index={(page - 1) * limit + i}
                            onSelect={setSelectedVariant}
                            onReplay={handleReplay}
                            isReplaying={replayingIds.has(v.id)}
                          />
                        ))}
                        
                        {/* 📑 项目标准分页样式 (中文化) */}
                        <div className="pt-10 flex items-center justify-between border-t border-outline-variant/5">
                           <span className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-[0.2em]">
                              显示第 {(page - 1) * limit + 1} 到 {Math.min(page * limit, (variantsQuery.data?.count ?? 0))} 条变体记录，共 {variantsQuery.data?.count ?? 0} 条
                           </span>
                           
                           <div className="flex items-center gap-2">
                              <button 
                                disabled={page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-20"
                              >
                                 <ChevronLeft className="w-5 h-5" />
                              </button>

                              <div className="flex items-center gap-1">
                                 {Array.from({ length: Math.ceil((variantsQuery.data?.count ?? 0) / limit) }, (_, i) => i + 1)
                                   .filter(p => p === 1 || p === Math.ceil((variantsQuery.data?.count ?? 0) / limit) || Math.abs(p - page) <= 1)
                                   .map((p, i, arr) => (
                                     <React.Fragment key={p}>
                                       {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-on-surface-variant/20 text-[10px]">...</span>}
                                       <button 
                                         onClick={() => setPage(p)}
                                         className={cn(
                                           "w-10 h-10 flex items-center justify-center rounded-xl text-[10px] font-black transition-all border",
                                           p === page 
                                             ? "bg-primary-fixed text-on-primary border-primary-fixed shadow-lg shadow-primary-fixed/20" 
                                             : "border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high"
                                         )}
                                       >
                                         {p}
                                       </button>
                                     </React.Fragment>
                                   ))}
                              </div>

                              <button 
                                disabled={page >= Math.ceil((variantsQuery.data?.count ?? 0) / limit)}
                                onClick={() => setPage(p => p + 1)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-20"
                              >
                                 <ChevronRight className="w-5 h-5" />
                              </button>
                           </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "history" && (
             <div className="space-y-6">
                {historyQuery.isLoading ? (
                   <div className="py-20 text-center text-xs font-black opacity-30 animate-pulse uppercase tracking-widest">加载审计流水中...</div>
                ) : (
                   /* 绑定重放回调与详情查看回调 */
                   <HistoryTimeline 
                     history={historyQuery.data?.data ?? []} 
                     variantNames={variantNames} 
                     onReplay={handleReplay}
                     onView={(item) => {
                        // 构建一个临时的变体对象用于详情展示
                        setSelectedVariant({
                           id: item.source_id,
                           name: variantNames[item.source_id] || "未知变体",
                           root_flow_id: trafficId,
                           method: item.request_method,
                           url: item.request_url,
                           last_response_code: item.response_status,
                           last_response_body: item.error_message || "无需进一步诊断信息",
                           latency_ms: item.latency_ms,
                           created_at: item.executed_at,
                           last_request_curl: "", // 历史记录暂不存储 curl
                        } as any)
                     }}
                     onClone={(item) => {
                        // 克隆逻辑：切换至变体页并打开编辑器 (Clone & Split integration)
                        setActiveTab("variants")
                        setIsCreating(true)
                        // 这里的方案预留了对编辑器初始值的扩展支持
                        toast.info(`正在基于 ${variantNames[item.source_id] || '历史记录'} 构造新变体`)
                     }}
                   />
                )}
             </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 变体详情侧滑层 (保持在主页控制) */}
      <AnimatePresence>
        {selectedVariant && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedVariant(null)} className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-sm" />
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }} 
              className={cn(
                "fixed top-0 right-0 bottom-0 z-[120] bg-surface-container-lowest shadow-2xl flex flex-col border-l border-outline-variant/10 transition-all duration-300 ease-in-out",
                showDiff ? "w-[95vw] max-w-7xl" : "w-full max-w-2xl"
              )}
            >
              <div className="px-8 py-6 border-b border-outline-variant/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-2xl bg-primary-fixed/10 text-primary-fixed"><GitBranch className="w-6 h-6" /></div>
                  <div className="space-y-0.5">
                    <h2 className="text-xl font-black text-on-surface">{selectedVariant.name}</h2>
                    <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest leading-none">Variant Analysis & Comparison</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center bg-surface-container-high rounded-xl p-1 border border-outline-variant/10 mr-2">
                      <button 
                        onClick={() => handleToggleDiff(false)}
                        className={cn("px-3 py-1.5 text-[10px] font-black rounded-lg transition-all", !showDiff ? "bg-surface-container-lowest text-primary-fixed shadow-sm" : "text-on-surface-variant/50")}
                      >RESULT</button>
                      <button 
                        onClick={() => handleToggleDiff(true)}
                        className={cn("px-3 py-1.5 text-[10px] font-black rounded-lg transition-all", showDiff ? "bg-surface-container-lowest text-primary-fixed shadow-sm" : "text-on-surface-variant/50")}
                      >DIFF</button>
                   </div>
                   <button onClick={() => { setSelectedVariant(null); setShowDiff(false) }} className="p-2 rounded-xl hover:bg-surface-container-high transition-all"><X className="w-6 h-6 text-on-surface-variant" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-8 space-y-8">
                 {showDiff ? (
                    <DiffCodeViewer 
                      original={baselineResult?.body} 
                      current={selectedVariant.last_response_body} 
                      originalTitle={isFetchingBaseline ? "正在获取基准..." : "基准响应 (Baseline)"}
                      currentTitle="变体响应 (Variant)"
                    />
                 ) : (
                    <>
                      <section className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest">变体逻辑载荷</h4>
                          <div className="bg-[#1a1d23] rounded-3xl overflow-hidden border border-white/5">
                            <div className="px-6 py-3 border-b border-white/5 text-[10px] font-mono text-blue-300 truncate">{selectedVariant.url}</div>
                            <pre className="p-6 text-[12px] font-mono text-[#9cdcfe] leading-relaxed">
                                {`# Headers\n${Object.entries(selectedVariant.headers || {}).map(([k,v]) => `${k}: ${v}`).join("\n")}\n\n# Body\n${selectedVariant.body_str || "(空)"}`}
                            </pre>
                          </div>
                      </section>
                      <section className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest flex items-center gap-2">
                             <Play className="w-3 h-3" /> 请求审计 (Request Audit - CURL)
                          </h4>
                          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
                              <div className="px-4 py-2 bg-surface-container-high/50 border-b border-outline-variant/5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 flex justify-between items-center">
                                 <span>CURL Command</span>
                                 <button 
                                   onClick={() => selectedVariant.last_request_curl && navigator.clipboard.writeText(selectedVariant.last_request_curl)}
                                   className="text-[8px] hover:text-primary-fixed transition-colors"
                                 >
                                   COPY
                                 </button>
                              </div>
                              <pre className="p-4 text-[10px] font-mono text-primary-fixed bg-black/5 max-h-40 overflow-auto tracking-normal leading-relaxed break-all whitespace-pre-wrap">
                                 {selectedVariant.last_request_curl || "// No request data captured yet"}
                              </pre>
                          </div>
                      </section>

                      <section className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest flex items-center gap-2">
                             <ArrowRightLeft className="w-3 h-3" /> 最近执行响应 (Last Response)
                          </h4>
                          {selectedVariant.last_response_code !== null ? (
                            <div className="space-y-4">
                               {/* 响应头审计区 */}
                               {selectedVariant.last_response_code !== 0 && (
                                 <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
                                    <div className="px-4 py-2 bg-surface-container-high/50 border-b border-outline-variant/5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Response Headers</div>
                                    <pre className="p-4 text-[10px] font-mono text-on-surface-variant/80 max-h-40 overflow-auto leading-relaxed">
                                       {selectedVariant.last_response_headers ? JSON.stringify(selectedVariant.last_response_headers, null, 2) : "// No headers captured"}
                                    </pre>
                                 </div>
                               )}

                               {selectedVariant.last_response_code === 0 ? (
                                 <div className="p-10 rounded-[3rem] bg-red-500/5 border border-red-500/20 space-y-6">
                                    <div className="flex items-center gap-4 text-red-500">
                                       <div className="p-3 rounded-2xl bg-red-500/10 shadow-inner"><AlertCircle className="w-6 h-6" /></div>
                                       <div>
                                          <h5 className="font-black text-sm uppercase tracking-tight">网络连接故障审计</h5>
                                          <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] leading-none mt-1">Connection Audit Failure</p>
                                       </div>
                                    </div>
                                    <div className="space-y-6">
                                       <div className="space-y-2">
                                          <p className="text-[11px] font-black text-red-600/50 uppercase tracking-widest px-1">异常诊断记录 (DIAGNOSTIC LOGS)</p>
                                          <pre className="p-6 rounded-3xl bg-black/20 text-xs font-mono text-red-500/90 leading-relaxed whitespace-pre-wrap border border-red-500/10 shadow-2xl">
                                             {selectedVariant.last_response_body || "Unknown network error occurred during replay execution."}
                                          </pre>
                                       </div>
                                       
                                       <div className="space-y-3">
                                          <div className="p-5 rounded-2xl bg-white/5 border border-red-500/5 flex items-start gap-4">
                                             <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-[10px] font-black text-red-500 shrink-0">A</div>
                                             <div>
                                                <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest mb-1">物理可达性检查</p>
                                                <p className="text-xs font-bold text-on-surface-variant/80">检查目标 Host 是否解析正确，或服务是否因宕机、限流导致连接重置。</p>
                                             </div>
                                          </div>
                                          <div className="p-5 rounded-2xl bg-white/5 border border-red-500/5 flex items-start gap-4">
                                             <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-[10px] font-black text-red-500 shrink-0">B</div>
                                             <div>
                                                <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest mb-1">虚拟网络环境</p>
                                                <p className="text-xs font-bold text-on-surface-variant/80">若身处 Docker 或私有网络，请优先尝试使用宿主机映射名 <span className="text-primary-fixed">host.docker.internal</span>。</p>
                                             </div>
                                          </div>
                                       </div>

                                       <div className="p-6 rounded-2xl bg-black/10 text-xs text-on-surface-variant/40 italic leading-relaxed border-t border-white/5">
                                          <span className="text-red-500/60 font-black not-italic mr-2">PRO TIP:</span>
                                          HTTP 状态码 0 通常意味着握手阶段失败。请确认防火墙规则与本地代理（如拦截类扩展）未对该域名执行静默拦截。
                                       </div>
                                    </div>
                                 </div>
                               ) : selectedVariant.last_response_body?.includes("[PRE-FLIGHT FORMAT ERROR]") ? (
                                 <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3">
                                    <div className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-tighter">
                                       <AlertCircle className="w-4 h-4" /> 格式诊断异常 (Diagnostic Error)
                                    </div>
                                    <pre className="text-xs font-mono text-red-600/80 leading-relaxed whitespace-pre-wrap italic">
                                       {selectedVariant.last_response_body}
                                    </pre>
                                 </div>
                               ) : (
                                 <BodyCodeViewer body={selectedVariant.last_response_body} title={`HTTP ${selectedVariant.last_response_code} Response Body`} />
                               )}
                            </div>
                          ) : (
                            <div className="p-10 rounded-3xl border border-dashed border-outline-variant/20 text-center opacity-40 font-bold text-xs uppercase tracking-widest">No replay history found</div>
                          )}
                      </section>
                    </>
                 )}
              </div>
              <div className="p-8 border-t border-outline-variant/5 bg-surface-container-low/30 flex items-center justify-between">
                 <button onClick={async () => {
                    if (confirm("确定要永久移除此变体吗？")) {
                       await __request(OpenAPI, { method: "DELETE", url: `/api/v1/variants/${selectedVariant.id}` })
                       variantsQuery.refetch()
                       setSelectedVariant(null)
                    }
                 }} className="p-3 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-6 h-6" /></button>
                 <button onClick={() => handleReplay(selectedVariant.id)} className="flex items-center gap-2 px-10 py-3 rounded-2xl bg-primary-fixed text-on-primary text-sm font-black shadow-xl shadow-primary-fixed/20 active:scale-95 transition-all">
                    <Play className="w-5 h-5" /> 触发立即重放
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

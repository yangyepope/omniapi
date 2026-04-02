import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Activity, Clock, Database, Copy, Check, Server, Shield } from "lucide-react"
import { useMemo, useState } from "react"
import { z } from "zod"
import { motion } from "motion/react"

import { SystemModulesService, TrafficManagerService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

const formatRelativeTime = (value?: string | null) => {
  if (!value) return "未知"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "未知"
  const diff = Date.now() - parsed.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

const formatAbsoluteTime = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

// execCommand 降级复制：兼容 HTTP 内网环境（navigator.clipboard 需要 HTTPS）
function copyViaExecCommand(text: string): void {
  const el = document.createElement("textarea")
  el.value = text
  el.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;"
  document.body.appendChild(el)
  el.focus()
  el.select()
  try {
    ;(document as unknown as { execCommand: (cmd: string) => boolean }).execCommand("copy")
  } finally { document.body.removeChild(el) }
}

const PayloadDisplay = ({ body }: { body: string }) => {
  const [copied, setCopied] = useState(false)

  const formattedBody = useMemo(() => {
    try {
      const parsed = JSON.parse(body)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return body
    }
  }, [body])

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    // 优先 Clipboard API，降级到 execCommand（兼容 HTTP 内网环境）
    const write = navigator?.clipboard
      ? navigator.clipboard.writeText(formattedBody).catch(() => {
          copyViaExecCommand(formattedBody)
        })
      : Promise.resolve(copyViaExecCommand(formattedBody))
    write.then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative group/code">
      <div className="max-h-[500px] overflow-auto rounded-3xl bg-surface-container-low/50 p-8 border border-outline-variant/5 shadow-inner">
        <pre className="text-xs font-mono text-primary-fixed leading-relaxed whitespace-pre-wrap break-all tracking-tight">
          {formattedBody}
        </pre>
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={handleCopy}
          className={cn(
            "p-2 rounded-xl border transition-all shadow-sm",
            copied 
              ? "bg-secondary-fixed text-on-secondary border-secondary-fixed" 
              : "bg-surface-container-high text-on-surface-variant hover:text-primary-fixed hover:bg-surface-container-highest border-outline-variant/10"
          )}
          title={copied ? "已复制" : "复制 Payload"}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <Badge variant="neutral" className="text-[9px] font-black uppercase bg-primary-fixed/10 text-primary-fixed border-none">
          JSON Format
        </Badge>
      </div>
    </div>
  )
}

const searchSchema = z.object({
  query: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
})

export const Route = createFileRoute("/_layout/services/$serviceId/$endpointId/")({
  component: EndpointDetailPage,
  validateSearch: searchSchema,
})

type TagValue = "已测试" | "未测试" | "高危" | ""

const TAG_STYLES: Record<string, string> = {
  "已测试": "bg-green-100 text-green-700 border-green-200",
  "未测试": "bg-gray-100 text-gray-500 border-gray-200",
  "高危":   "bg-red-100 text-red-600 border-red-200",
}

const METHOD_STYLES: Record<string, string> = {
  GET:    "bg-blue-50 text-blue-600 border-blue-200",
  POST:   "bg-red-50 text-red-500 border-red-200",
  PUT:    "bg-green-50 text-green-600 border-green-200",
  DELETE: "bg-orange-50 text-orange-600 border-orange-200",
  PATCH:  "bg-purple-50 text-purple-600 border-purple-200",
}

function EndpointDetailPage() {
  const { serviceId, endpointId } = Route.useParams()
  const [recordTags, setRecordTags] = useState<Record<string, TagValue>>({})

  const statsQuery = useQuery({
    queryKey: ["system-modules", "stats"],
    queryFn: () => SystemModulesService.getSystemModulesStats(),
  })


  const endpointDetailQuery = useQuery({
    queryKey: ["system-modules", "endpoint-detail", serviceId, endpointId],
    queryFn: () =>
      SystemModulesService.getModuleEndpointDetail({
        moduleId: serviceId,
        endpointId,
      }),
  })

  const endpointTrafficQuery = useQuery({
    queryKey: ["traffic-manager", "endpoint-traffic", endpointId],
    queryFn: () =>
      TrafficManagerService.getEndpointTraffic({
        endpointId: endpointId,
        skip: 0,
        limit: 50,
      }),
  })

  const isLoadingInitial = endpointDetailQuery.isLoading || statsQuery.isLoading
  const detail = endpointDetailQuery.data?.endpoint
  const trafficRecords = endpointTrafficQuery.data?.data ?? endpointDetailQuery.data?.recent_traffic ?? []
  const trafficCount = endpointDetailQuery.data?.traffic_count ?? endpointTrafficQuery.data?.count ?? 0
  

  if (isLoadingInitial) {
    return (
      <div className="flex h-[calc(100vh-100px)] flex-col items-center justify-center text-on-surface-variant space-y-4">
        <Server className="w-10 h-10 animate-pulse text-primary-fixed" />
        <p className="font-bold text-sm tracking-widest animate-pulse uppercase">解构接口内核中...</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex h-[calc(100vh-100px)] flex-col items-center justify-center text-on-surface-variant space-y-4">
        <Shield className="w-10 h-10 text-tertiary" />
        <p className="font-bold text-lg text-on-surface">接口读取异常</p>
        <Link to="/services/$serviceId" params={{ serviceId }} className="text-primary-fixed hover:underline font-bold text-sm">返回接口列表</Link>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col gap-6 mb-10">

        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link
              to="/services/$serviceId"
              params={{ serviceId }}
              search={{ page: 1, pageSize: 20, query: "" }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-primary-fixed transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <Badge variant={detail.method === 'GET' ? 'success' : 'default'} className="font-black px-2 py-0.5 rounded uppercase">
                  {detail.method}
                </Badge>
                <h2 className="text-3xl font-black tracking-tight text-on-surface truncate max-w-[600px]">{detail.path}</h2>
              </div>
              <p className="text-sm text-on-surface-variant mt-1 font-medium">{detail.description || "在该服务的安全矩阵中监控此接口的流量态势"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Column */}
        <div className="col-span-12 space-y-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 shadow-sm hover:shadow-lg hover:bg-surface-container-lowest transition-all duration-300 cursor-default"
            >
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary-fixed" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">请求频率</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-on-surface tracking-tighter">1.2k</span>
                <span className="text-[10px] font-bold text-secondary-fixed mb-1.5">+14% / hour</span>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 shadow-sm hover:shadow-lg hover:bg-surface-container-lowest transition-all duration-300 cursor-default"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary-fixed" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">平均响应</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-on-surface tracking-tighter">124ms</span>
                <span className="text-[10px] font-bold text-on-surface-variant/40 mb-1.5">Baseline: 110ms</span>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 shadow-sm hover:shadow-lg hover:bg-surface-container-lowest transition-all duration-300 cursor-default"
            >
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-primary-fixed" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">流量总量</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-primary-fixed tracking-tighter">{trafficCount}</span>
                <span className="text-[10px] font-bold text-on-surface-variant/40 mb-1.5">Unites captured</span>
              </div>
            </motion.div>
          </div>

          {/* Traffic Records Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="px-6 py-5 bg-surface-container-low/30 border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="text-sm font-black text-on-surface tracking-tight font-headline">近期流量捕获记录</h3>
              <Badge variant="neutral" className="text-[9px] font-black uppercase">Live stream enabled</Badge>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Method</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Real URI / Params</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Body</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">字段标签</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">变体数</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Source IP</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Captured At</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {trafficRecords.map((record: any) => (
                  <motion.tr 
                    key={record.id} 
                    whileHover={{ x: 4, backgroundColor: 'rgba(var(--surface-container-low), 0.6)' }}
                    className="hover:bg-surface-container-low/40 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={cn(
                        "font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded border",
                        METHOD_STYLES[record.method?.toUpperCase()] ?? "bg-surface-container-high text-on-surface-variant border-outline-variant/20"
                      )}>
                        {record.method}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-mono text-xs text-primary-fixed break-all line-clamp-1" title={record.original_path}>
                         {record.original_path}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      {record.body ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer">
                              <span className="max-w-[120px] truncate font-mono text-[10px] text-on-surface-variant/70 bg-surface-container-high/50 px-1.5 py-0.5 rounded border border-outline-variant/10 hover:text-primary-fixed hover:border-primary-fixed/30 transition-all">
                                {record.body}
                              </span>
                              <Activity className="w-3 h-3 text-on-surface-variant/20 hover:text-primary-fixed transition-colors" />
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl bg-surface-container-lowest border-outline-variant/10 shadow-2xl rounded-[2rem] p-8">
                            <DialogHeader className="mb-6">
                              <DialogTitle className="text-xl font-black text-on-surface flex items-center gap-3">
                                <Database className="w-5 h-5 text-primary-fixed" />
                                流量负载详细 Payload
                              </DialogTitle>
                              <DialogDescription className="text-xs font-medium text-on-surface-variant mt-1">
                                已捕获请求体 (Method: {record.method} | IP: {record.client_ip || "Internal"})
                              </DialogDescription>
                            </DialogHeader>
                            <PayloadDisplay body={record.body} />
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-[10px] font-bold text-on-surface-variant/20 tracking-widest">—</span>
                      )}
                    </td>
                    {/* 字段标签列：使用 DropdownMenu 实现紧凑的内联标签选择器 */}
                    <td className="px-6 py-5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        {/* 触发器：以徽章形式呈现，选中后呈现对应颜色语义 */}
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              // 基础样式：紧凑行高（py-0.5）、超小字体、圆角胶囊、边框
                              // duration-200 符合 skill 规定的 150-300ms 平滑过渡
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border",
                              "text-[10px] font-bold cursor-pointer transition-all duration-200",
                              // focus-visible 保留键盘导航的可见焦点环（UX规范要求）
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/30",
                              // 已设置标签时切换为对应颜色主题，否则呈淡色占位态
                              recordTags[record.id]
                                ? TAG_STYLES[recordTags[record.id]]
                                : "bg-surface-container-high/40 text-on-surface-variant/30 border-outline-variant/10 hover:border-outline-variant/40 hover:text-on-surface-variant/60"
                            )}
                          >
                            {/* 标签文字：未选时显示灰色占位，已选时显示标签名 */}
                            <span>{recordTags[record.id] || "设置标签"}</span>
                            {/* 极小下拉箭头，不破坏紧凑视觉重量 */}
                            <ChevronDown className="w-2.5 h-2.5 opacity-50 shrink-0" />
                          </button>
                        </DropdownMenuTrigger>

                        {/* 下拉面板：复用项目 surface-container 毛玻璃风格，与其他弹窗保持一致 */}
                        <DropdownMenuContent
                          align="start"
                          className="min-w-[96px] p-1 rounded-2xl bg-surface-container-low/95 backdrop-blur-xl border-outline-variant/10 shadow-xl"
                        >
                          {/* 已测试：绿色 — 表示该流量已完成安全分析 */}
                          <DropdownMenuItem
                            className="text-[11px] font-bold text-green-700 rounded-xl px-3 py-1.5 cursor-pointer focus:bg-green-50/80 focus:text-green-700"
                            onClick={() => setRecordTags(prev => ({ ...prev, [record.id]: "已测试" }))}
                          >
                            已测试
                          </DropdownMenuItem>
                          {/* 未测试：灰色 — 表示待分析的捕获流量 */}
                          <DropdownMenuItem
                            className="text-[11px] font-bold text-on-surface-variant/60 rounded-xl px-3 py-1.5 cursor-pointer focus:bg-surface-container-high focus:text-on-surface-variant"
                            onClick={() => setRecordTags(prev => ({ ...prev, [record.id]: "未测试" }))}
                          >
                            未测试
                          </DropdownMenuItem>
                          {/* 高危：红色 — 表示流量携带安全风险特征 */}
                          <DropdownMenuItem
                            className="text-[11px] font-bold text-red-600 rounded-xl px-3 py-1.5 cursor-pointer focus:bg-red-50/80 focus:text-red-600"
                            onClick={() => setRecordTags(prev => ({ ...prev, [record.id]: "高危" }))}
                          >
                            高危
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-on-surface-variant/20 tracking-widest">—</span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                       <span className="text-xs font-bold text-on-surface">{record.client_ip || "Internal"}</span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        className="text-[10px] font-mono font-medium text-on-surface-variant group-hover:text-primary-fixed transition-colors"
                        title={formatRelativeTime(record.captured_at || record.created_at)}
                      >
                        {formatAbsoluteTime(record.captured_at || record.created_at)}
                      </span>
                    </td>
                    {/* 操作列：提供进入流量详情页的入口链接 */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <Link
                        to="/services/$serviceId/$endpointId/$trafficId"
                        params={{ serviceId, endpointId, trafficId: record.id }}
                        className="text-[10px] font-bold text-primary-fixed hover:underline hover:text-primary-fixed/80 transition-colors duration-200"
                      >
                        详情
                      </Link>
                    </td>
                  </motion.tr>
                ))}
                {trafficRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center text-on-surface-variant font-medium opacity-50">
                       目前尚无历史流量捕获记录，正在监听中...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </motion.div>
  )
}

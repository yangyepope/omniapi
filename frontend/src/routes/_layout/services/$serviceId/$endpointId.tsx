import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Bell, ChevronRight, Globe, Lock, Shield, Zap, Activity, Clock, Database, Server } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"
import { motion } from "motion/react"

import { SystemModulesService, TrafficManagerService } from "@/client"
import { Badge } from "@/components/ui/badge"

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

const searchSchema = z.object({
  query: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
})

export const Route = createFileRoute("/_layout/services/$serviceId/$endpointId")({
  component: EndpointDetailPage,
  validateSearch: searchSchema,
})

function EndpointDetailPage() {
  const { serviceId, endpointId } = Route.useParams()

  const statsQuery = useQuery({
    queryKey: ["system-modules", "stats"],
    queryFn: () => SystemModulesService.getSystemModulesStats(),
  })

  const modules = statsQuery.data?.data ?? []
  const currentModule = useMemo(() => modules.find((item) => item.id === serviceId), [modules, serviceId])

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
  
  const serviceName = currentModule?.name || "Loading..."

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
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
          <Link to="/" search={{}} className="hover:text-primary-fixed transition-colors">仪表盘</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/services" search={{ page: 1, pageSize: 20, query: "" }} className="hover:text-primary-fixed transition-colors">服务列表</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/services/$serviceId" params={{ serviceId }} search={{ page: 1, pageSize: 20, query: "" }} className="hover:text-primary-fixed transition-colors truncate max-w-[150px]">{serviceName}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-on-surface truncate max-w-[200px]">{detail.path}</span>
        </nav>
        
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
          <div className="flex gap-2">
            <button className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-primary-fixed transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="px-4 py-2.5 rounded-xl bg-primary-fixed text-on-primary font-bold text-sm shadow-lg shadow-primary-fixed/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              重放此接口
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary-fixed" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">请求频率</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-on-surface tracking-tighter">1.2k</span>
                <span className="text-[10px] font-bold text-secondary-fixed mb-1.5">+14% / hour</span>
              </div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary-fixed" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">平均响应</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-on-surface tracking-tighter">124ms</span>
                <span className="text-[10px] font-bold text-on-surface-variant/40 mb-1.5">Baseline: 110ms</span>
              </div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-primary-fixed" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">流量总量</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-primary-fixed tracking-tighter">{trafficCount}</span>
                <span className="text-[10px] font-bold text-on-surface-variant/40 mb-1.5">Unites captured</span>
              </div>
            </div>
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
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Source IP</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Captured At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {trafficRecords.map((record: any) => (
                  <tr key={record.id} className="hover:bg-surface-container-low/40 transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap">
                       <span className="font-mono text-[10px] font-black text-on-surface-variant uppercase">{record.method}</span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-mono text-xs text-primary-fixed break-all line-clamp-1" title={record.real_uri}>
                         {record.real_uri}
                      </p>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-xs font-bold text-on-surface">{record.source_ip || "Internal"}</span>
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      <span className="text-xs font-medium text-on-surface-variant">{formatRelativeTime(record.created_at)}</span>
                    </td>
                  </tr>
                ))}
                {trafficRecords.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-on-surface-variant font-medium opacity-50">
                       目前尚无历史流量捕获记录，正在监听中...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm relative overflow-hidden group">
            <h3 className="text-lg font-black text-on-surface mb-4 font-headline">安全合规审计</h3>
            <div className="space-y-4 relative z-10">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded bg-secondary-fixed/20 text-secondary-fixed">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">全球暴露度: 低 (Internal Only)</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 font-medium">该接口仅在 VPC 环境内可路由访问</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded bg-primary-fixed/20 text-primary-fixed">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">身份认证: 强制 (RSA-256)</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 font-medium">所有请求必须携带合法的 JWT 凭证</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded bg-secondary-fixed/20 text-secondary-fixed">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">限流策略: 500 req/min</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 font-medium">防止大规模暴力破解或服务拒绝攻击</p>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-24 h-24 bg-primary-fixed/5 rounded-full blur-2xl group-hover:bg-primary-fixed/10 transition-all" />
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
            <h3 className="text-sm font-black text-on-surface mb-4 tracking-tight uppercase">所属微服务节点</h3>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary-fixed/5 text-primary-fixed">
                <Server className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-on-surface truncate">{serviceName}</p>
                <Link 
                  to="/services/$serviceId" 
                  params={{ serviceId }} 
                  search={{ page: 1, pageSize: 20, query: "" }} 
                  className="text-xs font-bold text-primary-fixed hover:underline"
                >
                  查看服务全量接口
                </Link>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-outline-variant/10">
               <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-2">
                  <span>服务健康度评估</span>
                  <span className="text-secondary-fixed">HEALTHY</span>
               </div>
               <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-secondary-fixed w-[92%]" />
               </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

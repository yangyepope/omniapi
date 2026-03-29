
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Bell, HelpCircle } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"

import { SystemModulesService, TrafficManagerService } from "@/client"
import { cn } from "@/lib/utils"
import { listMethodClass } from "@/components/api-center/MethodBadge"

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
  query: z.string().optional().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(20),
})

export const Route = createFileRoute("/_layout/api-center/$moduleId/$endpointId")({
  component: EndpointDetailPage,
  validateSearch: searchSchema,
})

function EndpointDetailPage() {
  const { moduleId, endpointId } = Route.useParams()

  const statsQuery = useQuery({
    queryKey: ["system-modules", "stats"],
    queryFn: () => SystemModulesService.getSystemModulesStats(),
  })

  const modules = statsQuery.data?.data ?? []
  const currentModule = useMemo(() => modules.find((item) => item.id === moduleId), [modules, moduleId])

  const endpointDetailQuery = useQuery({
    queryKey: ["system-modules", "endpoint-detail", moduleId, endpointId],
    queryFn: () =>
      SystemModulesService.getModuleEndpointDetail({
        moduleId,
        endpointId,
      }),
  })

  const endpointTrafficQuery = useQuery({
    queryKey: ["traffic-manager", "endpoint-traffic", endpointId],
    queryFn: () =>
      TrafficManagerService.getEndpointTraffic({
        endpointId: endpointId,
        skip: 0,
        limit: 100,
      }),
  })

  const isLoadingInitial = endpointDetailQuery.isLoading || statsQuery.isLoading

  const detail = endpointDetailQuery.data?.endpoint
  const trafficData = endpointTrafficQuery.data
  const trafficRecords = trafficData?.data ?? endpointDetailQuery.data?.recent_traffic ?? []
  const trafficCount = endpointDetailQuery.data?.traffic_count ?? trafficData?.count ?? 0

  return (
    <div className="relative flex flex-1 flex-col">
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/5 bg-[#0a0e14]/80 px-8 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link
            to="/api-center/$moduleId"
            params={{ moduleId }}
            search={(prev: any) => ({ ...prev })}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 transition-all hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 text-[#a8abb3] group-hover:text-[#00f1fe]" />
          </Link>
          <div className="flex items-center gap-2 text-sm font-bold tracking-tight">
            <span className={cn("text-[#a8abb3]/60", statsQuery.isLoading && "animate-pulse")} style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              {currentModule?.name || (statsQuery.isLoading ? "Loading..." : "Unknown Module")}
            </span>
            <span className="text-[#a8abb3]/30">/</span>
            <span className="text-[#00f1fe]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>接口详情</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" className="text-slate-400 transition-all hover:text-[#00f1fe]">
            <Bell className="h-5 w-5" />
          </button>
          <button type="button" className="text-slate-400 transition-all hover:text-[#00f1fe]">
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-8 py-12 space-y-12 transition-opacity duration-300">
        {isLoadingInitial ? (
           <div className="flex flex-1 flex-col items-center justify-center py-32 space-y-6">
              <div className="relative">
                 <div className="size-16 animate-spin rounded-full border-4 border-[#00f1fe]/10 border-t-[#00f1fe]" />
                 <div className="absolute inset-0 size-16 animate-ping rounded-full border-4 border-[#00f1fe]/5" />
              </div>
              <p className="text-[#a8abb3]/60 font-black tracking-widest animate-pulse" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                DECODING ENDPOINT KERNEL...
              </p>
           </div>
        ) : !detail ? (
           <div className="flex flex-1 flex-col items-center justify-center py-32 space-y-4">
              <p className="text-xl font-bold text-[#f1f3fc]">接口读取失败</p>
              <p className="text-sm text-[#a8abb3]/60">请检查连接并返回列表重试</p>
           </div>
        ) : (
          <>
            {/* 基本信息卡片 */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md transition-all hover:bg-white/10">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a8abb3]/60">请求方法</p>
                <p className="text-3xl font-black text-[#f1f3fc] group-hover:text-[#00f1fe] transition-colors" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                  {detail.method}
                </p>
              </div>
              <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md transition-all hover:bg-white/10 md:col-span-2">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a8abb3]/60">接口路径</p>
                <p className="truncate text-3xl font-black text-[#00f1fe] drop-shadow-[0_0_12px_rgba(0,241,254,0.3)]" title={detail.path} style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                  {detail.path}
                </p>
              </div>
              <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md transition-all hover:bg-white/10">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a8abb3]/60">流量单元</p>
                <p className="text-3xl font-black text-[#9d50ff] drop-shadow-[0_0_12px_rgba(157,80,255,0.3)]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                  {trafficCount}
                </p>
              </div>
            </div>

            {/* 流量记录表格 */}
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-2xl">
              <div className="border-b border-white/10 bg-white/5 px-6 py-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a8abb3]/60">近期流量单元记录</h3>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="w-[12%] px-6 py-5 text-[11px] font-bold text-[#a8abb3]/40">方法</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-[#a8abb3]/40">请求 URI</th>
                    <th className="w-[20%] px-6 py-5 text-[11px] font-bold text-[#a8abb3]/40 text-right">来源 IP</th>
                    <th className="w-[20%] px-6 py-5 text-[11px] font-bold text-[#a8abb3]/40 text-right">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {trafficRecords.map((record: any) => (
                    <tr key={record.id} className="group transition-all hover:bg-white/[0.03]">
                      <td className="px-6 py-4">
                        <span className={cn("rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wider", listMethodClass(record.method))}>
                          {record.method}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="truncate font-mono text-xs text-[#f1f3fc]/80" title={record.real_uri}>
                          {record.real_uri}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-sm text-[#a8abb3]/60">{record.source_ip || "-"}</td>
                      <td className="px-6 py-4 text-right text-sm text-[#a8abb3]/60">{formatRelativeTime(record.created_at)}</td>
                    </tr>
                  ))}
                  {trafficRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        暂无流量记录
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

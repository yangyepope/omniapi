import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, Bell, ChevronLeft, ChevronRight, Download, HelpCircle, Plus, Search, Star } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"

import { type SystemModuleStats, SystemModulesService, TrafficManagerService } from "@/client"
import { cn } from "@/lib/utils"

const searchSchema = z.object({
  moduleId: z.string().optional().catch(undefined),
  endpointId: z.string().optional().catch(undefined),
  query: z.string().optional().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(20),
})

const pageSizeOptions = [10, 20, 50] as const

const methodClass = (method: string) => {
  const m = method.toUpperCase()
  if (m === "GET") return "border-blue-500/30 bg-blue-500/10 text-blue-400"
  if (m === "POST" || m === "PUT" || m === "PATCH") return "border-green-500/30 bg-green-500/10 text-green-400"
  if (m === "DELETE") return "border-red-500/30 bg-red-500/10 text-red-400"
  return "border-slate-500/30 bg-slate-500/10 text-slate-400"
}

const levelStars = (level?: string | null) => {
  const val = (level || "p3").toLowerCase()
  if (val === "p0") return 4
  if (val === "p1") return 3
  if (val === "p2") return 2
  return 1
}

const SourceIndicator = ({ source }: { source?: string | null }) => {
  if (source === "auto_discovered") {
    return (
      <div className="flex items-center space-x-2">
        <div className="size-2 rounded-full bg-blue-500" />
        <span className="text-[13px] text-slate-300">Auto-Discovered</span>
      </div>
    )
  }
  if (source === "documented") {
    return (
      <div className="flex items-center space-x-2">
        <div className="size-2 rounded-full bg-slate-500" />
        <span className="text-[13px] text-slate-400">Manual Registry</span>
      </div>
    )
  }
  return (
    <div className="flex items-center space-x-2">
      <div className="size-2 rounded-full bg-slate-500" />
      <span className="text-[13px] text-slate-400">{source || "未知"}</span>
    </div>
  )
}

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

const buildPageItems = (currentPage: number, totalPages: number): Array<number | "ellipsis"> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages]
}

export const Route = createFileRoute("/_layout/api-center")({
  component: ApiCenterPage,
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "接口中心 - OmniAPI" }],
  }),
})

function ApiCenterPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const statsQuery = useQuery({
    queryKey: ["system-modules", "stats"],
    queryFn: () => SystemModulesService.getSystemModulesStats(),
  })

  const modules = statsQuery.data?.data ?? []
  const currentModule = useMemo<SystemModuleStats | undefined>(
    () => modules.find((item) => item.id === search.moduleId),
    [modules, search.moduleId],
  )

  const endpointsQuery = useQuery({
    queryKey: ["system-modules", "endpoints", search.moduleId],
    queryFn: () =>
      SystemModulesService.getModuleEndpoints({
        moduleId: search.moduleId ?? "",
      }),
    enabled: Boolean(search.moduleId),
  })

  const goModule = (moduleId: string) => {
    navigate({
      search: {
        moduleId,
        endpointId: undefined,
        query: "",
        page: 1,
        pageSize: search.pageSize,
      },
    })
  }

  const goHome = () => {
    navigate({
      search: {
        moduleId: undefined,
        endpointId: undefined,
        query: "",
        page: 1,
        pageSize: search.pageSize,
      },
    })
  }

  const goEndpointDetail = (endpointId: string) => {
    navigate({
      search: {
        moduleId: search.moduleId,
        endpointId,
        query: search.query,
        page: search.page,
        pageSize: search.pageSize,
      },
    })
  }

  const goModuleList = () => {
    navigate({
      search: {
        moduleId: search.moduleId,
        endpointId: undefined,
        query: search.query,
        page: search.page,
        pageSize: search.pageSize,
      },
    })
  }

  const endpointDetailQuery = useQuery({
    queryKey: ["system-modules", "endpoint-detail", search.moduleId, search.endpointId],
    queryFn: () =>
      SystemModulesService.getModuleEndpointDetail({
        moduleId: search.moduleId ?? "",
        endpointId: search.endpointId ?? "",
      }),
    enabled: Boolean(search.moduleId && search.endpointId),
  })

  const endpointTrafficQuery = useQuery({
    queryKey: ["traffic-manager", "endpoint-traffic", search.endpointId],
    queryFn: () =>
      TrafficManagerService.getEndpointTraffic({
        endpointId: search.endpointId ?? "",
        skip: 0,
        limit: 100,
      }),
    enabled: Boolean(search.endpointId),
  })

  if (search.moduleId && currentModule && search.endpointId) {
    const detailData = endpointDetailQuery.data
    const detail = detailData?.endpoint
    const trafficData = endpointTrafficQuery.data
    const trafficRecords = trafficData?.data ?? detailData?.recent_traffic ?? []
    const trafficCount = detailData?.traffic_count ?? trafficData?.count ?? 0

    if (endpointDetailQuery.isLoading) {
      return (
        <div className="flex h-full min-h-screen items-center justify-center bg-[#0f111a] text-slate-400">
          正在加载接口详情...
        </div>
      )
    }

    if (endpointDetailQuery.isError || !detail) {
      return (
        <div className="flex h-full min-h-screen items-center justify-center bg-[#0f111a] text-slate-400">
          接口详情加载失败，请返回列表重试
        </div>
      )
    }

    return (
      <div className="flex h-full min-h-screen flex-col bg-[#0f111a] text-slate-200">
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-800/60 bg-[#151822] px-6">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={goModuleList}
              title="返回接口列表"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
              {currentModule.name} <span className="text-slate-500 font-normal ml-2">/ 接口详情</span>
            </h2>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6">
          {/* 基本信息卡片 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-md border border-slate-800/60 bg-[#151822] p-4">
              <p className="mb-1 text-[12px] font-medium text-slate-500">请求方法</p>
              <p className="text-xl font-bold text-slate-200">{detail.method}</p>
            </div>
            <div className="rounded-md border border-slate-800/60 bg-[#151822] p-4 md:col-span-2">
              <p className="mb-1 text-[12px] font-medium text-slate-500">接口路径</p>
              <p className="truncate text-xl font-bold text-blue-400" title={detail.path}>
                {detail.path}
              </p>
            </div>
            <div className="rounded-md border border-slate-800/60 bg-[#151822] p-4">
              <p className="mb-1 text-[12px] font-medium text-slate-500">流量条数</p>
              <p className="text-xl font-bold text-slate-200">{trafficCount}</p>
            </div>
          </div>

          {/* 流量记录表格 */}
          <div className="overflow-hidden rounded-md border border-slate-800/60 bg-[#151822]">
            <div className="border-b border-slate-800/60 px-4 py-3">
              <h3 className="text-sm font-medium text-slate-200">近期流量记录</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800/60 bg-[#1a1d27]">
                <tr className="text-slate-400">
                  <th className="w-[140px] px-4 py-3 font-medium">方法</th>
                  <th className="px-4 py-3 font-medium">请求 URI</th>
                  <th className="w-[180px] px-4 py-3 font-medium">来源 IP</th>
                  <th className="w-[180px] px-4 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trafficRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[#1a1d27]/50">
                    <td className="px-4 py-3">
                      <span className={cn("inline-block rounded-[4px] px-2 py-0.5 text-[11px] font-semibold tracking-wider", methodClass(record.method))}>
                        {record.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate text-[13px] text-slate-300" title={record.real_uri}>
                        {record.real_uri}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-400">{record.source_ip || "-"}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-400">{formatRelativeTime(record.created_at)}</td>
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
        </main>
      </div>
    )
  }

  if (statsQuery.isLoading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-[#0f111a] text-slate-400">
        正在加载服务模块...
      </div>
    )
  }

  if (statsQuery.isError) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-[#0f111a] text-slate-400">
        模块数据加载失败，请稍后重试
      </div>
    )
  }

  if (search.moduleId && currentModule) {
    const safeQuery = search.query ?? ""
    const normalizedKeyword = safeQuery.trim().toLowerCase()
    const filteredEndpoints = (endpointsQuery.data?.data ?? []).filter((item) => {
      if (!normalizedKeyword) return true
      return [item.path, item.method, item.name ?? "", item.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword)
    })
    const totalCount = filteredEndpoints.length
    const totalPages = Math.max(1, Math.ceil(totalCount / search.pageSize))
    const currentPage = Math.min(search.page, totalPages)
    const pageStart = (currentPage - 1) * search.pageSize
    const endpoints = filteredEndpoints.slice(pageStart, pageStart + search.pageSize)
    const pageItems = buildPageItems(currentPage, totalPages)

    return (
      <div className="flex h-full min-h-screen flex-col bg-[#0f111a] text-slate-200">
        {/* 顶部标题与返回区域 */}
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-800/60 bg-[#151822] px-6">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={goHome}
              title="返回列表"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-100 uppercase tracking-wide">
              {currentModule.name}
            </h2>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <button type="button" className="hover:text-slate-200"><Bell className="size-5" /></button>
            <button type="button" className="hover:text-slate-200"><HelpCircle className="size-5" /></button>
          </div>
        </header>

        <main className="flex-1 p-6">
          {/* 工具栏：搜索与操作按钮 */}
          <div className="mb-4 flex items-center justify-between">
            <div className="relative w-[320px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={safeQuery}
                onChange={(event) =>
                  navigate({
                    search: {
                      moduleId: search.moduleId,
                      endpointId: undefined,
                      query: event.target.value,
                      page: 1,
                      pageSize: search.pageSize,
                    },
                  })
                }
                placeholder="搜索接口或描述..."
                className="h-9 w-full rounded-md border border-slate-700 bg-[#1c1f2b] pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                className="flex h-9 items-center space-x-2 rounded-md border border-slate-700 bg-[#1c1f2b] px-4 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                <Download className="size-4" />
                <span>导出数据</span>
              </button>
              <button
                type="button"
                className="flex h-9 items-center space-x-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="size-4" />
                <span>新建接口</span>
              </button>
            </div>
          </div>

          {/* 数据表格 */}
          <div className="overflow-hidden rounded-md border border-slate-800/60 bg-[#151822]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800/60 bg-[#1a1d27]">
                <tr className="text-slate-400">
                  <th className="w-[10%] px-4 py-3 font-medium">方法</th>
                  <th className="w-[30%] px-4 py-3 font-medium">接口路径</th>
                  <th className="w-[20%] px-4 py-3 font-medium">接口描述</th>
                  <th className="w-[15%] px-4 py-3 font-medium">导入方式</th>
                  <th className="w-[15%] px-4 py-3 font-medium">接口等级</th>
                  <th className="w-[10%] px-4 py-3 text-center font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {endpoints.map((endpoint) => {
                  const active = levelStars((endpoint as { level?: string | null }).level)
                  return (
                    <tr key={endpoint.id} className="group hover:bg-[#1a1d27]/50">
                      <td className="px-4 py-3">
                        <span className={cn("inline-block rounded-[4px] px-2 py-0.5 text-[11px] font-semibold tracking-wider", methodClass(endpoint.method))}>
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[13px] text-slate-300 group-hover:text-blue-400 transition-colors">
                          {endpoint.path}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-400">
                        {endpoint.description || "暂无描述"}
                      </td>
                      <td className="px-4 py-3">
                        <SourceIndicator source={endpoint.source_type} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn("size-3.5", star <= active ? "fill-blue-500 text-blue-500" : "fill-slate-700 text-slate-700")}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          className="text-blue-500 hover:text-blue-400 text-[13px]"
                          onClick={() => goEndpointDetail(endpoint.id)}
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {endpoints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      暂无数据
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {/* 分页 */}
            <div className="flex items-center justify-between border-t border-slate-800/60 bg-[#151822] px-4 py-3">
              <div className="text-[13px] text-slate-400">
                共 {totalCount} 条
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-[13px] text-slate-400">
                  <span>每页显示:</span>
                  <select
                    value={search.pageSize}
                    onChange={(event) =>
                      navigate({
                        search: {
                          moduleId: search.moduleId,
                          endpointId: undefined,
                          query: safeQuery,
                          page: 1,
                          pageSize: Number(event.target.value),
                        },
                      })
                    }
                    className="rounded-md border border-slate-700 bg-[#1c1f2b] px-2 py-1 text-[13px] text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    {pageSizeOptions.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      navigate({
                        search: {
                          moduleId: search.moduleId,
                          endpointId: undefined,
                          query: safeQuery,
                          page: Math.max(1, currentPage - 1),
                          pageSize: search.pageSize,
                        },
                      })
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  {pageItems.map((item, index) => {
                    if (item === "ellipsis") {
                      return (
                        <span key={`ellipsis-${index}`} className="px-1 text-[13px] text-slate-500">
                          ...
                        </span>
                      )
                    }
                    const isActive = item === currentPage
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          navigate({
                            search: {
                              moduleId: search.moduleId,
                              endpointId: undefined,
                              query: safeQuery,
                              page: item,
                              pageSize: search.pageSize,
                            },
                          })
                        }
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md text-[13px]",
                          isActive
                            ? "bg-blue-600/20 font-medium text-blue-500"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                        )}
                      >
                        {item}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      navigate({
                        search: {
                          moduleId: search.moduleId,
                          endpointId: undefined,
                          query: safeQuery,
                          page: Math.min(totalPages, currentPage + 1),
                          pageSize: search.pageSize,
                        },
                      })
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-[#0f111a] text-slate-200">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-800/60 bg-[#151822] px-6">
        <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
          接口中心
        </h2>
        <div className="flex items-center space-x-4 text-slate-400">
          <button type="button" className="hover:text-slate-200"><Bell className="size-5" /></button>
          <button type="button" className="hover:text-slate-200"><HelpCircle className="size-5" /></button>
        </div>
      </header>
      
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const progress = module.interfaces > 0 ? (module.documented / module.interfaces) * 100 : 0
            return (
              <article
                key={module.id}
                className="group flex flex-col rounded-md border border-slate-800/60 bg-[#151822] p-5 transition-all hover:border-slate-700/80 hover:bg-[#1a1d27]"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">{module.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">最后扫描: {formatRelativeTime(module.last_scanned_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-200">{module.interfaces}</p>
                    <p className="text-[10px] text-slate-500">TOTAL</p>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>已归档 / 发现</span>
                    <span className="font-mono text-slate-400">
                      {module.documented} / {module.interfaces}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <button
                    type="button"
                    className="mt-5 w-full rounded-md border border-slate-700 bg-[#1c1f2b] py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                    onClick={() => goModule(module.id)}
                  >
                    查看接口列表
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default ApiCenterPage

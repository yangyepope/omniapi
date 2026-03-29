import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Bell, ChevronLeft, ChevronRight, Download, Eye, HelpCircle, Plus, Search, X } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"

import { SystemModulesService } from "@/client"
import { cn } from "@/lib/utils"
import { MethodBadge } from "@/components/api-center/MethodBadge"
import { LevelStars } from "@/components/api-center/LevelStars"
import { SourceBadge } from "@/components/api-center/SourceBadge"

const searchSchema = z.object({
  query: z.string().optional().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(20),
})

const pageSizeOptions = [10, 20, 50] as const

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

export const Route = createFileRoute("/_layout/api-center/$moduleId/")({
  component: EndpointListPage,
  validateSearch: searchSchema,
})

function EndpointListPage() {
  const { moduleId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const rawQuery = search.query ?? ""
  const keyword = rawQuery.trim()

  const statsQuery = useQuery({
    queryKey: ["system-modules", "stats"],
    queryFn: () => SystemModulesService.getSystemModulesStats(),
  })

  const modules = statsQuery.data?.data ?? []
  const currentModule = useMemo(() => modules.find((item) => item.id === moduleId), [modules, moduleId])

  const endpointsQuery = useQuery({
    queryKey: [
      "system-modules",
      "endpoints",
      moduleId,
      search.page,
      search.pageSize,
      keyword,
    ],
    queryFn: () =>
      SystemModulesService.getModuleEndpoints({
        moduleId,
        skip: (search.page - 1) * search.pageSize,
        limit: search.pageSize,
        keyword: keyword || undefined,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: keyword ? false : 5000,
  })

  const isLoadingInitial = statsQuery.isLoading || (endpointsQuery.isLoading && !endpointsQuery.isPlaceholderData)

  if (!isLoadingInitial && !currentModule) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-[#0f111a] text-slate-400">
        未找到指定的模块
      </div>
    )
  }

  const totalCount = endpointsQuery.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / search.pageSize))
  const currentPage = Math.min(search.page, totalPages)
  const endpoints = endpointsQuery.data?.data ?? []
  const pageItems = buildPageItems(currentPage, totalPages)

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/5 bg-[#0a0e14]/80 px-8 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link
            to="/api-center"
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
            <span className="text-[#00f1fe]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>接口列表</span>
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

      <div className="mx-auto flex w-full max-w-[1600px] flex-col px-8 pt-12">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h2
              className="text-3xl font-black tracking-tight text-[#f1f3fc]"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              服务接口列表
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-[#a8abb3]/60 font-medium">管理并监控当前系统的所有 API 终结点及权限分级</p>
              {endpointsQuery.isFetching && !isLoadingInitial && (
                <div className="flex items-center gap-1.5 rounded-full bg-[#00f1fe]/10 px-2 py-0.5">
                   <div className="size-1.5 animate-pulse rounded-full bg-[#00f1fe]" />
                   <span className="text-[10px] font-bold uppercase tracking-tight text-[#00f1fe]">同步中...</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="group relative w-64">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a8abb3]/40" />
              <input
                className="w-full rounded-xl border border-white/5 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-[#f1f3fc] outline-none transition-all placeholder:text-[#a8abb3]/30 focus:border-[#00f1fe]/30"
                type="text"
                value={rawQuery}
                onChange={(event) =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      query: event.target.value,
                      page: 1,
                    }),
                  })
                }
                placeholder="搜索接口..."
              />
              {rawQuery && (
                <Link
                  to="."
                  search={(prev: any) => ({ ...prev, query: "", page: 1 })}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a8abb3]/40 hover:text-[#00f1fe]"
                >
                  <X className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl bg-white/5 px-5 py-2.5 text-xs font-bold text-[#f1f3fc] transition-all hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              <span>导出数据</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl bg-[#00f1fe] px-5 py-2.5 text-xs font-black text-[#005f64] shadow-[0_0_20px_rgba(0,241,254,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>新建接口</span>
            </button>
          </div>
        </div>


        <div className="mx-auto w-full max-w-[1600px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-2xl">
          <table className={cn("w-full border-collapse text-left table-auto transition-opacity duration-200", endpointsQuery.isFetching && "opacity-50")}>
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="w-[12%] px-6 py-5 text-[11px] font-bold text-[#a8abb3]/40">方法</th>
                <th className="w-[20%] px-6 py-5 text-[11px] font-bold text-[#a8abb3]/40">接口路径</th>
                <th className="w-[28%] px-6 py-5 text-[11px] font-bold text-[#a8abb3]/40">接口描述</th>
                <th className="w-[18%] px-6 py-5 text-[11px] font-bold text-[#a8abb3]/40">导入方式</th>
                <th className="w-[15%] px-6 py-5 text-[11px] font-bold text-[#a8abb3]/40">接口等级</th>
                <th className="w-[7%] px-6 py-5 text-right text-[11px] font-bold text-[#a8abb3]/40">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoadingInitial ? (
                 <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="size-8 animate-spin rounded-full border-2 border-[#00f1fe]/20 border-t-[#00f1fe]" />
                        <p className="text-sm text-[#a8abb3]/60 animate-pulse">正在同步接口数据...</p>
                      </div>
                    </td>
                 </tr>
              ) : endpoints.map((endpoint: any) => {
                return (
                  <tr key={endpoint.id} className="group transition-all hover:bg-white/[0.03]">
                    <td className="px-6 py-5">
                      <MethodBadge method={endpoint.method} />
                    </td>
                    <td className="px-6 py-5 font-mono text-xs text-[#00f1fe] drop-shadow-[0_0_4px_rgba(0,241,254,0.2)]">
                      <div className="truncate" title={endpoint.path}>
                        {endpoint.path}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-[#a8abb3]/80">
                      <div className="line-clamp-1">
                        {endpoint.description || "暂无引擎描述"}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <SourceBadge source={endpoint.source_type} />
                    </td>
                    <td className="px-6 py-5">
                      <LevelStars level={(endpoint as { level?: string | null }).level} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end">
                        <Link
                          to="/api-center/$moduleId/$endpointId"
                          params={{ moduleId, endpointId: endpoint.id }}
                          search={(prev: any) => ({ ...prev })}
                          preload="intent"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#a8abb3] transition-all hover:bg-white/5 hover:text-[#00f1fe]"
                          title="查看详情"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!isLoadingInitial && endpoints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#a8abb3]">
                    暂无数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-8 py-6">
            <div className="flex items-center gap-8">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#a8abb3]/60">共 {totalCount} 个接口单元</div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#a8abb3]/40">每一页:</span>
                <select
                  value={search.pageSize}
                  onChange={(event) =>
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        pageSize: Number(event.target.value),
                        page: 1,
                      }),
                    })
                  }
                  className="cursor-pointer border-none bg-transparent text-xs font-black text-[#00f1fe] outline-none focus:ring-0 tabular-nums"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size} className="bg-[#0a0e14]">
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4">
                <Link
                  to="."
                  search={(prev: any) => ({
                    ...prev,
                    page: Math.max(1, currentPage - 1),
                  })}
                  disabled={currentPage <= 1}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-[#a8abb3] transition-all hover:text-[#00f1fe] disabled:opacity-20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
                <div className="flex items-center gap-2">
                  {pageItems.map((item, index) => {
                    if (item === "ellipsis") {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 text-[#a8abb3]/20">
                          ...
                        </span>
                      )
                    }
                    const isActive = item === currentPage
                    return (
                      <Link
                        key={item}
                        to="."
                        search={(prev: any) => ({
                          ...prev,
                          page: item,
                        })}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all tabular-nums",
                          isActive
                            ? "bg-[#00f1fe] text-[#005f64] shadow-[0_0_15px_rgba(0,241,254,0.4)]"
                            : "text-[#a8abb3] hover:text-[#f1f3fc]",
                        )}
                      >
                        {item}
                      </Link>
                    )
                  })}
                </div>
                <Link
                   to="."
                   search={(prev: any) => ({
                     ...prev,
                     page: Math.min(totalPages, currentPage + 1),
                   })}
                  disabled={currentPage >= totalPages}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-[#a8abb3] transition-all hover:text-[#00f1fe] disabled:opacity-20"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { ArrowRight, Bell, Box, HelpCircle } from "lucide-react"
import { z } from "zod"

import { SystemModulesService } from "@/client"
import { cn } from "@/lib/utils"

const searchSchema = z.object({
  query: z.string().optional().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(20),
  // Legacy search params for redirect
  endpointId: z.string().optional(),
  moduleId: z.string().optional(),
})

export const Route = createFileRoute("/_layout/api-center/")({
  component: ModuleListPage,
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    // Redirect legacy query-param links to the new path-based routes
    if (search.endpointId && search.moduleId) {
      throw redirect({
        to: "/api-center/$moduleId/$endpointId",
        params: { moduleId: search.moduleId, endpointId: search.endpointId },
        search: (prev: any) => prev,
      })
    }
    if (search.moduleId) {
      throw redirect({
        to: "/api-center/$moduleId",
        params: { moduleId: search.moduleId },
        search: (prev: any) => prev,
      })
    }
  },
  head: () => ({
    meta: [{ title: "接口中心 - OmniAPI" }],
  }),
})

function ModuleListPage() {
  const { pageSize } = Route.useSearch()
  const navigate = Route.useNavigate()

  const statsQuery = useQuery({
    queryKey: ["system-modules", "stats"],
    queryFn: () => SystemModulesService.getSystemModulesStats(),
  })

  const modules = statsQuery.data?.data ?? []

  const goModule = (moduleId: string) => {
    navigate({
      to: "/api-center/$moduleId",
      params: { moduleId },
      search: {
        page: 1,
        pageSize: pageSize,
        query: "",
      },
    })
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

  return (
    <div className="relative flex flex-1 flex-col">
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-[#0a0e14]/80 px-8 backdrop-blur-xl">
        <h2 className="text-xl font-black text-[#00f1fe] tracking-tighter uppercase drop-shadow-[0_0_8px_rgba(0,241,254,0.5)]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
          接口中心
        </h2>
        <div className="flex items-center gap-4">
          <button type="button" className="text-slate-400 transition-all hover:text-[#00f1fe]"><Bell className="h-5 w-5" /></button>
          <button type="button" className="text-slate-400 transition-all hover:text-[#00f1fe]"><HelpCircle className="h-5 w-5" /></button>
        </div>
      </header>
      
      <main className="relative z-10 mx-auto w-full max-w-[1600px] flex-1 p-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((module) => {
            const progress = module.interfaces > 0 ? (module.documented / module.interfaces) * 100 : 0
            const statusColor = progress > 80 ? "bg-[#00f1fe]" : progress > 50 ? "bg-[#f59e0b]" : "bg-[#ef4444]"
            
            return (
              <article
                key={module.id}
                className="group relative flex cursor-pointer flex-col rounded-3xl border border-white/5 bg-[#151a22] p-5 transition-all hover:border-[#00f1fe]/20 hover:bg-[#1a212b] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                onClick={() => goModule(module.id)}
              >
                {/* 状态小圆点 */}
                <div className={cn("absolute right-6 top-6 h-2 w-2 rounded-full shadow-[0_0_12px_rgba(0,241,254,0.3)]", statusColor)} />
                
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#a8abb3] transition-colors group-hover:bg-[#00f1fe]/10 group-hover:text-[#00f1fe]">
                    <Box className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black text-[#f1f3fc] tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                      {module.name}
                    </h3>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-[#a8abb3]/40">智能网关服务核心</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 覆盖率进度条 */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-[#a8abb3]/60">接口覆盖率 (Docs)</span>
                      <span className="text-[#00f1fe] tabular-nums font-black">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/5">
                      <div 
                        className={cn("h-full transition-all duration-1000 ease-out", statusColor)} 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>

                  {/* 状态指标 */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase tracking-widest text-[#a8abb3]/40">在线时长 (Uptime)</span>
                    <span className="font-black text-[#f1f3fc]/80 tabular-nums">342d 12h 04s</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.03] py-2.5 text-xs font-black text-[#f1f3fc] transition-all hover:bg-[#00f1fe] hover:text-[#005f64] hover:shadow-[0_0_30px_rgba(0,241,254,0.3)]"
                  onClick={() => goModule(module.id)}
                  style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                >
                  <span>查看接口列表</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}

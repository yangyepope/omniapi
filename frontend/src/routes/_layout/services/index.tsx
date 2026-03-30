import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { ArrowRight, Search, Server, ChevronRight, Plus, ChevronLeft } from "lucide-react"
import { z } from "zod"
import { motion } from "motion/react"

import { SystemModulesService } from "@/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const searchSchema = z.object({
  query: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  serviceId: z.string().optional(),
})

export const Route = createFileRoute("/_layout/services/")({
  component: ServiceListPage,
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (search.serviceId) {
      throw redirect({
        to: "/services/$serviceId",
        params: { serviceId: search.serviceId },
        search: (prev: any) => prev,
      })
    }
  },
  head: () => ({
    meta: [{ title: "服务管理 - OmniAPI" }],
  }),
})

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
}

function ServiceListPage() {
  const { pageSize } = Route.useSearch()
  const navigate = Route.useNavigate()

  const statsQuery = useQuery({
    queryKey: ["system-modules", "stats"],
    queryFn: () => SystemModulesService.getSystemModulesStats(),
  })

  const modules = statsQuery.data?.data ?? []

  const goService = (serviceId: string) => {
    navigate({
      to: "/services/$serviceId",
      params: { serviceId },
      search: {
        page: 1,
        pageSize: pageSize,
        query: "",
      },
    })
  }

  if (statsQuery.isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center text-on-surface-variant font-bold text-sm tracking-widest animate-pulse">
        正在初始化安全扫描矩阵...
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-end mb-10">
        <div>

          <h2 className="text-3xl font-black text-on-surface tracking-tight">服务列表</h2>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">监控并探索所有已注册的微服务接口资产</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary-fixed/20">
          <Plus className="w-4 h-4" />
          <span>探测新服务</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-12 gap-4 mb-8 bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 shadow-sm">
        <div className="col-span-12 lg:col-span-5 relative group">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1.5 ml-1">服务名搜索</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary-fixed transition-colors" />
            <input 
              type="text" 
              placeholder="输入服务名称关键字..." 
              className="w-full bg-surface-container-lowest border-none rounded-md pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-fixed/20 transition-all outline-none shadow-sm text-on-surface placeholder:text-on-surface-variant/40 font-medium"
            />
          </div>
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-3">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1.5 ml-1">健康状态</label>
          <select className="w-full bg-surface-container-lowest border-none rounded-md py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary-fixed/20 transition-all outline-none shadow-sm text-on-surface font-medium cursor-pointer">
            <option>所有状态</option>
            <option>运行中 (Healthy)</option>
            <option>告警中 (Risk)</option>
            <option>已离线 (Down)</option>
          </select>
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex items-end gap-3">
          <Button variant="secondary" className="flex-1">重置</Button>
          <Button className="flex-1 bg-primary-fixed/10 text-primary-fixed hover:bg-primary-fixed/20 shadow-none">执行探测</Button>
        </div>
      </div>

      {/* Service Cards Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10"
      >
        {modules.map((module) => {
          const progress = module.interfaces > 0 ? (module.documented / module.interfaces) * 100 : 0
          const isHealthy = progress > 80;
          
          return (
            <motion.div 
              key={module.id} 
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => goService(module.id)}
              className="group bg-surface-container-low hover:bg-surface-container-lowest transition-all duration-300 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary-fixed/5 flex flex-col border border-transparent hover:border-outline-variant/15 cursor-pointer"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 rounded-lg bg-primary-fixed/5 text-primary-fixed group-hover:bg-primary-fixed/10 transition-colors">
                    <Server className="w-7 h-7" />
                  </div>
                  <Badge variant={isHealthy ? 'success' : 'warning'}>
                    {isHealthy ? '运行良好' : '风险预警'}
                  </Badge>
                </div>
                
                <h3 className="text-xl font-bold text-on-surface mb-1 truncate tracking-tight">{module.name}</h3>
                <p className="text-[10px] text-on-surface-variant/60 font-black uppercase tracking-widest mb-6">
                   API 哨兵节点 #{(module.id.slice(0, 4))}
                </p>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-1.5">
                      <span>覆盖率 (Coverage)</span>
                      <span className="text-primary-fixed">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-1000", isHealthy ? "bg-primary-fixed" : "bg-tertiary")} 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/10 text-center">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase mb-0.5">接口数</p>
                      <p className="text-lg font-black text-on-surface">{module.interfaces}</p>
                   </div>
                   <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/10 text-center">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase mb-0.5">已记录</p>
                      <p className="text-lg font-black text-on-surface">{module.documented}</p>
                   </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-outline-variant/10 group-hover:bg-primary-fixed group-hover:text-on-primary transition-colors block">
                <div className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest">
                  <span>查看接口矩阵</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Pagination Placeholder */}
      <div className="flex items-center justify-between border-t border-outline-variant/10 pt-8 pb-4">
        <p className="text-sm text-on-surface-variant font-medium">显示 1 到 {modules.length} 条记录</p>
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 flex items-center justify-center rounded-md border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-30" disabled>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-md bg-primary-fixed text-on-primary font-bold shadow-md shadow-primary-fixed/20 text-xs">1</button>
          <button className="w-9 h-9 flex items-center justify-center rounded-md border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

import * as React from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  FileUp, 
  ListChecks, 
  Search, 
  User, 
  ArrowLeft,
  Activity,
  Layers,
  Shield
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMemo } from "react"
import { z } from "zod"
import { motion, AnimatePresence } from "motion/react"

import { SystemModulesService } from "@/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const searchSchema = z.object({
  query: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
})

export const Route = createFileRoute("/_layout/services/$serviceId/")({
  component: EndpointListPage,
  validateSearch: searchSchema,
})

function EndpointListPage() {
  const { serviceId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const rawQuery = search.query ?? ""
  const keyword = rawQuery.trim()

  const statsQuery = useQuery({
    queryKey: ["system-modules", "stats"],
    queryFn: () => SystemModulesService.getSystemModulesStats(),
  })

  const modules = statsQuery.data?.data ?? []
  const currentModule = useMemo(() => modules.find((item) => item.id === serviceId), [modules, serviceId])

  const endpointsQuery = useQuery({
    queryKey: [
      "system-modules",
      "endpoints",
      serviceId,
      search.page,
      search.pageSize,
      keyword,
    ],
    queryFn: () =>
      SystemModulesService.getModuleEndpoints({
        moduleId: serviceId,
        skip: (search.page - 1) * search.pageSize,
        limit: search.pageSize,
        keyword: keyword || undefined,
      }),
    placeholderData: keepPreviousData,
  })

  const endpoints = endpointsQuery.data?.data ?? []
  const totalCount = endpointsQuery.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / search.pageSize))
  const serviceName = currentModule?.name || "Loading..."

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
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
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
              to="/services"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-primary-fixed transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-on-surface">接口管理</h2>
              <p className="text-sm text-on-surface-variant mt-1 font-medium">管理并监控 {serviceName} 的所有 API 资产</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="gap-2">
              <ListChecks className="w-4 h-4" />
              <span>批量操作</span>
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary-fixed/20">
              <FileUp className="w-4 h-4" />
              <span>导入接口</span>
            </Button>
          </div>
        </div>
      </div>
      {/* 📊 Bento Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-10"
      >
        {/* Service Name & Principal */}
        <motion.div 
          variants={itemVariants} 
          className="col-span-1 md:col-span-1 bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 flex flex-col justify-between shadow-sm"
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Service Name</span>
            <h3 className="text-3xl font-black text-primary-fixed mt-2 letter-tight">{serviceName}</h3>
          </div>
          <div className="flex items-center gap-3 mt-6">
            <div className="h-8 w-8 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/10">
              <User className="w-4 h-4 text-on-surface-variant" />
            </div>
            <span className="text-xs font-bold text-on-surface-variant">责任人: 张小明 (Architecture Team)</span>
          </div>
        </motion.div>
        
        {/* Total Traffic */}
        <motion.div 
          variants={itemVariants} 
          className="bg-surface-container-low/40 p-8 rounded-[2rem] border border-outline-variant/5 flex flex-col justify-between group hover:bg-surface-container-lowest transition-all duration-500"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">总流量 (Total)</span>
          <div className="mt-4 flex items-end justify-between">
            <div className="text-4xl font-black text-on-surface tracking-tighter">
              1.2M
            </div>
            <div className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
              +12%
            </div>
          </div>
          <div className="mt-4 h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
             <div className="h-full bg-primary-fixed/30 w-2/3 rounded-full" />
          </div>
        </motion.div>
        
        {/* Unique Flows */}
        <motion.div 
          variants={itemVariants} 
          className="bg-surface-container-low/40 p-8 rounded-[2rem] border border-outline-variant/5 flex flex-col justify-between group hover:bg-surface-container-lowest transition-all duration-500"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">唯一流量 (Unique)</span>
          <div className="mt-4 flex items-end justify-between">
            <div className="text-4xl font-black text-on-surface tracking-tighter">
              842K
            </div>
            <Activity className="w-5 h-5 text-on-surface-variant/20 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="mt-4 h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
             <div className="h-full bg-amber-500/30 w-1/2 rounded-full" />
          </div>
        </motion.div>
        
        {/* Total Endpoints */}
        <motion.div 
          variants={itemVariants} 
          className="bg-surface-container-low/40 p-8 rounded-[2rem] border border-outline-variant/5 flex flex-col justify-between group hover:bg-surface-container-lowest transition-all duration-500"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">接口总数 (Endpoints)</span>
          <div className="mt-4 flex items-end justify-between">
            <div className="text-4xl font-black text-on-surface tracking-tighter">
              {currentModule?.interfaces || 0}
            </div>
            <Layers className="w-5 h-5 text-on-surface-variant/20 group-hover:text-primary-fixed transition-colors" />
          </div>
          <div className="mt-4 h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
             <div className="h-full bg-primary-fixed w-3/4 rounded-full" />
          </div>
        </motion.div>
      </motion.div>
      {/* 🔍 Smart Control Center */}
      <div className="bg-surface-container-low/30 border border-outline-variant/10 p-5 rounded-[2rem] flex flex-wrap items-center gap-5 mb-10">
        <div className="flex-1 min-w-[300px] relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary-fixed transition-colors" />
          <input 
            type="text" 
            placeholder="输入路径搜索 (支持通配符)" 
            value={rawQuery}
            onChange={(e) => navigate({ search: (prev) => ({ ...prev, query: e.target.value, page: 1 }) })}
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-4 focus:ring-primary-fixed/10 focus:border-primary-fixed/30 transition-all outline-none shadow-sm text-on-surface placeholder:text-on-surface-variant/40 font-bold"
          />
        </div>
        
        <div className="flex items-center gap-3">
             <Select defaultValue="all">
                <SelectTrigger size="sm" className="min-w-[160px] bg-surface-container-lowest border border-outline-variant/20 font-black text-on-surface shadow-sm outline-none ring-0">
                  <Shield className="w-3.5 h-3.5 opacity-40 mr-1" />
                  <SelectValue placeholder="所有方法" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有方法</SelectItem>
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            <Select defaultValue="all">
             <SelectTrigger size="sm" className="min-w-[160px] bg-surface-container-lowest border border-outline-variant/20 font-black text-on-surface shadow-sm outline-none ring-0">
               <SelectValue placeholder="所有状态" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">所有状态</SelectItem>
               <SelectItem value="auto">Auto-Complete</SelectItem>
               <SelectItem value="doc">Documented</SelectItem>
               <SelectItem value="null">Undefined</SelectItem>
             </SelectContent>
            </Select>

          <div className="h-10 w-px bg-outline-variant/20 mx-2" />

           <div className="flex items-center bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-4 py-3 text-sm text-on-surface shadow-sm font-black cursor-pointer hover:bg-surface-container-high transition-all group whitespace-nowrap flex-shrink-0">
            <Calendar className="w-4 h-4 mr-2.5 text-primary-fixed/60 group-hover:scale-110 transition-transform" />
            <span>最后 7 天</span>
          </div>

          <Button 
            variant="ghost"
            onClick={() => navigate({ search: (prev) => ({ ...prev, query: "", page: 1 }) })}
            className="text-on-surface-variant hover:text-primary-fixed font-black rounded-xl px-4"
          >
            重置
          </Button>
        </div>
      </div>
      {/* 🗃️ Asset Data Table */}
      <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-xl shadow-surface-container-low/5 overflow-hidden border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/10 border-b border-outline-variant/5">
                <th className="px-8 py-6 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">归一化路径</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">方法</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">状态</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">流量统计</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">变体数</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">最后活跃</th>
                <th className="px-8 py-6 text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] text-right">操作</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y divide-outline-variant/5", endpointsQuery.isFetching && "opacity-60 transition-opacity")}>
              <AnimatePresence>
                {endpoints.map((api: any) => (
                  <motion.tr 
                    key={api.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    whileHover={{ backgroundColor: 'rgba(var(--primary-fixed), 0.02)' }}
                    className="group transition-colors cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <div className="flex flex-col max-w-[400px]">
                        <span className="text-sm font-black text-on-surface tracking-tight truncate font-mono">
                          {(api.path || "").split(/({.*?})/).map((part: string, i: number) => (
                            part.startsWith('{') ? <span key={i} className="text-primary-fixed bg-primary-fixed/5 px-1.5 py-0.5 rounded-md mx-0.5 border border-primary-fixed/10">{part}</span> : part
                          ))}
                        </span>
                        <span className="text-[10px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-wider">
                          Base Asset
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-6 font-mono">
                       <div className={cn(
                        "inline-flex px-3 py-1 rounded-lg text-[10px] font-black border uppercase shadow-sm",
                        api.method === 'GET' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" : 
                        api.method === 'POST' ? "bg-primary-fixed/5 border-primary-fixed/20 text-primary-fixed" :
                        "bg-surface-container-high border-outline-variant/30 text-on-surface-variant"
                      )}>
                        {api.method || 'UNKNOWN'}
                      </div>
                    </td>

                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          api.source_type === 'auto_discovered' ? "bg-emerald-500 animate-pulse" : 
                          api.source_type === 'documented' ? "bg-on-surface-variant/30" : "bg-rose-500"
                        )} />
                        <span className="text-xs font-bold text-on-surface-variant">
                          {api.source_type === 'auto_discovered' ? 'Auto-Complete' : 
                           api.source_type === 'documented' ? 'Documented' : 'Undefined'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-6">
                      <span className="text-sm font-black text-on-surface tabular-nums">
                        {Math.floor(Math.random() * 500000).toLocaleString()}
                      </span>
                    </td>

                    <td className="px-6 py-6">
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container-high border border-outline-variant/10 text-[10px] font-black text-on-surface-variant">
                        {Math.floor(Math.random() * 12) + 1}
                      </div>
                    </td>

                    <td className="px-6 py-6">
                      <div className="flex flex-col text-[10px] tabular-nums font-bold text-on-surface-variant/70">
                        <span>2023-11-24</span>
                        <span className="text-[9px] opacity-40">14:20:01</span>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-5">
                        <Link 
                           to="/services/$serviceId/$endpointId"
                           params={{ serviceId, endpointId: api?.id || "unknown" }}
                           search={(prev) => ({ ...prev })}
                           className="text-xs font-black text-primary-fixed hover:underline underline-offset-4 transition-all"
                        >
                          详情
                        </Link>
                        <button className="text-xs font-black text-on-surface-variant hover:text-on-surface transition-colors">
                          流量列表
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {endpoints.length === 0 && !endpointsQuery.isLoading && (
                <tr>
                  <td colSpan={7} className="px-8 py-32">
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-30">
                      <Search className="w-12 h-12" />
                      <p className="text-sm font-black">未匹配到任何资产内容</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* 📑 Global Standard Pagination Component */}
        <div className="px-8 py-10 bg-transparent flex items-center justify-between border-t border-gray-100">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            显示第 1 到 {Math.min(search.pageSize, totalCount)} 条结果
          </span>
          <div className="flex items-center gap-2">
            <button 
              disabled={search.page <= 1}
              onClick={() => navigate({ search: (prev) => ({ ...prev, page: search.page - 1 }) })}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
               {Array.from({ length: totalPages }, (_, i) => i + 1)
               .filter(p => p === 1 || p === totalPages || Math.abs(p - search.page) <= 1)
               .map((p, i, arr) => (
                 <React.Fragment key={p}>
                   {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-gray-400/30 text-xs text-center">...</span>}
                   <button 
                    onClick={() => navigate({ search: (prev) => ({ ...prev, page: p }) })}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black transition-all",
                      p === search.page 
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
              disabled={search.page >= totalPages}
              onClick={() => navigate({ search: (prev) => ({ ...prev, page: search.page + 1 }) })}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

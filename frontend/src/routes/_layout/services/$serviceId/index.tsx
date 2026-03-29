import * as React from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Calendar, ChevronLeft, ChevronRight, Copy, FileUp, ListChecks, Search, User, ArrowLeft } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"
import { motion } from "motion/react"

import { SystemModulesService } from "@/client"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
          <Link to="/" search={{}} className="hover:text-primary-fixed transition-colors">首页</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/services" className="hover:text-primary-fixed transition-colors">服务列表</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-on-surface">{serviceName}</span>
        </nav>
        
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

      {/* Service Info Bento Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8"
      >
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Service Name</span>
            <h3 className="text-2xl font-black text-primary-fixed mt-1">{serviceName}</h3>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm text-on-surface-variant font-medium">
            <User className="w-4 h-4" />
            <span>责任人: 系统管理员 (Architecture Team)</span>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-center border border-outline-variant/5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">总接口数</span>
          <div className="text-3xl font-black text-on-surface mt-1 tracking-tighter">
            {currentModule?.interfaces || 0}
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-center border border-outline-variant/5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">已建档接口</span>
          <div className="text-3xl font-black text-on-surface mt-1 tracking-tighter">
            {currentModule?.documented || 0}
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-center border border-outline-variant/5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">覆盖率</span>
          <div className="text-3xl font-black text-primary-fixed mt-1 tracking-tighter">
            {currentModule?.interfaces ? Math.round((currentModule.documented / currentModule.interfaces) * 100) : 0}%
          </div>
        </motion.div>
      </motion.div>

      {/* Filter Bar */}
      <div className="bg-surface-container-low/50 border border-outline-variant/10 p-4 rounded-xl mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px] relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary-fixed transition-colors" />
          <input 
            type="text" 
            placeholder="输入路径搜索 (支持关键字)" 
            value={rawQuery}
            onChange={(e) => navigate({ search: (prev) => ({ ...prev, query: e.target.value, page: 1 }) })}
            className="w-full bg-surface-container-lowest border-none rounded-md pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-fixed/20 transition-all outline-none shadow-sm text-on-surface placeholder:text-on-surface-variant/40 font-medium"
          />
        </div>
        <select className="bg-surface-container-lowest border-none rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-fixed/20 transition-all min-w-[120px] outline-none shadow-sm font-bold text-on-surface cursor-pointer">
          <option value="">所有方法</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
        <div className="flex items-center bg-surface-container-lowest rounded-md px-4 py-2.5 text-xs text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-colors shadow-sm font-bold border border-transparent hover:border-outline-variant/20">
          <Calendar className="w-4 h-4 mr-2" />
          <span>最后同步: 刚刚</span>
        </div>
        <button 
          onClick={() => navigate({ search: (prev) => ({ ...prev, query: "", page: 1 }) })}
          className="text-primary-fixed text-sm font-bold px-4 hover:underline"
        >
          重置
        </button>
      </div>

      {/* Interface Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/30 border-b border-outline-variant/10">
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">方法</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">归一化路径</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">接口描述</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">等级</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-outline-variant/5", endpointsQuery.isFetching && "opacity-50 transition-opacity")}>
            {endpoints.map((api: any) => (
              <tr key={api.id} className="hover:bg-surface-container-low/40 transition-colors group">
                <td className="px-6 py-5">
                  <Badge variant={api.method === 'GET' ? 'success' : 'default'} className="font-mono uppercase">
                    {api.method}
                  </Badge>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-primary-fixed tracking-tight">
                      {api.path}
                    </span>
                    <Copy className="w-3.5 h-3.5 text-on-surface-variant opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity hover:text-primary-fixed" />
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-on-surface-variant font-medium">
                  {api.description || "暂无描述"}
                </td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-on-surface">{(api as any).level || "N/A"}</span>
                   </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link 
                      to="/services/$serviceId/$endpointId"
                      params={{ serviceId, endpointId: api.id }}
                      search={(prev: any) => ({ ...prev })}
                      className="text-primary-fixed text-xs font-bold hover:bg-primary-fixed/10 px-3 py-1.5 rounded-md transition-all uppercase tracking-wider"
                    >
                      详情
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {endpoints.length === 0 && !endpointsQuery.isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-on-surface-variant font-medium opacity-50">
                   未匹配到任何安全哨兵接口数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div className="px-6 py-4 bg-surface-container-low/20 flex items-center justify-between border-t border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            显示 {(search.page - 1) * search.pageSize + 1} 到 {Math.min(search.page * search.pageSize, totalCount)}，共 {totalCount} 条安全资产
          </span>
          <div className="flex items-center gap-1">
            <button 
              disabled={search.page <= 1}
              onClick={() => navigate({ search: (prev) => ({ ...prev, page: search.page - 1 }) })}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
               {Array.from({ length: totalPages }, (_, i) => i + 1)
               .filter(p => p === 1 || p === totalPages || Math.abs(p - search.page) <= 1)
               .map((p, i, arr) => (
                 <React.Fragment key={p}>
                   {i > 0 && arr[i-1] !== p - 1 && <span className="px-1 text-on-surface-variant/30 text-xs">...</span>}
                   <button 
                    onClick={() => navigate({ search: (prev) => ({ ...prev, page: p }) })}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md text-[10px] font-black transition-all",
                      p === search.page 
                        ? "bg-primary-fixed text-on-primary shadow-md shadow-primary-fixed/20" 
                        : "hover:bg-surface-container-high text-on-surface"
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
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

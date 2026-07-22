import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react"
import { motion } from "motion/react"
import { z } from "zod"

import { SystemModulesService } from "@/client"
import { ServiceCard } from "@/components/services/ServiceCard"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
    meta: [{ title: "服务管理 - Security Platform" }],
  }),
})

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

function ServiceListPage() {
  // 获取路由中的 pageSize 参数并初始化导航钩子
  const { pageSize } = Route.useSearch()
  const navigate = Route.useNavigate()

  // 使用 React Query 加载所有模块的统计数据
  const statsQuery = useQuery({
    queryKey: ["system-modules", "stats"],
    queryFn: () => SystemModulesService.getSystemModulesStats(),
  })

  // 提取模块列表数据，默认为空数组
  const modules = statsQuery.data?.data ?? []

  // 导航至具体的服务详情页并携带默认的分页参数
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

  // 加载状态下的 UI 反馈
  if (statsQuery.isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center text-gray-400 font-bold text-sm tracking-widest animate-pulse">
        正在初始化安全扫描矩阵...
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-10 pb-12"
    >
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="w-1.5 h-8 bg-blue-600 rounded-full shrink-0" />
            服务列表
          </h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            监控并探索所有已注册的微服务接口资产
          </p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-xl px-6 h-12">
          <Plus className="w-5 h-5" />
          <span className="font-bold uppercase tracking-wider text-xs">
            探测新服务
          </span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-12 gap-6 bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm">
        <div className="col-span-12 lg:col-span-5 relative group">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">
            服务名搜索
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="输入服务名称关键字..."
              className="w-full bg-gray-50 border border-transparent focus:border-blue-200 focus:bg-white rounded-2xl pl-12 pr-4 py-3.5 text-sm transition-all outline-none text-gray-900 placeholder:text-gray-400 font-medium"
            />
          </div>
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-3 flex flex-col">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">
            健康状态
          </label>
          <Select defaultValue="all">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="所有状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              <SelectItem value="healthy">健康</SelectItem>
              <SelectItem value="risk">风险</SelectItem>
              <SelectItem value="offline">离线</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex items-end gap-3">
          <Button
            variant="ghost"
            className="flex-1 h-12 rounded-2xl text-gray-500 font-bold hover:bg-gray-100"
          >
            重置
          </Button>
          <Button className="flex-1 h-12 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-2xl font-bold border border-blue-100/50 shadow-none">
            执行探测同步
          </Button>
        </div>
      </div>

      {/* Service Cards Grid - 这里的 grid 布局与 Stitch 的 4 列响应式逻辑保持一致 */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {modules.map((module) => (
          <ServiceCard
            key={module.id}
            module={module}
            onClick={() => goService(module.id)}
          />
        ))}
      </motion.div>

      {/* 分页控制器容器 - 保持项目一贯的大间距与精致边框 */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-10 px-2">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
          显示第 1 到 {modules.length} 条结果
        </p>
        <div className="flex items-center gap-2">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-30 self-center"
            disabled
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white font-black shadow-lg shadow-blue-600/20 text-xs">
            1
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

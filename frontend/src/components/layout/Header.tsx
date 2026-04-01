import { Bell, Search, ChevronRight, User, LogOut, Home } from "lucide-react"
import { motion } from "motion/react"
import useAuth from "@/hooks/useAuth"
import { useRouterState, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { SystemModulesService } from "@/client"

export function Header() {
  const { user: currentUser, logout } = useAuth()
  const router = useRouterState()
  const pathname = router.location.pathname

  // 获取服务数据用于面包屑名称映射 (利用 react-query 缓存)
  const statsQuery = useQuery({
    queryKey: ["system-modules", "stats"],
    queryFn: () => SystemModulesService.getSystemModulesStats(),
    staleTime: 1000 * 60 * 5, // 5分钟内使用缓存
  })

  // 综合路由的面包屑映射关系
  // Why: 动态解析路径参数并映射为可读名称，能够极大地提升用户在深层子页面中的导航体验。
  const getBreadcrumbs = () => {
    const parts = [{ label: "首页", to: "/" }]
    const segments = pathname.split("/").filter(Boolean)

    if (pathname === "/" || segments.length === 0) {
      parts.push({ label: "仪表面板", to: "/" })
      return parts
    }

    // 基础映射表
    const mapping: Record<string, string> = {
      services: "服务管理",
      settings: "用户设置",
      items: "项目管理",
      admin: "系统管理",
    }

    let currentPath = ""
    segments.forEach((seg, index) => {
      currentPath += `/${seg}`
      
      // 处理一级目录
      if (index === 0 && mapping[seg]) {
        parts.push({ label: mapping[seg], to: currentPath })
      } 
      // 处理二级目录 (服务 ID)
      else if (index === 1 && segments[0] === "services") {
        const service = statsQuery.data?.data?.find(s => s.id === seg)
        parts.push({ label: service ? service.name : (seg || "详情"), to: currentPath })
      }
      // 处理三级目录 (接口 ID)
      else if (index === 2 && segments[0] === "services") {
        parts.push({ label: "接口详情", to: currentPath })
      }
      // 兜底处理：防止未知路径导致面包屑缺失
      else if (index > 0 && !parts.find(p => p.to === currentPath)) {
        parts.push({ label: seg, to: currentPath })
      }
    })

    return parts
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-64 right-0 h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100"
    >
      {/* Left Side: Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={`${crumb.label}-${index}`} className="flex items-center gap-2">
            {index === breadcrumbs.length - 1 ? (
              <span className="text-blue-700 font-bold flex items-center">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="text-gray-400 font-medium transition-all hover:text-blue-600 hover:scale-105 flex items-center"
              >
                {index === 0 ? <Home className="w-4 h-4" /> : crumb.label}
              </Link>
            )}
            
            {index < breadcrumbs.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            )}
          </div>
        ))}
      </nav>
      
      {/* Right Side: Search & Actions */}
      <div className="flex items-center gap-6">
        {/* Rounded Search Bar */}
        <div className="relative w-64 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors" />
          <input 
            type="text" 
            placeholder="搜索资源或指标..." 
            className="w-full bg-gray-50 border-none rounded-full py-2 pl-10 pr-4 text-xs transition-all outline-none text-gray-900 placeholder:text-gray-400 focus:bg-gray-100/80 focus:ring-1 focus:ring-blue-100"
          />
        </div>

        <div className="flex items-center gap-4 h-8">
          {/* Notification with Red Dot */}
          <button className="relative p-1.5 rounded-full text-gray-500 hover:bg-gray-50 transition-all">
            <Bell className="w-5 h-5 fill-gray-500/10" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white" />
          </button>

          {/* Vertical Divider */}
          <div className="w-px h-6 bg-gray-100" />

          {/* User Profile Area */}
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
             </div>
             <div className="hidden lg:flex flex-col items-start leading-none">
                <span className="text-[11px] font-bold text-gray-900">
                  {currentUser?.full_name || currentUser?.email?.split('@')[0] || "管理员"}
                </span>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Administrator</span>
             </div>
             <button 
                onClick={logout}
                className="ml-2 p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors rounded-lg"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
          </div>
        </div>
      </div>
    </motion.header>
  )
}


import { Activity, BarChart2, Network, PlayCircle, Search, Settings } from "lucide-react"
import { Link, useRouterState } from "@tanstack/react-router"

export function Sidebar() {
  const router = useRouterState();
  const pathname = router.location.pathname;
  
  const isDashboardActive = pathname === "/";
  const isServicesActive = pathname.startsWith('/services');

  const navItems = [
    {
      to: "/",
      icon: Activity,
      label: "仪表面板",
      active: isDashboardActive
    },
    {
      to: "/services",
      icon: Network,
      label: "服务管理",
      active: isServicesActive
    },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 flex flex-col p-4 gap-2 border-r border-outline-variant/15 bg-surface-container-low z-40">
      <nav className="flex flex-col gap-1 mt-4">
        {navItems.map((item) => (
          <Link 
            key={item.to}
            to={item.to} 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
              item.active 
                ? "bg-primary-fixed/10 text-primary-fixed shadow-sm border border-primary-fixed/20" 
                : "text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface hover:translate-x-1"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className={`text-sm ${item.active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </Link>
        ))}
        
        <div className="mx-2 my-4 h-px bg-outline-variant/10" />
        
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface hover:translate-x-1 transition-all duration-200 rounded-md">
          <Search className="w-5 h-5" />
          <span className="text-sm font-medium">全局搜索</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface hover:translate-x-1 transition-all duration-200 rounded-md">
          <PlayCircle className="w-5 h-5" />
          <span className="text-sm font-medium">重放任务</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface hover:translate-x-1 transition-all duration-200 rounded-md">
          <BarChart2 className="w-5 h-5" />
          <span className="text-sm font-medium">统计分析</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface hover:translate-x-1 transition-all duration-200 rounded-md">
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">系统设置</span>
        </a>
      </nav>

      <div className="mt-auto p-4 bg-surface-container rounded-xl border border-outline-variant/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse" />
          <span className="text-xs text-on-surface-variant font-bold">系统状态：安全</span>
        </div>
        <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <div className="h-full bg-secondary-fixed w-full transition-all duration-500" />
        </div>
      </div>
    </aside>
  )
}

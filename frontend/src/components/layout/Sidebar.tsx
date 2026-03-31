import { Activity, BarChart2, LayoutGrid, Network, PlayCircle, Search, Settings, Shield } from "lucide-react"
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
    {
      to: "/business-config",
      icon: LayoutGrid,
      label: "业务配置",
      active: pathname.startsWith('/business-config')
    },
    {
      to: "/settings",
      icon: Settings,
      label: "系统设置",
      active: pathname === "/settings"
    },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 flex flex-col p-6 gap-2 border-r border-gray-100 bg-white z-40 transition-all">
      {/* Brand Logo Section */}
      <div className="flex items-center gap-3 mb-10 px-2 mt-2">
        <div className="relative">
          <Shield className="text-blue-600 w-8 h-8 fill-blue-500/10" />
          <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full -z-10" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-gray-900 leading-none">流量大师</span>
          <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase leading-none mt-1">Security Sentinel</span>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
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

import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { Sidebar } from "@/components/ui/sidebar"

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const mainItems: Item[] = [
    { icon: "dashboard", title: "仪表盘", path: "/" },
    { icon: "account_tree", title: "项目管理", path: "/projects" },
    { icon: "hub", title: "接口中心", path: "/api-center" },
  ]

  if (currentUser?.is_superuser) {
    mainItems.push(
      { icon: "admin_panel_settings", title: "后台管理", path: "/admin" }
    )
  }

  const bottomItems: Item[] = [
    { icon: "settings", title: "系统设置", path: "/settings" },
    { icon: "help_outline", title: "技术支持", path: "/support" }
  ]

  return (
    <Sidebar
      variant="sidebar"
      className="z-50 border-r border-[#a1faff]/15 shadow-[6px_0_30px_rgba(0,0,0,0.35)] !bg-[radial-gradient(120%_100%_at_0%_0%,rgba(161,250,255,0.08)_0%,rgba(8,14,27,0.96)_45%,rgba(5,10,20,0.98)_100%)] !text-on-surface-variant"
    >
      <div className="flex h-full flex-col py-5">
        <div className="mb-8 px-5">
          <div className="inline-flex items-center rounded-full border border-[#a1faff]/25 bg-[#a1faff]/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-[#a1faff] uppercase">
            控制台
          </div>
          <div className="mt-3 text-[22px] leading-none font-bold text-[#d5fbff] tracking-tight uppercase font-headline">AAM 微服务管理</div>
          <div className="mt-1.5 text-[#8e9ab7] text-[10px] tracking-[0.2em] uppercase">API 发现</div>
        </div>

        <div className="mx-5 mb-4 h-px bg-gradient-to-r from-transparent via-[#a1faff]/25 to-transparent" />

        <Main items={mainItems} />

        <div className="mt-5 px-5">
          <button className="w-full rounded-xl border border-[#7be8ff]/30 bg-gradient-to-br from-[#0f2336] to-[#102c44] px-4 py-2.5 text-sm font-semibold text-[#b9f5ff] shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-all hover:border-[#8bf0ff]/50 hover:text-white active:scale-[0.98]">
            发现模块
          </button>
        </div>

        <div className="mt-6 px-5">
          <div className="h-px bg-gradient-to-r from-transparent via-[#a1faff]/15 to-transparent" />
        </div>

        <div className="mt-auto pb-4 space-y-4">
          <Main items={bottomItems} />
          
          <div className="mx-3 mt-2 flex items-center gap-3 rounded-2xl bg-[#121c2b] p-3 shadow-lg border border-[#a1faff]/10 transition-colors hover:border-[#a1faff]/30 cursor-pointer">
            <div className="relative flex-shrink-0">
              <img 
                src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${currentUser?.full_name || 'Admin'}&backgroundColor=b6e3f4`} 
                alt="avatar" 
                className="h-10 w-10 rounded-full object-cover border border-[#a1faff]/20" 
              />
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#121c2b] bg-[#7be8ff]"></div>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span 
                className="text-sm font-bold text-[#7be8ff] tracking-wide truncate"
                title={currentUser?.full_name || currentUser?.email || "Admin User"}
              >
                {currentUser?.full_name || currentUser?.email || "Admin User"}
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-[#64748b] uppercase mt-0.5 truncate">
                {currentUser?.is_superuser ? "Root Privileges" : "User Privileges"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  )
}

export default AppSidebar

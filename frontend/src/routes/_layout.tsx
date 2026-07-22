import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router"
import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"
import { ProjectSelector } from "@/components/security/ProjectSelector"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

// 安全区路由前缀:命中时才在顶栏挂当前项目选择器(数据按项目隔离仅对这些页面有意义)
const SECURITY_PREFIXES = ["/security", "/security-dashboard", "/projects"]

function Layout() {
  // 当前路径:决定是否显示项目选择器
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const inSecurityArea = SECURITY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  return (
    <div className="min-h-screen bg-surface text-on-surface flex overflow-hidden relative">
      {/* 项目选择器由 route 层注入(route 可依赖 feature,Header 不直接 import) */}
      <Header rightSlot={inSecurityArea ? <ProjectSelector /> : null} />
      <Sidebar />
      <main className="flex-1 ml-64 mt-16 p-8 overflow-y-auto bg-transparent relative min-h-[calc(100vh-64px)]">
        <div className="mx-auto max-w-[1600px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout

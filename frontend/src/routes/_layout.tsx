import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"
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

function Layout() {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex overflow-hidden relative">
      {/* Visual Sentinel Background (Decorative) */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary-fixed/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-secondary-fixed/5 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <Header />
      <Sidebar />
      <main className="flex-1 ml-64 mt-16 p-8 overflow-y-auto bg-transparent relative z-0 min-h-[calc(100vh-64px)]">
        <div className="mx-auto max-w-[1600px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout

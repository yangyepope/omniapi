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

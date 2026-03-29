import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router"

import { Footer } from "@/components/Common/Footer"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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
  const router = useRouterState()
  const isApiCenter = router.location.pathname.startsWith("/api-center")

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className={isApiCenter ? "!bg-[#060b13]" : ""}>
        {!isApiCenter && (
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
          </header>
        )}
        {isApiCenter ? (
          <main className="relative flex min-h-screen flex-1 flex-col">
            <div className="absolute left-4 top-4 z-50 md:hidden">
              <SidebarTrigger className="rounded-md bg-surface-container/50 p-2 text-on-surface backdrop-blur-sm" />
            </div>
            <Outlet />
          </main>
        ) : (
          <main className="flex-1 p-6 md:p-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        )}
        {!isApiCenter && <Footer />}
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout

import { useIsFetching } from "@tanstack/react-query"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_layout/services")({
  component: ServicesLayout,
})

function ServicesLayout() {
  const isFetching = useIsFetching()

  return (
    <div className="relative flex h-full grow flex-col bg-surface text-on-surface font-sans">
      {/* 顶部全局进度条 (针对高延迟优化) */}
      <div
        className={cn(
          "fixed top-0 left-0 z-[100] h-0.5 w-full bg-gradient-to-r from-transparent via-[#00f1fe] to-transparent transition-transform duration-500",
          isFetching
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0",
        )}
      >
        <div className="size-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>

      {/* 共享背景装饰 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[60%] w-[50%] rounded-full bg-[#00f1fe]/5 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[60%] w-[50%] rounded-full bg-[#9d50ff]/5 blur-[120px]" />
      </div>

      {/* 渲染子路由 */}
      <Outlet />
    </div>
  )
}

export default ServicesLayout

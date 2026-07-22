import { createFileRoute } from "@tanstack/react-router"
import { Plus, ShieldCheck } from "lucide-react"
import { motion } from "motion/react"
import { DashboardDesign } from "@/components/Dashboard"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - Security Platform",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1600px] mx-auto px-8"
    >
      {/* Header Section */}
      <div className="flex justify-between items-end mb-12">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight flex items-baseline gap-2">
            <span>你好,</span>
            <span className="text-blue-700 underline decoration-blue-200 decoration-[3px] underline-offset-[6px]">
              {currentUser?.full_name || currentUser?.email || "管理员"}
            </span>
          </h2>
          <div className="flex items-center gap-2 mt-3 p-1">
            <ShieldCheck className="w-[18px] h-[18px] text-white fill-blue-600" />
            <p className="text-sm text-gray-500 font-medium tracking-wide">
              欢迎回到 <span className="text-gray-600 font-bold">流量大师</span>{" "}
              安全控制中心
            </p>
          </div>
        </div>
        <div className="flex gap-4 mb-1">
          <Button
            variant="outline"
            className="rounded-full border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-6 bg-white shadow-sm"
          >
            导出报告
          </Button>
          <Button className="rounded-full bg-[#00f1fe] text-black font-black px-6 hover:bg-[#00dcf5] hover:shadow-md transition-all border-none shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            新增监控
          </Button>
        </div>
      </div>

      {/* Synchronized Dashboard Content */}
      <DashboardDesign />
    </motion.div>
  )
}

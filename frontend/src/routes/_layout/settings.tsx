import { createFileRoute } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import {
  FiAlertTriangle,
  FiFilter,
  FiKey,
  FiLock,
  FiShield,
  FiUser,
} from "react-icons/fi"
import ApiKeys from "@/components/UserSettings/ApiKeys"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import NormalizationRules from "@/components/UserSettings/NormalizationRules"
import UserInformation from "@/components/UserSettings/UserInformation"
import useAuth from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

const tabsConfig = [
  {
    value: "my-profile",
    title: "个人资料",
    icon: FiUser,
    component: UserInformation,
    description: "管理您的个人基本信息与联系方式",
  },
  {
    value: "normalization",
    title: "归一化规则",
    icon: FiFilter,
    component: NormalizationRules,
    description: "管理全局路径归一化与流量聚合规则",
  },
  {
    value: "api-keys",
    title: "API 密钥",
    icon: FiKey,
    component: ApiKeys,
    description: "管理用于访问系统 API 的安全凭据",
  },
  {
    value: "password",
    title: "修改密码",
    icon: FiLock,
    component: ChangePassword,
    description: "更新您的账户登录安全密码",
  },
  {
    value: "danger-zone",
    title: "危险区域",
    icon: FiAlertTriangle,
    component: DeleteAccount,
    description: "永久性删除账户或重置敏感数据",
  },
]

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
})

function UserSettings() {
  // 从身份验证钩子中获取当前登录用户的详细信息
  const { user: currentUser } = useAuth()
  // 定义当前选中的标签页状态，默认为“个人资料”
  const [activeTab, setActiveTab] = useState("my-profile")

  // 如果用户信息不存在，则不进行任何 UI 渲染
  if (!currentUser) return null

  // 根据当前选中的 activeTab 状态，在配置数组中查找对应的标签页详情
  const activeTabDetails =
    tabsConfig.find((tab) => tab.value === activeTab) || tabsConfig[0]

  return (
    <div className="flex flex-col gap-10 w-full max-w-7xl mx-auto px-6 py-12">
      {/* 头部标题区域 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-[1.5rem] bg-blue-50 border border-blue-100 shadow-sm transition-transform hover:scale-110">
            <FiShield className="text-4xl text-blue-600" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              系统及安全设置
            </h1>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest opacity-60">
              管理您的个人资料、安全选项及 API 访问凭据
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* 侧边栏导航区域 */}
        <aside className="w-full lg:w-72 flex flex-col gap-2 sticky top-24">
          <div className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            设置菜单
          </div>
          {tabsConfig.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`
                group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 relative overflow-hidden
                ${
                  activeTab === tab.value
                    ? "text-white shadow-xl shadow-blue-600/20"
                    : "text-gray-500 hover:bg-blue-50/50 hover:text-blue-600"
                }
              `}
            >
              {activeTab === tab.value ? (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-blue-600 z-0"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              ) : (
                <div className="absolute left-0 w-1.5 h-0 bg-blue-600 rounded-full transition-all duration-300 group-hover:h-6" />
              )}

              <div className="relative z-10 flex items-center gap-4 w-full">
                <tab.icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    activeTab === tab.value
                      ? "scale-110"
                      : "group-hover:scale-125",
                  )}
                />
                <span className="font-bold text-sm uppercase tracking-widest">
                  {tab.title}
                </span>
                {activeTab === tab.value && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-auto"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  </motion.div>
                )}
              </div>
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-10 lg:p-12 shadow-sm hover:shadow-xl hover:border-blue-50 transition-all duration-500 relative overflow-hidden group"
            >
              {/* Background Accent Gradient */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/20 rounded-full -mr-32 -mt-32 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

              <div className="relative z-10">
                <div className="mb-12 flex justify-between items-start border-b border-gray-100 pb-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                      <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
                      {activeTabDetails.title}
                    </h2>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-xl">
                      {activeTabDetails.description}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all duration-300">
                    <activeTabDetails.icon className="h-6 w-6" />
                  </div>
                </div>

                <div className="min-h-[400px]">
                  <activeTabDetails.component />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

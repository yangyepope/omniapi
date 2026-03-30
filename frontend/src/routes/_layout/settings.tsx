import { createFileRoute } from "@tanstack/react-router"
import { FiShield, FiUser, FiLock, FiKey, FiAlertTriangle } from "react-icons/fi"
import useAuth from "@/hooks/useAuth"

import ChangePassword from "@/components/UserSettings/ChangePassword"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import UserInformation from "@/components/UserSettings/UserInformation"
import ApiKeys from "@/components/UserSettings/ApiKeys"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const tabsConfig = [
  { value: "my-profile", title: "个人资料", icon: FiUser, component: UserInformation },
  { value: "password", title: "修改密码", icon: FiLock, component: ChangePassword },
  { value: "api-keys", title: "API 密钥", icon: FiKey, component: ApiKeys },
  { value: "danger-zone", title: "危险区域", icon: FiAlertTriangle, component: DeleteAccount },
]

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
})

function UserSettings() {
  const { user: currentUser } = useAuth()
  
  if (!currentUser) return null

  // Admin sees all 4, regular users see all 4 for this setup
  const finalTabs = tabsConfig

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-fixed/10 border border-primary-fixed/20 flex items-center justify-center">
            <FiShield className="text-2xl text-primary-fixed" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">系统及安全设置</h1>
            <p className="text-sm text-on-surface-variant">管理您的个人资料、安全选项及 API 访问凭据</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="my-profile" className="w-full">
        <div className="border-b border-outline-variant mb-8 overflow-x-auto">
          <TabsList className="bg-transparent h-12 p-0 gap-6 justify-start min-w-max">
            {finalTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="bg-transparent rounded-none h-full px-1 text-on-surface-variant font-semibold transition-all border-b-2 border-transparent hover:text-on-surface data-[state=active]:bg-transparent data-[state=active]:text-primary-fixed data-[state=active]:border-primary-fixed"
              >
                <div className="flex items-center gap-2 text-sm">
                  <tab.icon className="h-4 w-4" />
                  {tab.title}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div>
          {finalTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0 focus-visible:outline-none">
              <tab.component />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}


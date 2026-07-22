// /security/scans — 旧「扫描管理」(服务树 + 接口浏览)。IA 重构后:接口浏览下沉到
// 服务详情「接口」Tab,扫描区收拢为运行记录/成本/回归。本路由保留仅为兼容旧书签,
// 直接重定向到扫描区默认页(运行记录)。
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/security/scans")({
  beforeLoad: () => {
    throw redirect({ to: "/security/tasks" })
  },
})

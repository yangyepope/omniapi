// /security/knowledge — 旧「知识摄取」顶层页。IA 重构后:业务知识文档下沉到服务详情
// 「业务知识」Tab(按服务隔离)。本路由保留仅为兼容旧书签,重定向到服务清单,
// 由用户选服务后在详情内管理其知识文档(避免顶层/详情双轨)。
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/security/knowledge")({
  beforeLoad: () => {
    throw redirect({ to: "/security/services" })
  },
})

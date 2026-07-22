// 路由壳:某项目下的服务管理页(/projects/$key)。逻辑在 security/ProjectServicesPage。
import { createFileRoute, useParams } from "@tanstack/react-router"
import { ProjectServicesPage } from "@/security/ProjectServicesPage"

export const Route = createFileRoute("/_layout/projects/$key")({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "服务管理 · Security Platform" }] }),
})

function RouteComponent() {
  // 项目 key 从路径参数取,透传给页面组件
  const { key } = useParams({ from: "/_layout/projects/$key" })
  return <ProjectServicesPage projectKey={key} />
}

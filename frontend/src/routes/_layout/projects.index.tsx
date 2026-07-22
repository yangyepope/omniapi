// 路由壳:项目管理列表页(/projects)。逻辑在 security/ProjectsPage。
// ⚠ 必须用 projects.index.tsx 而非 projects.tsx:扁平路由下 projects.tsx 会成为
// projects.$key 的父路由,而 ProjectsPage(列表)没有 <Outlet/>,子路由(服务管理页)
// 便无处渲染——点进 /projects/$key 只会看到列表页。改成 index 后,TanStack 为
// /projects 段自动生成带 Outlet 的虚拟父路由,列表与详情平级,各自正常渲染。
import { createFileRoute } from "@tanstack/react-router"
import { ProjectsPage } from "@/security/ProjectsPage"

export const Route = createFileRoute("/_layout/projects/")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "项目管理 · Security Platform" }] }),
})

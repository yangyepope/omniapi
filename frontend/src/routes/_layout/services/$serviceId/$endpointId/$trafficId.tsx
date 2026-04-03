/**
 * 流量详情布局路由 (Traffic Record Layout)
 *
 * 路由：/services/:serviceId/:endpointId/:trafficId
 * 职责：仅作为父布局，渲染子路由（index / new-variant）
 *
 * 子路由：
 *   - index.tsx        → 流量详情主页（请求信息 / 变体管理 / 重放历史）
 *   - new-variant.tsx  → 新建变体全页面编辑器
 */

import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute(
  "/_layout/services/$serviceId/$endpointId/$trafficId",
)({
  component: () => <Outlet />,
})

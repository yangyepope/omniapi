import { createFileRoute } from "@tanstack/react-router"
import { SecurityDashboard } from "@/security/SecurityDashboard"

export const Route = createFileRoute("/_layout/security-dashboard")({
  component: SecurityDashboard,
  head: () => ({
    meta: [{ title: "Security Dashboard · 安全运营大屏" }],
  }),
})

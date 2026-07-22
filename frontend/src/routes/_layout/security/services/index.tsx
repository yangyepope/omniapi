import { createFileRoute } from "@tanstack/react-router"
import { ServiceListPage } from "@/security/ServiceListPage"

export const Route = createFileRoute("/_layout/security/services/")({
  component: ServiceListPage,
  head: () => ({ meta: [{ title: "服务 · Security Platform" }] }),
})

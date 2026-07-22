import { createFileRoute } from "@tanstack/react-router"
import { ProjectSystemProfilePage } from "@/security/ProjectSystemProfilePage"

export const Route = createFileRoute("/_layout/security/system-profile")({
  component: ProjectSystemProfilePage,
  head: () => ({
    meta: [{ title: "系统画像 · GitLab Scanner" }],
  }),
})

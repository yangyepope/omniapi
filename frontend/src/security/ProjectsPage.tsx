// 项目(租户)管理页 — 卡片列表 + 启停开关 + 新增 + 删除 + 下钻服务管理。
// 数据 useProjects();mutation 内联;破坏性删除走安全区 ConfirmDialog。
// 亮色字面类(踩坑 F-004);四态齐全(加载 / 空 / 错误 / 正常,规则 05 §七)。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { FolderKanban, Plus, Server, Settings2, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  ConfirmDialog,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
} from "@/components/security/ui"
import { fmtDate } from "@/lib/format"
import { type ProjectItem, SecurityApi, scannerErrorDetail } from "./api"
import { useProjects } from "./hooks"
import { ProjectCreateDialog } from "./ProjectCreateDialog"

export function ProjectsPage() {
  const projects = useProjects()
  const [createOpen, setCreateOpen] = useState(false)
  const [toDelete, setToDelete] = useState<ProjectItem | null>(null)
  const qc = useQueryClient()

  // 失效项目列表(启停 / 删除后统一刷新)
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["security", "projects"] })

  // 启停:PUT enabled;禁用后其服务不参与扫描
  const toggle = useMutation({
    mutationFn: (p: ProjectItem) =>
      SecurityApi.updateProject(p.key, { enabled: !p.enabled }),
    onSuccess: (d) => {
      invalidate()
      toast.success(`项目 ${d.name} 已${d.enabled ? "启用" : "停用"}`)
    },
    onError: (err) => toast.error(`操作失败:${scannerErrorDetail(err)}`),
  })

  // 删除:default 不可删(后端 400);连带删其服务定义
  const del = useMutation({
    mutationFn: (key: string) => SecurityApi.deleteProject(key),
    onSuccess: () => {
      invalidate()
      toast.success("项目已删除")
      setToDelete(null)
    },
    onError: (err) => toast.error(`删除失败:${scannerErrorDetail(err)}`),
  })

  const items = projects.data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderKanban}
        title="项目管理"
        subtitle="每个项目 = 一个团队 / 租户的整片服务;数据按项目隔离,互不分析"
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> 新增项目
          </button>
        }
      />

      {projects.isLoading && <LoadingBlock />}
      {projects.isError && (
        <ErrorBlock text={scannerErrorDetail(projects.error)} />
      )}
      {!projects.isLoading && !projects.isError && items.length === 0 && (
        <EmptyBlock text="暂无项目,点右上角「新增项目」创建" />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((p) => (
          <div
            key={p.key}
            className={`bg-white border border-gray-100 rounded-2xl shadow-sm p-5 ${p.enabled ? "" : "opacity-60"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-base font-bold text-gray-900 truncate">
                  {p.name}
                </div>
                <div className="text-xs font-mono text-gray-400 mt-0.5 truncate">
                  {p.key}
                </div>
              </div>
              {/* 启停开关:字面色小 pill,点击切换 */}
              <button
                type="button"
                onClick={() => toggle.mutate(p)}
                disabled={toggle.isPending}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50 ${
                  p.enabled
                    ? "bg-green-50 text-green-600 hover:bg-green-100"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {p.enabled ? "已启用" : "已停用"}
              </button>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-gray-400" />
                {p.service_count} 个服务
              </span>
              <span>创建于 {fmtDate(p.created_at)}</span>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Link
                to="/projects/$key"
                params={{ key: p.key }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100"
              >
                <Settings2 className="w-3.5 h-3.5" /> 管理服务
              </Link>
              {/* default 是存量单项目数据的家,不可删 → 隐藏删除按钮 */}
              {p.key !== "default" && (
                <button
                  type="button"
                  onClick={() => setToDelete(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ProjectCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={toDelete !== null}
        title={`删除项目「${toDelete?.name}」?`}
        description={`将连带删除该项目下 ${toDelete?.service_count ?? 0} 个服务定义,且不可恢复。历史扫描数据不受影响。`}
        confirmText="删除"
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.key)}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}

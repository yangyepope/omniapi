// 单个项目下的服务定义管理 — 表格 + 新增 / 编辑 / 删除。
// 改动服务 / 项目后后端自动重建路由,下次扫描即生效,前端无需额外操作。
// 数据 useProjectServices(key);破坏性删除走 ConfirmDialog;亮色字面类(F-004)。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  ConfirmDialog,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from "@/components/security/ui"
import {
  deriveGroupPath,
  SecurityApi,
  type ServiceItem,
  scannerErrorDetail,
} from "./api"
import { useProjectServices, useProjects } from "./hooks"
import { ProjectScanConfigPanel } from "./ProjectScanConfigPanel"
import { ServiceFormDialog } from "./ServiceFormDialog"
import { SyncGroupDialog } from "./SyncGroupDialog"

const langText = (l: string | string[]) =>
  Array.isArray(l) ? l.join(" / ") : l

export function ProjectServicesPage({ projectKey }: { projectKey: string }) {
  const services = useProjectServices(projectKey)
  const projects = useProjects()
  const qc = useQueryClient()
  // 弹窗态:null=关;{service:null}=新增;{service:x}=编辑
  const [form, setForm] = useState<{ service: ServiceItem | null } | null>(null)
  const [toDelete, setToDelete] = useState<ServiceItem | null>(null)
  const [syncOpen, setSyncOpen] = useState(false)

  // 当前项目展示名(找不到兜底显示 key)
  const projName =
    projects.data?.items.find((p) => p.key === projectKey)?.name ?? projectKey

  const del = useMutation({
    mutationFn: (name: string) =>
      SecurityApi.deleteProjectService(projectKey, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "project-services"] })
      qc.invalidateQueries({ queryKey: ["security", "projects"] })
      qc.invalidateQueries({ queryKey: ["security", "services"] })
      toast.success("服务已删除")
      setToDelete(null)
    },
    onError: (err) => toast.error(`删除失败:${scannerErrorDetail(err)}`),
  })

  const items = services.data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-blue-600 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 返回项目列表
        </Link>
        <PageHeader
          title={`${projName} · 服务管理`}
          subtitle={`项目 key:${projectKey};一个仓库只能归一个项目`}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSyncOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <RefreshCw className="w-4 h-4" /> 同步组
              </button>
              <button
                type="button"
                onClick={() => setForm({ service: null })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" /> 新增服务
              </button>
            </div>
          }
        />
      </div>

      {services.isLoading && <LoadingBlock />}
      {services.isError && (
        <ErrorBlock text={scannerErrorDetail(services.error)} />
      )}
      {!services.isLoading && !services.isError && items.length === 0 && (
        <EmptyBlock text="该项目下暂无服务,点右上角「新增服务」添加" />
      )}

      {items.length > 0 && (
        <SectionCard title={`服务 (${items.length})`} bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="px-4 py-2.5 font-semibold">名称</th>
                <th className="px-4 py-2.5 font-semibold">仓库 / 分支</th>
                <th className="px-4 py-2.5 font-semibold">语言 / 类型</th>
                <th className="px-4 py-2.5 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.name}
                  className={`border-b border-gray-50 last:border-0 ${s.enabled ? "" : "opacity-50"}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900">{s.name}</div>
                    <div className="text-[11px] text-gray-400">
                      {s.group_name}
                      {s.path_in_repo !== "." && ` · ${s.path_in_repo}`}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-gray-600 truncate max-w-[20rem]">
                      {s.repo_url}
                    </div>
                    <div className="text-[11px] text-gray-400">{s.ref}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {langText(s.language) || "—"}
                    <span className="text-gray-300"> · </span>
                    {s.service_type}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setForm({ service: s })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {/* 每项目扫描配置覆盖(verify / 严重度 / 并发),未覆盖跟随全局 */}
      <ProjectScanConfigPanel projectKey={projectKey} />

      {/* key 强制在新增/编辑不同目标间重挂,重置弹窗内受控草稿 */}
      {form && (
        <ServiceFormDialog
          key={form.service?.name ?? "__new__"}
          projectKey={projectKey}
          service={form.service}
          open
          onOpenChange={(o) => !o && setForm(null)}
        />
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title={`删除服务「${toDelete?.name}」?`}
        description="仅删除服务定义,历史扫描数据不受影响。"
        confirmText="删除"
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.name)}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
      {syncOpen && (
        <SyncGroupDialog
          projectKey={projectKey}
          initialGroupPath={deriveGroupPath(items)}
          open
          onOpenChange={setSyncOpen}
        />
      )}
    </div>
  )
}

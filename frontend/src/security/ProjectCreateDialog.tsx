// 「新增项目(租户)」弹窗。两种模式:
//   手动 — key + name(POST /projects);
//   从 GitLab 组导入 — 填组地址 → 发现仓库 → 勾选 → 一键建项目 + 注册服务 + 建 webhook。
// Radix Dialog 原语 + 受控 useState + useMutation + sonner + invalidate。
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, Search } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  type DiscoveredRepo,
  type DiscoverGroupResp,
  type GroupImportRepo,
  type ProjectCreate,
  SecurityApi,
  scannerErrorDetail,
} from "./api"
import { Field, inputCls } from "./formKit"

type Mode = "manual" | "group"

const STATUS_BADGE: Record<
  DiscoveredRepo["status"],
  { text: string; cls: string }
> = {
  new: { text: "可导入", cls: "bg-green-50 text-green-700" },
  empty: { text: "空仓库", cls: "bg-amber-50 text-amber-700" },
  archived: { text: "已归档", cls: "bg-amber-50 text-amber-700" },
  "already-in-this-project": {
    text: "已注册",
    cls: "bg-gray-100 text-gray-500",
  },
  "conflict-other-project": {
    text: "属别项目",
    cls: "bg-gray-100 text-gray-500",
  },
}

export function ProjectCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<Mode>("manual")
  const [key, setKey] = useState("")
  const [name, setName] = useState("")
  const [groupPath, setGroupPath] = useState("")
  const [discovered, setDiscovered] = useState<DiscoverGroupResp | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const reset = () => {
    setMode("manual")
    setKey("")
    setName("")
    setGroupPath("")
    setDiscovered(null)
    setSelected(new Set())
  }

  const close = () => {
    reset()
    onOpenChange(false)
  }

  // 手动建项目
  const create = useMutation({
    mutationFn: (body: ProjectCreate) => SecurityApi.createProject(body),
    onSuccess: (d) => {
      // 成功必须使项目列表失效,否则选择器/列表不刷新(踩坑 F-001)
      qc.invalidateQueries({ queryKey: ["security", "projects"] })
      toast.success(`已新增项目 ${d.name}`)
      close()
    },
    onError: (err) => toast.error(`新增失败:${scannerErrorDetail(err)}`),
  })

  // 发现组下仓库(只读预览)
  const discover = useMutation({
    mutationFn: () =>
      SecurityApi.discoverGroup({
        group_path: groupPath.trim(),
        project_key: key.trim() || undefined,
      }),
    onSuccess: (d) => {
      setDiscovered(d)
      // 默认勾选所有「可导入(new)」仓库
      setSelected(
        new Set(
          d.items.filter((r) => r.status === "new").map((r) => r.repo_url),
        ),
      )
    },
    onError: (err) => toast.error(`发现失败:${scannerErrorDetail(err)}`),
  })

  // 导入选中仓库(建项目 + 注册服务 + 建 webhook)
  const importGroup = useMutation({
    mutationFn: () => {
      const repos: GroupImportRepo[] = (discovered?.items ?? [])
        .filter((r) => selected.has(r.repo_url))
        .map((r) => ({
          project_id: r.project_id,
          repo_url: r.repo_url,
          name: r.suggested_name,
          group_name: key.trim(),
          ref: r.suggested_ref,
          language: r.suggested_language ?? "unknown",
          framework: r.suggested_framework,
          service_type: r.suggested_service_type,
        }))
      return SecurityApi.importProjectFromGroup({
        project_key: key.trim(),
        project_name: name.trim() || key.trim(),
        group_path: groupPath.trim(),
        repos,
      })
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["security", "projects"] })
      qc.invalidateQueries({ queryKey: ["security", "project-services"] })
      qc.invalidateQueries({ queryKey: ["security", "services"] })
      toast.success(`已导入 ${d.created} 个服务(跳过 ${d.skipped})`)
      close()
    },
    onError: (err) => toast.error(`导入失败:${scannerErrorDetail(err)}`),
  })

  const toggle = (repoUrl: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(repoUrl)) next.delete(repoUrl)
      else next.add(repoUrl)
      return next
    })

  const busy = create.isPending || discover.isPending || importGroup.isPending
  const canManual = key.trim() && name.trim() && !busy
  const canDiscover = key.trim() && groupPath.trim() && !busy
  const canImport = selected.size > 0 && !busy

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => (o ? null : close())}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-gray-100 shadow-xl p-5 focus:outline-none">
          <DialogPrimitive.Title className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> 新增项目
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-gray-500 mt-1">
            项目 = 一个团队 / 租户的整片服务。key 为稳定标识,创建后不可改;
            数据按项目隔离。
          </DialogPrimitive.Description>

          {/* 模式切换 */}
          <div className="mt-3 inline-flex rounded-lg bg-gray-100 p-0.5 text-sm">
            {(["manual", "group"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md font-medium ${
                  mode === m
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {m === "manual" ? "手动" : "从 GitLab 组导入"}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <Field
              label="项目 key(slug,唯一)"
              hint="建议小写字母 / 数字 / 连字符,如 team-x"
            >
              <input
                className={`${inputCls} font-mono`}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="team-x"
              />
            </Field>
            <Field label="项目名称 name">
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Team X"
              />
            </Field>

            {mode === "group" && (
              <Field
                label="GitLab 组地址"
                hint="如 iam/middleground(含子组递归);发现后勾选要导入的仓库"
              >
                <div className="flex gap-2">
                  <input
                    className={`${inputCls} font-mono`}
                    value={groupPath}
                    onChange={(e) => setGroupPath(e.target.value)}
                    placeholder="group/subgroup"
                  />
                  <button
                    type="button"
                    disabled={!canDiscover}
                    onClick={() => discover.mutate()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
                  >
                    {discover.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    发现仓库
                  </button>
                </div>
              </Field>
            )}
          </div>

          {/* 发现结果:勾选列表 */}
          {mode === "group" && discovered && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">
                发现 {discovered.total} 个仓库,已选 {selected.size} 个
              </div>
              <div className="max-h-56 overflow-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                {discovered.items.map((r) => {
                  const badge = STATUS_BADGE[r.status]
                  return (
                    <label
                      key={r.repo_url}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm ${
                        r.selectable
                          ? "cursor-pointer hover:bg-gray-50"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!r.selectable}
                        checked={selected.has(r.repo_url)}
                        onChange={() => toggle(r.repo_url)}
                      />
                      <span className="font-medium text-gray-800 flex-1 truncate">
                        {r.suggested_name}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {r.suggested_language ?? "—"}
                      </span>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              取消
            </button>
            {mode === "manual" ? (
              <button
                type="button"
                disabled={!canManual}
                onClick={() =>
                  create.mutate({ key: key.trim(), name: name.trim() })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {create.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                新增
              </button>
            ) : (
              <button
                type="button"
                disabled={!canImport}
                onClick={() => importGroup.mutate()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {importGroup.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                导入 {selected.size} 个
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// 「服务定义」新增 / 编辑弹窗(POST / PUT /projects/{key}/services)。
// 一个弹窗两用:传 service → 编辑(name 锁定,部分更新);否则新增。
// 受控 useState + useMutation + sonner + invalidate;repo 冲突 409 的 detail
// 由后端原样带「already belongs to project X」,toast 直接展示(踩坑 F-001)。
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  SecurityApi,
  type ServiceCreate,
  type ServiceItem,
  scannerErrorDetail,
} from "./api"
import { Field, inputCls } from "./formKit"

// language 展示:字符串原样,数组用逗号连接,供输入框回填
const langToText = (l: string | string[] | undefined) =>
  Array.isArray(l) ? l.join(", ") : (l ?? "")
// language 提交:逗号切分 → 单值传 string、多值传 string[]、空则不传(用后端默认)
const textToLang = (t: string): string | string[] | undefined => {
  const parts = t
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) return undefined
  return parts.length === 1 ? parts[0] : parts
}

export function ServiceFormDialog({
  projectKey,
  service,
  open,
  onOpenChange,
}: {
  projectKey: string
  service?: ServiceItem | null // 传入 → 编辑模式
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const editing = Boolean(service)
  // 草稿:编辑模式用现值回填,新增模式用空 / 后端默认占位
  const [name, setName] = useState(service?.name ?? "")
  const [repoUrl, setRepoUrl] = useState(service?.repo_url ?? "")
  const [group, setGroup] = useState(service?.group_name ?? "default")
  const [ref, setRef] = useState(service?.ref ?? "main")
  const [pathInRepo, setPathInRepo] = useState(service?.path_in_repo ?? ".")
  const [lang, setLang] = useState(langToText(service?.language))
  const [framework, setFramework] = useState(service?.framework ?? "")
  const [svcType, setSvcType] = useState(service?.service_type ?? "service")
  const [internalUrl, setInternalUrl] = useState(service?.internal_url ?? "")

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["security", "project-services"] })
    qc.invalidateQueries({ queryKey: ["security", "projects"] }) // service_count 变化
    qc.invalidateQueries({ queryKey: ["security", "services"] }) // 服务视图隔离列表
  }

  const save = useMutation({
    mutationFn: (body: ServiceCreate) =>
      editing
        ? SecurityApi.updateProjectService(projectKey, service!.name, body)
        : SecurityApi.createProjectService(projectKey, body),
    onSuccess: (d) => {
      invalidate()
      toast.success(`服务 ${d.name} 已${editing ? "更新" : "新增"}`)
      onOpenChange(false)
    },
    onError: (err) => toast.error(`保存失败:${scannerErrorDetail(err)}`),
  })

  const canSubmit =
    (editing || name.trim()) && repoUrl.trim() && !save.isPending

  const submit = () => {
    const body: ServiceCreate = {
      name: name.trim(),
      repo_url: repoUrl.trim(),
      group_name: group.trim() || "default",
      ref: ref.trim() || "main",
      path_in_repo: pathInRepo.trim() || ".",
      language: textToLang(lang),
      framework: framework.trim() || null,
      service_type: svcType,
      internal_url: internalUrl.trim() || null,
    }
    save.mutate(body)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-gray-100 shadow-xl p-5 focus:outline-none max-h-[85vh] overflow-auto data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="text-base font-bold text-gray-900">
            {editing ? `编辑服务 ${service?.name}` : "新增服务"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-gray-500 mt-1">
            一个仓库只能归一个项目;若 repo 已属别的项目,保存会被拒绝并提示。
          </DialogPrimitive.Description>

          <div className="mt-4 space-y-3">
            <Field label="服务名 name(项目内唯一)">
              <input
                className={`${inputCls} ${editing ? "opacity-60" : ""}`}
                value={name}
                disabled={editing}
                onChange={(e) => setName(e.target.value)}
                placeholder="svc-a"
              />
            </Field>
            <Field label="仓库地址 repo_url">
              <input
                className={`${inputCls} font-mono text-xs`}
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="http://git/svc-a.git"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="分组 group_name">
                <input
                  className={inputCls}
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                />
              </Field>
              <Field label="分支 / ref">
                <input
                  className={inputCls}
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                />
              </Field>
              <Field label="子路径 path_in_repo" hint="monorepo 用,单服务填 .">
                <input
                  className={`${inputCls} font-mono text-xs`}
                  value={pathInRepo}
                  onChange={(e) => setPathInRepo(e.target.value)}
                />
              </Field>
              <Field label="语言 language" hint="逗号分隔,如 java, kotlin">
                <input
                  className={inputCls}
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  placeholder="java"
                />
              </Field>
              <Field label="框架 framework">
                <input
                  className={inputCls}
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  placeholder="spring"
                />
              </Field>
              <Field label="类型 service_type">
                <select
                  className={inputCls}
                  value={svcType}
                  onChange={(e) => setSvcType(e.target.value)}
                >
                  <option value="service">service</option>
                  <option value="library">library</option>
                </select>
              </Field>
            </div>
            <Field label="内部地址 internal_url(可选)">
              <input
                className={`${inputCls} font-mono text-xs`}
                value={internalUrl}
                onChange={(e) => setInternalUrl(e.target.value)}
                placeholder="http://svc-a.internal"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={save.isPending}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {save.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {editing ? "保存" : "新增"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

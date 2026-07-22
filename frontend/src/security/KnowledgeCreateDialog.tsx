// 知识文档「手工新增」弹窗(POST /services/{service}/knowledge)。
// (service, sha, doc_path) 唯一,重复返回 409。source=manual,human_edited=True。
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { type Classification, SecurityApi, scannerErrorDetail } from "./api"
import { CLASSIFICATION_OPTIONS } from "./knowledgeUtils"

const inputCls =
  "w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"

export function KnowledgeCreateDialog({
  service,
  defaultSha,
  open,
  onOpenChange,
}: {
  service: string
  defaultSha?: string // 预填当前筛选的 sha,方便就地补一条
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const [sha, setSha] = useState(defaultSha ?? "")
  const [docPath, setDocPath] = useState("")
  const [content, setContent] = useState("")
  const [cls, setCls] = useState<Classification>("ai_context")

  const reset = () => {
    setSha(defaultSha ?? "")
    setDocPath("")
    setContent("")
    setCls("ai_context")
  }

  const create = useMutation({
    mutationFn: () =>
      SecurityApi.createKnowledgeDoc(service, {
        sha: sha.trim(),
        doc_path: docPath.trim(),
        content,
        classification: cls,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "knowledge", service] })
      toast.success("已新增知识文档")
      reset()
      onOpenChange(false)
    },
    onError: (err) => toast.error(`新增失败:${scannerErrorDetail(err)}`),
  })

  const canSubmit = sha.trim() && docPath.trim() && !create.isPending

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-gray-100 shadow-xl p-5 focus:outline-none max-h-[85vh] overflow-auto data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> 手工新增知识文档
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-gray-500 mt-1">
            为 <b>{service}</b> 的某个 commit 补一条知识;(sha, 路径)
            唯一,重复会报冲突。
          </DialogPrimitive.Description>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="sha(commit)">
                <input
                  className={`${inputCls} font-mono`}
                  value={sha}
                  onChange={(e) => setSha(e.target.value)}
                  placeholder="如 a2a41e9…"
                />
              </Field>
              <Field label="分类">
                <select
                  className={inputCls}
                  value={cls}
                  onChange={(e) => setCls(e.target.value as Classification)}
                >
                  {CLASSIFICATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="doc_path">
              <input
                className={`${inputCls} font-mono`}
                value={docPath}
                onChange={(e) => setDocPath(e.target.value)}
                placeholder="docs/ai/overview.md"
              />
            </Field>
            <Field label="content(markdown)">
              <textarea
                className={`${inputCls} font-mono text-xs h-56 resize-y`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => create.mutate()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {create.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              新增
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      {children}
    </div>
  )
}

// 知识文档详情 + 编辑面板(右侧)。content 用等宽 textarea 编辑,classification 三值下拉。
// 保存 PUT(只传改过的 content / classification),置 human_edited=True。父用 key={id} 挂载。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  ConfirmDialog,
  ErrorBlock,
  KV,
  LoadingBlock,
} from "@/components/security/ui"
import { type Classification, SecurityApi, scannerErrorDetail } from "./api"
import { useKnowledgeDoc } from "./hooks"
import { CLASSIFICATION_OPTIONS, FedBadge } from "./knowledgeUtils"

const inputCls =
  "w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"

export function KnowledgeDetail({
  id,
  service,
}: {
  id: number
  service: string
}) {
  const docQ = useKnowledgeDoc(id)
  const qc = useQueryClient()
  // 草稿:未编辑时为 null,取 detail 值;编辑后存草稿
  const [content, setContent] = useState<string | null>(null)
  const [cls, setCls] = useState<Classification | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  const d = docQ.data
  // 当前值:草稿优先,否则 detail
  const contentVal = content ?? d?.content ?? ""
  const clsVal = cls ?? d?.classification ?? "ai_context"
  const dirty =
    d != null &&
    ((content != null && content !== d.content) ||
      (cls != null && cls !== d.classification))

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["security", "knowledge", service] })
    qc.invalidateQueries({ queryKey: ["security", "knowledge-doc", id] })
  }

  const save = useMutation({
    mutationFn: () =>
      SecurityApi.updateKnowledgeDoc(id, {
        ...(content != null && content !== d?.content ? { content } : {}),
        ...(cls != null && cls !== d?.classification
          ? { classification: cls }
          : {}),
      }),
    onSuccess: () => {
      invalidate()
      setContent(null)
      setCls(null)
      toast.success("已保存(已标记人工编辑,重扫不覆盖)")
    },
    onError: (err) => toast.error(`保存失败:${scannerErrorDetail(err)}`),
  })

  const del = useMutation({
    mutationFn: () => SecurityApi.deleteKnowledgeDoc(id),
    onSuccess: () => {
      invalidate()
      toast.success("已删除知识文档")
    },
    onError: (err) => toast.error(`删除失败:${scannerErrorDetail(err)}`),
  })

  if (docQ.isLoading) return <LoadingBlock />
  if (docQ.isError || !d)
    return <ErrorBlock text="加载文档详情失败(scanner 不可达?)" />

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-mono text-sm font-bold text-gray-900 break-all">
            {d.doc_path}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <FedBadge fed={clsVal === "ai_context"} />
            {d.human_edited && (
              <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                人工编辑
              </span>
            )}
            <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
              {d.source}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> 删除
          </button>
          <button
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            保存
          </button>
        </div>
      </div>

      {/* 分类:改为 ai_context 即纳入 AI,否则排除 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-700">分类</span>
        <select
          className={`${inputCls} max-w-[220px]`}
          value={clsVal}
          onChange={(e) => setCls(e.target.value as Classification)}
        >
          {CLASSIFICATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-gray-400">
          仅 ai_context 会喂给 AI 扫描
        </span>
      </div>

      {/* content:markdown 等宽编辑 */}
      <div>
        <div className="text-xs font-semibold text-gray-700 mb-1">
          content(markdown)
        </div>
        <textarea
          className={`${inputCls} font-mono text-xs h-96 resize-y`}
          value={contentVal}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <ul className="text-xs space-y-1 border-t border-gray-100 pt-3">
        <KV
          k="服务 / sha"
          v={`${d.service_name} @ ${d.sha.slice(0, 8)}`}
          mono
        />
        <KV k="分类原因" v={d.classification_reason ?? "—"} />
        <KV k="内容哈希" v={d.content_hash.slice(0, 12)} mono />
        <KV k="长度" v={`${d.content_length} 字符`} />
        <KV k="创建时间" v={d.created_at} />
      </ul>

      <ConfirmDialog
        open={confirmDel}
        title="删除该知识文档?"
        description="删除后不可恢复(下次扫描若仍摄取到同一文档会重新出现)。"
        confirmText="删除"
        busy={del.isPending}
        onConfirm={() => del.mutate()}
        onOpenChange={setConfirmDel}
      />
    </div>
  )
}

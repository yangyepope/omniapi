// 服务详情「项目理解」tab(D):服务级业务画像编辑 + AI 扫描上下文预览。
// - 服务 profile:business_summary + description,PUT 全量覆盖(两字段一起提交),可删除。
// - ai-context:只读预览 AI 扫描时看到的完整上下文(可选按 sha)。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Eye, Loader2, Save, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  ConfirmDialog,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  SectionCard,
} from "@/components/security/ui"
import { fmtDateTime } from "@/lib/format"
import { SecurityApi, scannerErrorDetail } from "./api"
import { useAiContext, useServiceProfile } from "./hooks"

const inputCls =
  "w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"

export function ProjectUnderstandingPanel({ name }: { name: string }) {
  return (
    <div className="space-y-4">
      <ServiceProfileForm name={name} />
      <AiContextPreview name={name} />
    </div>
  )
}

// ── 服务画像编辑(全量覆盖)──────────────────────────────────────────
function ServiceProfileForm({ name }: { name: string }) {
  const q = useServiceProfile(name)
  const qc = useQueryClient()
  // null = pristine(用服务端值);非 null = 草稿(仿 KnowledgeDetail)
  const [bizDraft, setBiz] = useState<string | null>(null)
  const [descDraft, setDesc] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  const biz = bizDraft ?? q.data?.business_summary ?? ""
  const desc = descDraft ?? q.data?.description ?? ""
  const dirty = bizDraft !== null || descDraft !== null

  const save = useMutation({
    mutationFn: () =>
      // 全量覆盖:两字段一起提交
      SecurityApi.updateServiceProfile(name, {
        business_summary: biz || null,
        description: desc || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "service-profile", name] })
      setBiz(null)
      setDesc(null)
      toast.success("已保存服务画像")
    },
    onError: (err) => toast.error(`保存失败:${scannerErrorDetail(err)}`),
  })

  const del = useMutation({
    mutationFn: () => SecurityApi.deleteServiceProfile(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "service-profile", name] })
      setBiz(null)
      setDesc(null)
      toast.success("已删除服务画像")
    },
    onError: (err) => toast.error(`删除失败:${scannerErrorDetail(err)}`),
  })

  const hasProfile = Boolean(
    q.data?.business_summary || q.data?.description || q.data?.updated_at,
  )

  return (
    <SectionCard
      title="服务画像"
      action={
        <div className="flex items-center gap-2">
          {hasProfile && (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> 删除
            </button>
          )}
          <button
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            保存
          </button>
        </div>
      }
    >
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorBlock text="加载服务画像失败(scanner 不可达?)" />
      ) : (
        <div className="space-y-3">
          <Field label="业务摘要 business_summary">
            <textarea
              className={`${inputCls} h-20 resize-y`}
              value={biz}
              onChange={(e) => setBiz(e.target.value)}
            />
          </Field>
          <Field label="描述 description">
            <textarea
              className={`${inputCls} h-28 resize-y`}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </Field>
          {q.data?.updated_at && (
            <p className="text-[11px] text-gray-400">
              最后更新 {fmtDateTime(q.data.updated_at)}
              {q.data.updated_by ? ` · ${q.data.updated_by}` : ""}
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDel}
        title={`删除服务画像 ${name}?`}
        description="删除后该服务恢复为无业务画像。"
        confirmText="删除"
        busy={del.isPending}
        onConfirm={() => del.mutate()}
        onOpenChange={setConfirmDel}
      />
    </SectionCard>
  )
}

// ── AI 扫描上下文预览(只读)──────────────────────────────────────────
function AiContextPreview({ name }: { name: string }) {
  const [shaInput, setShaInput] = useState("")
  const [appliedSha, setAppliedSha] = useState<string | undefined>(undefined)
  const q = useAiContext(name, appliedSha)

  return (
    <SectionCard
      title="AI 扫描上下文预览"
      action={
        <div className="flex items-center gap-1.5">
          <input
            className="w-40 border border-gray-200 rounded-md px-2 py-1 text-xs font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="sha(留空取默认)"
            value={shaInput}
            onChange={(e) => setShaInput(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setAppliedSha(shaInput.trim() || undefined)}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            <Eye className="w-3.5 h-3.5" /> 预览
          </button>
        </div>
      }
    >
      <p className="text-[11px] text-gray-400 mb-2">
        这是 AI 扫描该服务时实际看到的完整输入(服务画像 + 接口 + 知识文档拼装)。
      </p>
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorBlock text="加载 AI 上下文失败(scanner 不可达?)" />
      ) : !q.data?.context ? (
        <EmptyBlock text="暂无上下文(该服务尚未扫描或无对应 sha)" />
      ) : (
        <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono bg-gray-50 rounded-lg p-3 max-h-[60vh] overflow-auto">
          {q.data.context}
        </pre>
      )}
    </SectionCard>
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

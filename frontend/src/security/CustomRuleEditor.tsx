// 自定义参考规则详情 + 编辑面板(右侧)。dirty-map 暂存(仿 AiCategoryEditor):
// 字段值 = dirty 有则取 dirty,否则取 detail;保存把 dirty PUT 上去(部分更新)。
// 父组件用 key={ruleId} 挂载,切换规则即重置 dirty。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Tag } from "@/components/security/badges"
import {
  ConfirmDialog,
  ErrorBlock,
  KV,
  LoadingBlock,
} from "@/components/security/ui"
import {
  type CustomRuleDetail,
  type CustomRuleUpdate,
  SecurityApi,
  scannerErrorDetail,
} from "./api"
import { useCustomRule } from "./hooks"
import { fromList, toList } from "./rulesUtils"

// 可编辑的 list 字段(逗号分隔;保存时转数组)
const LIST_FIELDS: { key: keyof CustomRuleUpdate; label: string }[] = [
  { key: "cwes", label: "CWE" },
  { key: "owasp_refs", label: "OWASP 参考" },
  { key: "asvs_refs", label: "ASVS 参考" },
  { key: "languages", label: "语言" },
]

// 可编辑的标量文本字段
const TEXT_FIELDS: { key: keyof CustomRuleUpdate; label: string }[] = [
  { key: "severity", label: "严重度 severity" },
  { key: "level", label: "级别 level" },
  { key: "source_url", label: "来源 URL" },
  { key: "license", label: "许可 license" },
]

const inputCls =
  "w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"

export function CustomRuleEditor({ ruleId }: { ruleId: string }) {
  const detailQ = useCustomRule(ruleId)
  const qc = useQueryClient()
  const [dirty, setDirty] = useState<Record<string, unknown>>({})
  const [confirmDel, setConfirmDel] = useState(false)

  const d = detailQ.data
  const set = (k: string, v: unknown) => setDirty((s) => ({ ...s, [k]: v }))
  const val = <T,>(k: keyof CustomRuleDetail, fallback: T): T =>
    (k in dirty ? dirty[k as string] : (d?.[k] ?? fallback)) as T

  const save = useMutation({
    mutationFn: () => {
      const body: CustomRuleUpdate = {}
      for (const [k, raw] of Object.entries(dirty)) {
        if (LIST_FIELDS.some((f) => f.key === k))
          body[k as keyof CustomRuleUpdate] = toList(String(raw)) as never
        else body[k as keyof CustomRuleUpdate] = raw as never
      }
      return SecurityApi.updateCustomRule(ruleId, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "custom-rules"] })
      qc.invalidateQueries({ queryKey: ["security", "custom-rule", ruleId] })
      // 自定义规则会并进规则库(source=custom),一并失效
      qc.invalidateQueries({ queryKey: ["security", "rules"] })
      setDirty({})
      toast.success("已保存,扫描器将热加载生效")
    },
    onError: (err) => toast.error(`保存失败:${scannerErrorDetail(err)}`),
  })

  const del = useMutation({
    mutationFn: () => SecurityApi.deleteCustomRule(ruleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "custom-rules"] })
      qc.invalidateQueries({ queryKey: ["security", "rules"] })
      toast.success(`已删除自定义规则 ${ruleId}`)
    },
    onError: (err) => toast.error(`删除失败:${scannerErrorDetail(err)}`),
  })

  if (detailQ.isLoading) return <LoadingBlock />
  if (detailQ.isError || !d)
    return <ErrorBlock text="加载规则详情失败(scanner 不可达?)" />

  const dirtyCount = Object.keys(dirty).length

  return (
    <div className="p-4 space-y-4">
      {/* 顶部:rule_id + 元数据 + 保存/删除 */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-sm font-bold text-gray-900">
            {d.rule_id}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Tag>自定义</Tag>
            {d.severity && <Tag>{d.severity}</Tag>}
            {d.level && <Tag>{d.level}</Tag>}
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
            disabled={dirtyCount === 0 || save.isPending}
            onClick={() => save.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            保存{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
          </button>
        </div>
      </div>

      {/* 启停 */}
      <Toggle
        label="启用(禁用即从扫描语料剔除,保留记录)"
        on={val<boolean>("enabled", false)}
        onToggle={(v) => set("enabled", v)}
      />

      <Field label="标题 title">
        <input
          className={inputCls}
          value={val<string>("title", "")}
          onChange={(e) => set("title", e.target.value)}
        />
      </Field>

      <Field label="描述 description(规则语料正文)">
        <textarea
          className={`${inputCls} h-40 resize-y`}
          value={val<string>("description", "")}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>

      {/* list 字段:逗号分隔;填 CWE/OWASP/ASVS 才被对应 category 采用 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {LIST_FIELDS.map((f) => (
          <Field key={f.key as string} label={f.label}>
            <input
              className={`${inputCls} font-mono text-xs`}
              value={
                f.key in dirty
                  ? String(dirty[f.key as string])
                  : fromList(d[f.key as keyof typeof d] as string[])
              }
              onChange={(e) => set(f.key as string, e.target.value)}
              placeholder="逗号分隔"
            />
          </Field>
        ))}
        {TEXT_FIELDS.map((f) => (
          <Field key={f.key as string} label={f.label}>
            <input
              className={inputCls}
              value={val<string>(f.key as keyof CustomRuleDetail, "") ?? ""}
              onChange={(e) => set(f.key as string, e.target.value)}
            />
          </Field>
        ))}
      </div>

      <ul className="text-xs space-y-1 border-t border-gray-100 pt-3">
        <KV k="最后更新" v={d.updated_at} />
        <KV k="更新人" v={d.updated_by ?? "—"} />
      </ul>

      <ConfirmDialog
        open={confirmDel}
        title={`删除自定义规则 ${ruleId}?`}
        description="删除后不可恢复。"
        confirmText="删除"
        busy={del.isPending}
        onConfirm={() => del.mutate()}
        onOpenChange={setConfirmDel}
      />
    </div>
  )
}

function Toggle({
  label,
  on,
  onToggle,
}: {
  label: string
  on: boolean
  onToggle: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <button
        type="button"
        onClick={() => onToggle(!on)}
        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
          on
            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
            : "bg-gray-100 text-gray-500 border-gray-200"
        }`}
      >
        {on ? "开启" : "关闭"}
      </button>
    </div>
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

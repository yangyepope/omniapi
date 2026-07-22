// AI 扫描规则详情 + 编辑面板(右侧)。
// 编辑走 dirty-map 暂存(仿 ConfigPage):字段值 = dirty 里有则取 dirty,否则取 detail;
// 保存把 dirty 里的字段(list 转数组)PUT 上去(部分更新)。父组件用 key={name} 挂载,
// 切换规则即重置 dirty。
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
  fromList,
  missingPlaceholders,
  PLACEHOLDERS,
  toList,
} from "./aiCategoryUtils"
import {
  type HuntCategoryDetail,
  type HuntCategoryUpdate,
  SecurityApi,
  scannerErrorDetail,
} from "./api"
import { useAiCategory } from "./hooks"

// 可编辑的 list 字段(逗号分隔编辑;保存时转数组)
const LIST_FIELDS: { key: keyof HuntCategoryUpdate; label: string }[] = [
  { key: "owasp_refs", label: "OWASP 参考" },
  { key: "cwes", label: "CWE" },
  { key: "asvs_chapters", label: "ASVS 章节" },
  { key: "skill_subdomains", label: "skill 子域" },
  { key: "mitre_attack_techniques", label: "MITRE ATT&CK" },
  { key: "nist_csf_subcategories", label: "NIST CSF" },
  { key: "d3fend_techniques", label: "D3FEND" },
  { key: "skill_keywords", label: "skill 关键词" },
]

const inputCls =
  "w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"

export function AiCategoryEditor({ name }: { name: string }) {
  const detailQ = useAiCategory(name)
  const qc = useQueryClient()
  const [dirty, setDirty] = useState<Record<string, unknown>>({})
  const [confirmDel, setConfirmDel] = useState(false)

  const d = detailQ.data
  const set = (k: string, v: unknown) => setDirty((s) => ({ ...s, [k]: v }))
  // 字段当前值:dirty 优先,否则取 detail。k 用具体类型(d 可能为 undefined,
  // 若写 keyof typeof d 会塌成 never)。
  const val = <T,>(k: keyof HuntCategoryDetail, fallback: T): T =>
    (k in dirty ? dirty[k as string] : (d?.[k] ?? fallback)) as T

  const save = useMutation({
    mutationFn: () => {
      const body: HuntCategoryUpdate = {}
      for (const [k, raw] of Object.entries(dirty)) {
        // list 字段:编辑器里是字符串,PUT 前转数组
        if (LIST_FIELDS.some((f) => f.key === k))
          body[k as keyof HuntCategoryUpdate] = toList(String(raw)) as never
        else body[k as keyof HuntCategoryUpdate] = raw as never
      }
      return SecurityApi.updateAiCategory(name, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "ai-categories"] })
      qc.invalidateQueries({ queryKey: ["security", "ai-category", name] })
      setDirty({})
      toast.success("已保存,扫描器将热加载生效")
    },
    onError: (err) => toast.error(`保存失败:${scannerErrorDetail(err)}`),
  })

  const del = useMutation({
    mutationFn: () => SecurityApi.deleteAiCategory(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "ai-categories"] })
      toast.success(`已删除自定义规则 ${name}`)
    },
    onError: (err) => toast.error(`删除失败:${scannerErrorDetail(err)}`),
  })

  if (detailQ.isLoading) return <LoadingBlock />
  if (detailQ.isError || !d)
    return <ErrorBlock text="加载规则详情失败(scanner 不可达?)" />

  const dirtyCount = Object.keys(dirty).length
  const isBuiltin = d.source === "builtin"
  const tmpl = val<string>("user_prompt_template", "")
  const missing = missingPlaceholders(tmpl)

  return (
    <div className="p-4 space-y-4">
      {/* 顶部:名称 + 元数据 + 保存/删除 */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-sm font-bold text-gray-900">
            {d.name}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Tag>{d.source === "builtin" ? "内置" : "自定义"}</Tag>
            {d.is_llm_category && <Tag>LLM</Tag>}
            <Tag>{d.prompt_version}</Tag>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isBuiltin && (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> 删除
            </button>
          )}
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

      {/* 启停 + LLM 开关 */}
      <div className="flex items-center gap-4">
        <Toggle
          label="启用"
          on={val<boolean>("enabled", false)}
          onToggle={(v) => set("enabled", v)}
        />
        <Toggle
          label="LLM 规则"
          on={val<boolean>("is_llm_category", false)}
          onToggle={(v) => set("is_llm_category", v)}
        />
      </div>

      {/* system_prompt:含哨兵 __TECH_STACK__,原样保留不报错 */}
      <Field label="system_prompt(哨兵 __TECH_STACK__ 原样保留)">
        <textarea
          className={`${inputCls} font-mono h-40 resize-y`}
          value={val<string>("system_prompt", "")}
          onChange={(e) => set("system_prompt", e.target.value)}
        />
      </Field>

      {/* user_prompt_template:占位符缺失警告 */}
      <Field label={`user_prompt_template(须含 ${PLACEHOLDERS.join(" ")})`}>
        <textarea
          className={`${inputCls} font-mono h-40 resize-y`}
          value={tmpl}
          onChange={(e) => set("user_prompt_template", e.target.value)}
        />
        {missing.length > 0 && (
          <p className="text-[11px] text-amber-600 mt-1">
            ⚠ 缺少占位符 {missing.join(" ")} —— 保存后扫描可能出错
          </p>
        )}
      </Field>

      {/* list 字段:逗号分隔 */}
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
      </div>

      <ul className="text-xs space-y-1 border-t border-gray-100 pt-3">
        <KV k="最后更新" v={d.updated_at} />
        <KV k="更新人" v={d.updated_by ?? "—"} />
        <KV k="排序" v={String(d.sort_order)} />
      </ul>

      <ConfirmDialog
        open={confirmDel}
        title={`删除规则 ${name}?`}
        description="删除后不可恢复(内置规则不可删,只能禁用)。"
        confirmText="删除"
        busy={del.isPending}
        onConfirm={() => del.mutate()}
        onOpenChange={setConfirmDel}
      />
    </div>
  )
}

// 启停胶囊(仿 ConfigPage bool 编辑器)
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

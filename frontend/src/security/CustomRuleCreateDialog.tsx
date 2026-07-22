// 自定义参考规则「新增」弹窗(POST /ai/custom-rules)。
// 安全区亮色套件 + Radix Dialog 原语(仿 AiCategoryCreateDialog,不用 shadcn Dialog)。
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { type CustomRuleCreate, SecurityApi, scannerErrorDetail } from "./api"
import { toList } from "./rulesUtils"

const inputCls =
  "w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"

export function CustomRuleCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  // 受控草稿:必填三项 + 常用映射字段;其余(license/level/languages)创建后再编辑
  const [ruleId, setRuleId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [cwes, setCwes] = useState("")
  const [owasp, setOwasp] = useState("")
  const [asvs, setAsvs] = useState("")
  const [severity, setSeverity] = useState("")

  const reset = () => {
    setRuleId("")
    setTitle("")
    setDescription("")
    setCwes("")
    setOwasp("")
    setAsvs("")
    setSeverity("")
  }

  const create = useMutation({
    mutationFn: (body: CustomRuleCreate) => SecurityApi.createCustomRule(body),
    onSuccess: (d) => {
      // 成功必须使列表失效,否则不刷新
      qc.invalidateQueries({ queryKey: ["security", "custom-rules"] })
      toast.success(`已新增自定义规则 ${d.rule_id}`)
      reset()
      onOpenChange(false)
    },
    onError: (err) => toast.error(`新增失败:${scannerErrorDetail(err)}`),
  })

  const canSubmit =
    ruleId.trim() && title.trim() && description.trim() && !create.isPending

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-gray-100 shadow-xl p-5 focus:outline-none max-h-[85vh] overflow-auto data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> 新增自定义参考规则
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-gray-500 mt-1">
            规则 id 唯一;填 CWE / OWASP / ASVS
            才会被对应审计类别采用。保存后下次扫描热加载生效。
          </DialogPrimitive.Description>

          <div className="mt-4 space-y-3">
            <Field label="规则 id rule_id(唯一)">
              <input
                className={`${inputCls} font-mono`}
                value={ruleId}
                onChange={(e) => setRuleId(e.target.value)}
                placeholder="my_custom_rule"
              />
            </Field>
            <Field label="标题 title">
              <input
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="描述 description(规则语料正文)">
              <textarea
                className={`${inputCls} h-28 resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="CWE" hint="逗号分隔,如 CWE-89, CWE-79">
                <input
                  className={`${inputCls} font-mono text-xs`}
                  value={cwes}
                  onChange={(e) => setCwes(e.target.value)}
                  placeholder="逗号分隔"
                />
              </Field>
              <Field label="OWASP 参考" hint="逗号分隔,如 API01:2023">
                <input
                  className={`${inputCls} font-mono text-xs`}
                  value={owasp}
                  onChange={(e) => setOwasp(e.target.value)}
                  placeholder="逗号分隔"
                />
              </Field>
              <Field label="ASVS 参考">
                <input
                  className={`${inputCls} font-mono text-xs`}
                  value={asvs}
                  onChange={(e) => setAsvs(e.target.value)}
                  placeholder="逗号分隔"
                />
              </Field>
              <Field label="严重度 severity">
                <input
                  className={inputCls}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  placeholder="如 HIGH / MEDIUM"
                />
              </Field>
            </div>
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
              onClick={() =>
                create.mutate({
                  rule_id: ruleId.trim(),
                  title: title.trim(),
                  description,
                  cwes: toList(cwes),
                  owasp_refs: toList(owasp),
                  asvs_refs: toList(asvs),
                  severity: severity.trim() || null,
                })
              }
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
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      {hint && <div className="text-[11px] text-gray-400 mb-1">{hint}</div>}
      {children}
    </div>
  )
}

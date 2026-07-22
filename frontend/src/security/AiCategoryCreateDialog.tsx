// AI 扫描规则「新增自定义」弹窗(POST /ai/categories)。
// 安全区亮色套件 + Radix Dialog 原语(不用 shadcn Dialog,避免语义 token 随 .dark 变深)。
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
// user_prompt_template 必须保留的占位符(缺失会导致扫描出错)
import { missingPlaceholders, PLACEHOLDERS } from "./aiCategoryUtils"
import { type HuntCategoryCreate, SecurityApi, scannerErrorDetail } from "./api"

const inputCls =
  "w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"

export function AiCategoryCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  // 受控草稿:仅收集必填三项 + 常用开关,其余走默认(高级字段可创建后再编辑)
  const [name, setName] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [userPrompt, setUserPrompt] = useState("")
  const [isLlm, setIsLlm] = useState(false)

  const reset = () => {
    setName("")
    setSystemPrompt("")
    setUserPrompt("")
    setIsLlm(false)
  }

  const create = useMutation({
    mutationFn: (body: HuntCategoryCreate) =>
      SecurityApi.createAiCategory(body),
    onSuccess: (d) => {
      // F-001:mutation 成功必须使相关查询失效,否则列表不刷新
      qc.invalidateQueries({ queryKey: ["security", "ai-categories"] })
      toast.success(`已新增自定义规则 ${d.name}`)
      reset()
      onOpenChange(false)
    },
    onError: (err) => toast.error(`新增失败:${scannerErrorDetail(err)}`),
  })

  // 占位符缺失只警告不阻断(用户可能有意为之),提交前给出提示
  const missing = missingPlaceholders(userPrompt)
  const canSubmit =
    name.trim() && systemPrompt.trim() && userPrompt.trim() && !create.isPending

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-gray-100 shadow-xl p-5 focus:outline-none max-h-[85vh] overflow-auto data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> 新增自定义扫描规则
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-gray-500 mt-1">
            规则名唯一(如
            my_custom_rule);保存后下次扫描热加载生效。高级维度可创建后再编辑。
          </DialogPrimitive.Description>

          <div className="mt-4 space-y-3">
            <Field label="规则名 name(唯一 id)">
              <input
                className={`${inputCls} font-mono`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my_custom_rule"
              />
            </Field>
            <Field label="system_prompt(可含哨兵 __TECH_STACK__,原样保留)">
              <textarea
                className={`${inputCls} font-mono h-28 resize-y`}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </Field>
            <Field
              label="user_prompt_template"
              hint={`必须保留占位符:${PLACEHOLDERS.join(" ")}`}
            >
              <textarea
                className={`${inputCls} font-mono h-28 resize-y`}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
              />
              {missing.length > 0 && userPrompt.trim() !== "" && (
                <p className="text-[11px] text-amber-600 mt-1">
                  ⚠ 缺少占位符 {missing.join(" ")} ——
                  扫描时可能出错,请确认是否有意去掉
                </p>
              )}
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isLlm}
                onChange={(e) => setIsLlm(e.target.checked)}
              />
              标记为 LLM 规则(仅当被扫代码用到 LLM 时才跑)
            </label>
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
                  name: name.trim(),
                  system_prompt: systemPrompt,
                  user_prompt_template: userPrompt,
                  is_llm_category: isLlm,
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

// 表单行:标签 + 可选提示 + 控件
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

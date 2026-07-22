// 接口业务画像编辑面板(项目理解 D)。dirty-map 暂存,保存 PUT /interfaces/{id}
// (部分更新)。编辑任一画像字段 scanner 自动置 human_locked=True(AI 风险分级
// 不再覆盖);想交还 AI 把「人工锁定」关掉(显式传 human_locked=false)。
// 父组件用 key={id} 挂载,切换接口即重置 dirty。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Lock, Save, Unlock } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { SectionCard } from "@/components/security/ui"
import {
  type Interface,
  type InterfaceProfileUpdate,
  SecurityApi,
  scannerErrorDetail,
} from "./api"

// 下拉枚举(与 scanner 业务语义一致)
const RISK_OPTS = ["P0", "P1", "P2"] as const
const SENSITIVITY_OPTS = [
  "public",
  "internal",
  "user-data",
  "financial",
  "admin",
] as const
const OP_TYPE_OPTS = ["read", "write", "delete", "admin"] as const

const inputCls =
  "w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"

export function InterfaceProfileEditor({ iface }: { iface: Interface }) {
  const qc = useQueryClient()
  const [dirty, setDirty] = useState<Record<string, unknown>>({})
  const set = (k: string, v: unknown) => setDirty((s) => ({ ...s, [k]: v }))
  const val = <T,>(k: keyof Interface, fallback: T): T =>
    (k in dirty ? dirty[k as string] : (iface[k] ?? fallback)) as T

  const locked = val<boolean>("human_locked", false)

  const save = useMutation({
    mutationFn: () =>
      SecurityApi.updateInterface(iface.id, dirty as InterfaceProfileUpdate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "interface", iface.id] })
      // 服务接口列表(scans 页下钻)也可能变了风险等级,按前缀失效
      qc.invalidateQueries({ queryKey: ["security", "interfaces"] })
      setDirty({})
      toast.success("已保存接口画像")
    },
    onError: (err) => toast.error(`保存失败:${scannerErrorDetail(err)}`),
  })

  const dirtyCount = Object.keys(dirty).length

  return (
    <SectionCard
      title="业务画像"
      action={
        <button
          type="button"
          disabled={dirtyCount === 0 || save.isPending}
          onClick={() => save.mutate()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {save.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          保存{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
        </button>
      }
    >
      <div className="space-y-3">
        {/* 锁定状态 + 切换 */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-gray-700">分级归属</span>
          <button
            type="button"
            onClick={() => set("human_locked", !locked)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              locked
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "bg-blue-50 text-blue-600 border-blue-200"
            }`}
          >
            {locked ? (
              <>
                <Lock className="w-3 h-3" /> 已锁定(人工)
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3" /> AI 托管
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 -mt-1">
          编辑任一画像字段会自动锁定;点上方切到「AI 托管」交还给 AI 风险分级。
        </p>

        <Field label="风险等级 risk_level">
          <select
            className={inputCls}
            value={val<string>("risk_level", "") ?? ""}
            onChange={(e) => set("risk_level", e.target.value || null)}
          >
            <option value="">未分级</option>
            {RISK_OPTS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="敏感度 sensitivity">
          <select
            className={inputCls}
            value={val<string>("sensitivity", "") ?? ""}
            onChange={(e) => set("sensitivity", e.target.value || null)}
          >
            <option value="">—</option>
            {SENSITIVITY_OPTS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="操作类型 op_type">
          <select
            className={inputCls}
            value={val<string>("op_type", "") ?? ""}
            onChange={(e) => set("op_type", e.target.value || null)}
          >
            <option value="">—</option>
            {OP_TYPE_OPTS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="业务摘要 business_summary">
          <textarea
            className={`${inputCls} h-20 resize-y`}
            value={val<string>("business_summary", "") ?? ""}
            onChange={(e) => set("business_summary", e.target.value)}
          />
        </Field>

        <Field label="描述 description">
          <textarea
            className={`${inputCls} h-20 resize-y`}
            value={val<string>("description", "") ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
      </div>
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

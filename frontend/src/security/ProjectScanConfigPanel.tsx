// 每项目扫描配置覆盖面板(IA 区 5;scanner FEAT-027 M3)。
// 仅 3 个键可按项目覆盖:AI 二次校验(bool)/ 校验严重度(逗号分隔 str)/ AI 并发(int 1-16)。
// 未覆盖时「跟随全局」(全局默认来自「全局配置」页);可保存覆盖、或恢复全局默认。
// 亮色字面类(F-004);取数 useProjectConfig,写后 invalidate(F-001);反馈走 sonner。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyBlock, LoadingBlock, SectionCard } from "@/components/security/ui"
import { type ProjectConfigItem, SecurityApi, scannerErrorDetail } from "./api"
import { useProjectConfig } from "./hooks"

// 键 → 友好文案 + 值类型(类型对齐 scanner Settings 字段,提交时按此强转)
const KEY_META: Record<
  string,
  { label: string; hint: string; type: "bool" | "int" | "str" }
> = {
  AI_ENGINE_VERIFY: {
    label: "AI 二次校验",
    hint: "对 AI 发现做二次验证以压制误报",
    type: "bool",
  },
  AI_ENGINE_VERIFY_SEVERITIES: {
    label: "校验严重度",
    hint: "逗号分隔,如 CRITICAL,HIGH,MEDIUM,LOW",
    type: "str",
  },
  AI_ENGINE_CONCURRENCY: {
    label: "AI 并发数",
    hint: "1 - 16",
    type: "int",
  },
}

const SELECT_CLS =
  "h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"

export function ProjectScanConfigPanel({ projectKey }: { projectKey: string }) {
  const cfg = useProjectConfig(projectKey)
  const qc = useQueryClient()
  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: ["security", "project-config", projectKey],
    })

  // 保存单键覆盖(PUT {updates:{key:value}});恢复 = 删该键覆盖(回退全局)
  const save = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      SecurityApi.updateProjectConfig(projectKey, updates),
    onSuccess: () => {
      invalidate()
      toast.success("已保存项目覆盖")
    },
    onError: (e) => toast.error(`保存失败:${scannerErrorDetail(e)}`),
  })
  const reset = useMutation({
    mutationFn: (k: string) =>
      SecurityApi.deleteProjectConfigKey(projectKey, k),
    onSuccess: () => {
      invalidate()
      toast.success("已恢复全局默认")
    },
    onError: (e) => toast.error(`恢复失败:${scannerErrorDetail(e)}`),
  })

  const items = cfg.data?.items ?? []
  return (
    <SectionCard title="扫描配置(项目级覆盖)" bodyClassName="p-0">
      {cfg.isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyBlock text="无可覆盖的扫描配置" />
      ) : (
        <div className="divide-y divide-gray-100">
          <div className="px-4 py-2 text-[11px] text-gray-400">
            仅以下项可按项目覆盖;未覆盖时跟随「全局配置」的默认值。
          </div>
          {items.map((it) => (
            <ConfigRow
              key={it.key}
              item={it}
              busy={save.isPending || reset.isPending}
              onSave={(v) => save.mutate({ [it.key]: v })}
              onReset={() => reset.mutate(it.key)}
            />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function ConfigRow({
  item,
  busy,
  onSave,
  onReset,
}: {
  item: ProjectConfigItem
  busy: boolean
  onSave: (value: unknown) => void
  onReset: () => void
}) {
  const meta = KEY_META[item.key] ?? {
    label: item.key,
    hint: "",
    type: "str" as const,
  }
  // 草稿从生效值起(value = 覆盖值或全局默认)
  const [draft, setDraft] = useState(String(item.value ?? ""))
  const [boolDraft, setBoolDraft] = useState(item.value === true)

  const submit = () => {
    if (meta.type === "bool") return onSave(boolDraft)
    if (meta.type === "int") {
      const n = Number(draft)
      if (!Number.isInteger(n)) {
        toast.error("请输入整数")
        return
      }
      return onSave(n)
    }
    return onSave(draft) // str:原样提交,后端按 Settings 字段校验
  }

  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {meta.label}
          </span>
          {item.is_overridden ? (
            <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
              已覆盖
            </span>
          ) : (
            <span className="text-[10px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
              跟随全局
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
          {item.key}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {meta.hint} · 全局默认:{String(item.global_default)}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {meta.type === "bool" ? (
          <select
            aria-label={meta.label}
            className={SELECT_CLS}
            value={boolDraft ? "on" : "off"}
            onChange={(e) => setBoolDraft(e.target.value === "on")}
          >
            <option value="on">开</option>
            <option value="off">关</option>
          </select>
        ) : (
          <input
            aria-label={meta.label}
            type={meta.type === "int" ? "number" : "text"}
            className={`${SELECT_CLS} w-44`}
            value={draft}
            min={meta.type === "int" ? 1 : undefined}
            max={meta.type === "int" ? 16 : undefined}
            onChange={(e) => setDraft(e.target.value)}
          />
        )}
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          保存
        </button>
        <button
          type="button"
          disabled={busy || !item.is_overridden}
          onClick={onReset}
          className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
        >
          恢复全局
        </button>
      </div>
    </div>
  )
}

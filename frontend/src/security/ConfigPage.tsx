// 扫描配置页(scanner FEAT-008 运行时配置)— 亮色主题。
// 布局:左侧分类胶囊 + 右侧配置行列表。编辑先进 dirty 暂存,顶部浮出「保存 N 项」
// 条;保存 = 单次 PUT /security/config {updates};行级「重置」= DELETE 回落 env/默认。
// 内部平台约定:凭证明文展示、明文可改,不做脱敏。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, RotateCcw, Save, SlidersHorizontal, X } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Card, PageHeader } from "@/components/security/ui"
import { OpsPanel } from "@/security/OpsPanel"
import {
  type ConfigCategory,
  type ConfigItem,
  SecurityApi,
  scannerErrorDetail,
} from "./api"
import {
  displayValue,
  editorKind,
  parseValue,
  ValueEditor,
} from "./configEditor"
import { useScannerConfig } from "./hooks"

// 分类中文标签 + 展示顺序(与 scanner config_store 的 category 一致)
const CATEGORY_META: { key: ConfigCategory; label: string; hint: string }[] = [
  {
    key: "access",
    label: "接入凭证",
    hint: "GitLab / LLM / NVD 等外部凭证与地址",
  },
  { key: "engines", label: "扫描引擎", hint: "各引擎开关、规则、超时" },
  { key: "ai", label: "AI · LLM", hint: "模型、双 pass、复核与分类" },
  { key: "resources", label: "资源限额", hint: "并发、磁盘、缓存上限" },
  {
    key: "infra",
    label: "基础设施",
    hint: "DB / 端口 / 二进制路径(多数需重启)",
  },
]

// ── 页面 ────────────────────────────────────────────────────────────

export function ScannerConfigPage() {
  const config = useScannerConfig()
  const qc = useQueryClient()
  const [category, setCategory] = useState<ConfigCategory>("access")
  const [search, setSearch] = useState("")
  // dirty: key → 编辑器当前值(bool 存 boolean,其余存字符串)
  const [dirty, setDirty] = useState<Record<string, unknown>>({})

  const items = config.data?.items ?? []
  const byCategory = useMemo(() => {
    const m = new Map<ConfigCategory, ConfigItem[]>()
    for (const meta of CATEGORY_META) m.set(meta.key, [])
    for (const it of items) m.get(it.category)?.push(it)
    return m
  }, [items])

  const visible = (byCategory.get(category) ?? []).filter((it) =>
    search ? it.key.toLowerCase().includes(search.toLowerCase()) : true,
  )

  const save = useMutation({
    mutationFn: () => {
      const updates: Record<string, unknown> = {}
      for (const [key, raw] of Object.entries(dirty)) {
        const item = items.find((i) => i.key === key)
        updates[key] = parseValue(editorKind(item?.type ?? ""), raw)
      }
      return SecurityApi.updateConfig(updates)
    },
    onSuccess: (resp) => {
      setDirty({})
      qc.invalidateQueries({ queryKey: ["security", "config"] })
      if (resp.requires_restart.length > 0) {
        toast.warning(
          `已保存 ${resp.updated.length} 项;其中 ${resp.requires_restart.join(", ")} 需重启 scanner 后完全生效`,
        )
      } else {
        toast.success(`已保存 ${resp.updated.length} 项配置,扫描器将热加载生效`)
      }
    },
    onError: (err) => toast.error(`保存失败:${scannerErrorDetail(err)}`),
  })

  const reset = useMutation({
    mutationFn: (key: string) => SecurityApi.deleteConfig(key),
    onSuccess: (_d, key) => {
      qc.invalidateQueries({ queryKey: ["security", "config"] })
      toast.success(`${key} 已重置为 env/默认值(需重启完全回落)`)
    },
    onError: () => toast.error("重置失败"),
  })

  const dirtyCount = Object.keys(dirty).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SlidersHorizontal}
        title="扫描配置"
        subtitle="gitlab-scanner 运行时配置——保存后热加载生效(标「需重启」的除外);「已覆盖」= 值来自平台而非 .env"
      />

      <OpsPanel />

      {/* 保存条(有脏值时浮出) */}
      {dirtyCount > 0 && (
        <div className="sticky top-2 z-20 flex items-center justify-between rounded-xl border border-gray-200 border-blue-200 bg-blue-50 backdrop-blur px-4 py-2.5 shadow-sm">
          <span className="text-sm text-gray-900">
            有 <b className="text-blue-600">{dirtyCount}</b> 项未保存的变更
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDirty({})}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> 放弃
            </button>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => save.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {save.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              保存变更
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左:分类胶囊 */}
        <div className="lg:col-span-1">
          <Card className="p-0 gap-0 overflow-hidden">
            <div className="px-3 py-2.5 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100 font-semibold">
              配置分类
            </div>
            {CATEGORY_META.map((meta) => {
              const count = byCategory.get(meta.key)?.length ?? 0
              const activeCat = category === meta.key
              return (
                <button
                  key={meta.key}
                  type="button"
                  onClick={() => setCategory(meta.key)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-100 transition-colors ${
                    activeCat
                      ? "bg-blue-50 border-l-2 border-l-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${activeCat ? "text-blue-600" : "text-gray-900"}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {meta.hint}
                  </div>
                </button>
              )
            })}
          </Card>
        </div>

        {/* 右:配置行 */}
        <div className="lg:col-span-3">
          <Card className="p-0 gap-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                {CATEGORY_META.find((m) => m.key === category)?.label}(
                {visible.length})
              </span>
              <input
                className="border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 max-w-[220px] focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"
                placeholder="搜索配置项…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {config.isLoading && (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> 加载配置…
              </div>
            )}
            {config.isError && (
              <div className="flex items-center justify-center h-40 text-red-600 text-sm gap-2 px-4 text-center">
                无法加载配置(scanner 不可达或未配置 admin token)
              </div>
            )}
            {!config.isLoading && !config.isError && visible.length === 0 && (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                无匹配配置项
              </div>
            )}

            {visible.map((it) => {
              const kind = editorKind(it.type)
              const isDirty = it.key in dirty
              const editorValue = isDirty
                ? dirty[it.key]
                : kind === "bool"
                  ? Boolean(it.value)
                  : displayValue(kind, it.value)
              return (
                <div
                  key={it.key}
                  className="px-4 py-3 border-b border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-2 items-center hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-gray-900">
                        {it.key}
                      </span>
                      {it.is_overridden && (
                        <span className="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                          已覆盖
                        </span>
                      )}
                      {it.requires_restart && (
                        <span className="inline-flex items-center rounded-md border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          需重启
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
                      {it.type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <ValueEditor
                        kind={kind}
                        value={editorValue}
                        dirty={isDirty}
                        onChange={(v) =>
                          setDirty((d) => ({ ...d, [it.key]: v }))
                        }
                      />
                    </div>
                    {it.is_overridden && (
                      <button
                        type="button"
                        title="重置为 env/默认值"
                        disabled={reset.isPending}
                        onClick={() => reset.mutate(it.key)}
                        className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-gray-100 disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      </div>
    </div>
  )
}

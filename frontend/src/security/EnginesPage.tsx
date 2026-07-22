// 扫描引擎页(scanner DISC-004)— 全局配置区,亮色主题。
// 引擎是插件式后端代码,前端只做:① 目录展示(来自 GET /security/engines,禁止硬编码)
// ② 每引擎参数配置(复用 /security/config,按 engine.config_keys 归拢)③ 健康/成本观测
// (按 engine_name 从 /security/cost-stats 聚合)。不做「新增引擎」——那是后端 + 装二进制。
// enabled=false / binary_present=false 的引擎照常显示并标注,不隐藏。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  Cpu,
  Loader2,
  RotateCcw,
  Save,
  TriangleAlert,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Card, PageHeader } from "@/components/security/ui"
import {
  type ConfigItem,
  type EngineItem,
  SecurityApi,
  scannerErrorDetail,
} from "./api"
import {
  displayValue,
  editorKind,
  parseValue,
  ValueEditor,
} from "./configEditor"
import { fmtNum } from "./cost/format"
import { useEngineCostStats, useEngines, useScannerConfig } from "./hooks"

// 引擎类别 → 中文标签 + 字面亮色 chip(与 badges.tsx 同语言,页面局部枚举)
const KIND_META: Record<EngineItem["kind"], { label: string; chip: string }> = {
  sast: { label: "SAST", chip: "bg-blue-50 text-blue-600 border-blue-100" },
  cve: { label: "CVE", chip: "bg-orange-50 text-orange-600 border-orange-100" },
  secrets: {
    label: "密钥",
    chip: "bg-rose-50 text-rose-600 border-rose-100",
  },
  dataflow: {
    label: "数据流",
    chip: "bg-violet-50 text-violet-600 border-violet-100",
  },
  ai: {
    label: "AI",
    chip: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
}

// 这三项 AI 引擎参数可按项目覆盖(scanner FEAT-027 M3,项目详情页「扫描配置」);
// 本页展示的是全局默认,行内提示一下。
const PROJECT_OVERRIDABLE = new Set([
  "AI_ENGINE_VERIFY",
  "AI_ENGINE_VERIFY_SEVERITIES",
  "AI_ENGINE_CONCURRENCY",
])

const SELECT_CLS =
  "h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"

// ── 类别徽章 ────────────────────────────────────────────────────────
function KindChip({ kind }: { kind: EngineItem["kind"] }) {
  const m = KIND_META[kind] ?? {
    label: kind,
    chip: "bg-gray-100 text-gray-600 border-gray-200",
  }
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${m.chip}`}
    >
      {m.label}
    </span>
  )
}

// ── 状态列:启用 / 未启用 / 缺二进制 ────────────────────────────────
function StatusCell({ engine }: { engine: EngineItem }) {
  if (!engine.binary_present) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600"
        title="缺二进制 / 客户端,运行时自动降级为 skipped"
      >
        <TriangleAlert className="w-3.5 h-3.5" />
        缺二进制
      </span>
    )
  }
  if (!engine.enabled) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />
        未启用
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
      启用
    </span>
  )
}

// ── 单引擎的配置抽屉(展开「配置」时渲染 config_keys 对应控件)──────────
function EngineConfigDrawer({
  engine,
  items,
  configLoading,
  configError,
  dirty,
  setDirty,
  onSave,
  onReset,
  saving,
  resetting,
}: {
  engine: EngineItem
  items: ConfigItem[] // 该引擎 config_keys 命中的配置项(已按顺序解析)
  configLoading: boolean
  configError: boolean
  dirty: Record<string, unknown>
  setDirty: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  onSave: (keys: string[]) => void
  onReset: (key: string) => void
  saving: boolean
  resetting: boolean
}) {
  // 本引擎有多少 key 处于 dirty(决定保存条是否浮出)
  const dirtyKeys = engine.config_keys.filter((k) => k in dirty)

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-4 py-3">
      {configLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载配置…
        </div>
      )}
      {configError && (
        <div className="text-sm text-red-600 py-4">
          无法加载配置(scanner 不可达或未配置 admin token)
        </div>
      )}
      {!configLoading && !configError && items.length === 0 && (
        <div className="text-sm text-gray-500 py-4">
          该引擎无可在此调整的参数(config_keys 为空)
        </div>
      )}

      {items.map((it) => {
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
            className="py-2.5 border-b border-gray-100 last:border-b-0 grid grid-cols-1 md:grid-cols-2 gap-2 items-center"
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
              {PROJECT_OVERRIDABLE.has(it.key) && (
                <div className="text-[11px] text-violet-500 mt-0.5">
                  可在项目页按项目覆盖(此处为全局默认)
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ValueEditor
                  kind={kind}
                  value={editorValue}
                  dirty={isDirty}
                  onChange={(v) => setDirty((d) => ({ ...d, [it.key]: v }))}
                />
              </div>
              {it.is_overridden && (
                <button
                  type="button"
                  title="重置为 env/默认值"
                  disabled={resetting}
                  onClick={() => onReset(it.key)}
                  className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )
      })}

      {dirtyKeys.length > 0 && (
        <div className="flex items-center justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={() =>
              setDirty((d) => {
                const next = { ...d }
                for (const k of dirtyKeys) delete next[k]
                return next
              })
            }
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            放弃
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(engine.config_keys)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            保存 {dirtyKeys.length} 项
          </button>
        </div>
      )}
    </div>
  )
}

// ── 页面 ────────────────────────────────────────────────────────────
export function EnginesPage() {
  const engines = useEngines()
  const config = useScannerConfig()
  const qc = useQueryClient()
  const [days, setDays] = useState(30)
  const cost = useEngineCostStats(days)
  const [expanded, setExpanded] = useState<string | null>(null)
  // dirty: 跨引擎共用一张 key→值 暂存(保存时只提交目标引擎的 key 子集)
  const [dirty, setDirty] = useState<Record<string, unknown>>({})

  // config key → ConfigItem,给引擎按 config_keys 取参数
  const configByKey = useMemo(() => {
    const m = new Map<string, ConfigItem>()
    for (const it of config.data?.items ?? []) m.set(it.key, it)
    return m
  }, [config.data])

  // engine_name → 近 N 天成本(runs/findings)
  const costByEngine = useMemo(() => {
    const m = new Map<string, { runs: number; findings: number }>()
    for (const e of cost.data?.by_engine ?? [])
      m.set(e.engine, { runs: e.runs, findings: e.findings })
    return m
  }, [cost.data])

  const save = useMutation({
    mutationFn: (keys: string[]) => {
      const updates: Record<string, unknown> = {}
      for (const key of keys) {
        if (!(key in dirty)) continue
        const item = configByKey.get(key)
        updates[key] = parseValue(editorKind(item?.type ?? ""), dirty[key])
      }
      return SecurityApi.updateConfig(updates)
    },
    onSuccess: (resp, keys) => {
      setDirty((d) => {
        const next = { ...d }
        for (const k of keys) delete next[k]
        return next
      })
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

  const items = engines.data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Cpu}
        title={`扫描引擎${items.length ? ` (${items.length})` : ""}`}
        subtitle="插件式扫描引擎目录——全局共享(不随项目)。参数复用运行时配置热加载;新增引擎是后端代码 + 装二进制,不在此。"
        actions={
          <select
            aria-label="成本时间窗"
            className={SELECT_CLS}
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value="7">近 7 天</option>
            <option value="30">近 30 天</option>
            <option value="90">近 90 天</option>
          </select>
        }
      />

      {engines.isLoading && (
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载引擎目录…
        </div>
      )}
      {engines.isError && (
        <div className="flex items-center justify-center h-40 text-red-600 text-sm gap-2 px-4 text-center">
          无法加载引擎目录(scanner 不可达或未配置 admin token)
        </div>
      )}

      {!engines.isLoading && !engines.isError && (
        <Card className="p-0 gap-0 overflow-hidden">
          {/* 表头 */}
          <div className="grid grid-cols-[1.6fr_0.7fr_0.8fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
            <span>引擎</span>
            <span>类别</span>
            <span>状态</span>
            <span>近 {days} 天</span>
            <span className="text-right">配置</span>
          </div>

          {items.map((engine) => {
            const isOpen = expanded === engine.name
            const c = costByEngine.get(engine.name)
            const dim = !engine.enabled || !engine.binary_present
            const engineItems = engine.config_keys
              .map((k) => configByKey.get(k))
              .filter((x): x is ConfigItem => Boolean(x))
            return (
              <div key={engine.name}>
                <div
                  className={`grid grid-cols-[1.6fr_0.7fr_0.8fr_1fr_auto] gap-3 px-4 py-3 border-b border-gray-100 items-center hover:bg-gray-50 ${
                    dim ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {engine.display}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono truncate">
                      {engine.name}
                      {engine.optional ? " · 可降级" : ""}
                    </div>
                  </div>
                  <div>
                    <KindChip kind={engine.kind} />
                  </div>
                  <div>
                    <StatusCell engine={engine} />
                  </div>
                  <div className="text-sm text-gray-600 tabular-nums">
                    {c ? (
                      <>
                        运行 <b className="text-gray-900">{c.runs}</b> · 发现{" "}
                        <b className="text-gray-900">{fmtNum(c.findings)}</b>
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : engine.name)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      配置
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <EngineConfigDrawer
                    engine={engine}
                    items={engineItems}
                    configLoading={config.isLoading}
                    configError={config.isError}
                    dirty={dirty}
                    setDirty={setDirty}
                    onSave={(keys) => save.mutate(keys)}
                    onReset={(key) => reset.mutate(key)}
                    saving={save.isPending}
                    resetting={reset.isPending}
                  />
                )}
              </div>
            )
          })}

          {items.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              引擎目录为空
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

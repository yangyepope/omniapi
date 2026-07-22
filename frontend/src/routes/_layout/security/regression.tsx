// /security/regression — 扫描回归对比。选一个服务的两次扫描(基线 base ↔ 当前 head),
// 按 finding 身份(id)做集合 diff:本次「新增」/ 相比基线「已修复(消失)」/「遗留」。
// 用于判断「这次提交是否引入新漏洞、修掉了哪些」。数据源:listFindings?scan_run_id=
// (某次扫描真实观测到的 findings),服务列表已按当前项目隔离,故天然限定在本项目。
import { createFileRoute, Link } from "@tanstack/react-router"
import { GitCompare, MinusCircle, PlusCircle, RotateCcw } from "lucide-react"
import { useEffect, useMemo } from "react"
import { z } from "zod"
import { SeverityBadge } from "@/components/security/badges"
import { SEVERITY_ORDER } from "@/components/security/theme"
import {
  EmptyBlock,
  LoadingBlock,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/security/ui"
import { fmtRelative } from "@/lib/format"
import type { Finding, ScanRun } from "@/security/api"
import { useRunFindings, useScanRuns, useServiceList } from "@/security/hooks"
import { ScanHubTabs } from "@/security/ScanHubTabs"

const searchSchema = z.object({
  service: z.string().optional().default(""),
  // 两次扫描 run id;0 = 未选(下拉自动补默认:最新两次)
  base: z.number().int().optional().default(0),
  head: z.number().int().optional().default(0),
})

export const Route = createFileRoute("/_layout/security/regression")({
  component: RegressionPage,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "扫描回归对比 · Security Platform" }] }),
})

const SELECT_CLS =
  "h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"

// 单次扫描下拉项文案:#id · sha8 · 状态 · 相对时间
const runLabel = (r: ScanRun) =>
  `#${r.id} · ${r.sha.slice(0, 8)} · ${r.status} · ${fmtRelative(r.started_at)}`

function RegressionPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const services = useServiceList()

  // 选中服务的最近 20 次扫描(新→旧,后端已按 started_at 倒序)
  const runsQ = useScanRuns(search.service, 20)
  const runs = useMemo(() => runsQ.data ?? [], [runsQ.data])

  // 换服务 / 首次进入:自动把 head 补为最新一次、base 补为上一次(最常见对比口径)。
  // 仅在当前 base/head 不在该服务 run 列表里时才覆盖,尊重用户手选。
  useEffect(() => {
    if (!search.service || runs.length === 0) return
    const ids = new Set(runs.map((r) => r.id))
    if (ids.has(search.head) && ids.has(search.base)) return
    const head = runs[0]?.id ?? 0
    const base = runs[1]?.id ?? runs[0]?.id ?? 0
    navigate({ search: (prev) => ({ ...prev, head, base }), replace: true })
  }, [search.service, search.base, search.head, runs, navigate])

  const setField = (key: "service" | "base" | "head", value: string) =>
    navigate({
      search: (prev) => ({
        ...prev,
        // service 变了要清掉旧的 base/head(属于别的服务),交给 effect 重补默认
        ...(key === "service"
          ? { service: value, base: 0, head: 0 }
          : { [key]: Number(value) }),
      }),
    })

  return (
    <div className="space-y-6">
      {/* 区内枢纽:「扫描」区 Tab 条(运行记录/成本明细/回归对比) */}
      <ScanHubTabs />
      <PageHeader
        icon={GitCompare}
        title="扫描回归对比"
        subtitle="选一个服务的两次扫描,对比本次新增 / 已修复 / 遗留的漏洞"
      />

      {/* 选择条:服务 + 基线 base + 当前 head */}
      <SectionCard title="对比对象">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className={SELECT_CLS}
            value={search.service}
            onChange={(e) => setField("service", e.target.value)}
          >
            <option value="">选择服务…</option>
            {(services.data ?? []).map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {search.service && (
            <>
              <RunSelect
                label="基线"
                value={search.base}
                runs={runs}
                onChange={(v) => setField("base", v)}
              />
              <RotateCcw className="w-4 h-4 text-gray-300" />
              <RunSelect
                label="当前"
                value={search.head}
                runs={runs}
                onChange={(v) => setField("head", v)}
              />
            </>
          )}
        </div>
      </SectionCard>

      {!search.service ? (
        <SectionCard>
          <EmptyBlock icon={GitCompare} text="先选择一个服务" />
        </SectionCard>
      ) : (
        <DiffView
          service={search.service}
          base={search.base}
          head={search.head}
        />
      )}
    </div>
  )
}

function RunSelect({
  label,
  value,
  runs,
  onChange,
}: {
  label: string
  value: number
  runs: ScanRun[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-500">
      {label}
      <select
        className={SELECT_CLS}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">选择扫描…</option>
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {runLabel(r)}
          </option>
        ))}
      </select>
    </label>
  )
}

// ── diff 计算与展示 ─────────────────────────────────────────────────
function DiffView({
  service,
  base,
  head,
}: {
  service: string
  base: number
  head: number
}) {
  const baseQ = useRunFindings(service, base)
  const headQ = useRunFindings(service, head)

  // 按 finding.id 做集合 diff(finding 是跨扫描去重的持久实体,id 即稳定身份)
  const diff = useMemo(() => {
    const baseItems = baseQ.data?.items ?? []
    const headItems = headQ.data?.items ?? []
    const baseIds = new Set(baseItems.map((f) => f.id))
    const headIds = new Set(headItems.map((f) => f.id))
    return {
      // 本次新增:head 有、base 无
      introduced: headItems.filter((f) => !baseIds.has(f.id)),
      // 相比基线已消失(修复/不再命中):base 有、head 无
      resolved: baseItems.filter((f) => !headIds.has(f.id)),
      // 两次都在:遗留
      persisting: headItems.filter((f) => baseIds.has(f.id)),
    }
  }, [baseQ.data, headQ.data])

  if (base === head && base !== 0)
    return (
      <SectionCard>
        <EmptyBlock
          icon={GitCompare}
          text="基线与当前是同一次扫描,请选不同的两次"
        />
      </SectionCard>
    )
  if (baseQ.isLoading || headQ.isLoading)
    return (
      <SectionCard>
        <LoadingBlock text="加载两次扫描的 findings…" />
      </SectionCard>
    )
  if (!base || !head)
    return (
      <SectionCard>
        <EmptyBlock icon={GitCompare} text="请选择基线与当前两次扫描" />
      </SectionCard>
    )

  // useRunFindings 已分页拉全量,diff 基于两次扫描的完整 finding 集合(无截断)。
  return (
    <div className="space-y-5">
      {/* 三个 KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="本次新增"
          value={diff.introduced.length}
          icon={PlusCircle}
          tone="danger"
        />
        <StatCard
          label="已修复 / 消失"
          value={diff.resolved.length}
          icon={MinusCircle}
          tone="success"
        />
        <StatCard
          label="遗留"
          value={diff.persisting.length}
          icon={RotateCcw}
          tone="warning"
        />
      </div>

      <FindingGroup
        title="本次新增(head 有 · base 无)"
        tone="danger"
        items={diff.introduced}
      />
      <FindingGroup
        title="已修复 / 消失(base 有 · head 无)"
        tone="success"
        items={diff.resolved}
      />
      <FindingGroup
        title="遗留(两次都在)"
        tone="warning"
        items={diff.persisting}
      />
    </div>
  )
}

// 单个 diff 分组:按严重度倒序,行链接到详情
function FindingGroup({
  title,
  tone,
  items,
}: {
  title: string
  tone: "danger" | "success" | "warning"
  items: Finding[]
}) {
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.severity) -
          SEVERITY_ORDER.indexOf(b.severity),
      ),
    [items],
  )
  const bar =
    tone === "danger"
      ? "border-l-red-400"
      : tone === "success"
        ? "border-l-emerald-400"
        : "border-l-amber-400"

  return (
    <SectionCard
      bodyClassName="p-0"
      title={
        <span className="text-sm font-bold text-gray-900">
          {title}{" "}
          <span className="text-gray-400 font-normal">({items.length})</span>
        </span>
      }
    >
      {items.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">无</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sorted.map((f) => (
            <li key={f.id}>
              <Link
                to="/security/findings/$id"
                params={{ id: String(f.id) }}
                className={`flex items-center gap-3 px-4 py-2.5 border-l-4 ${bar} hover:bg-gray-50 transition`}
              >
                <SeverityBadge severity={f.severity} />
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-mono text-xs truncate">
                    {f.rule_id}
                  </div>
                  <div className="text-gray-500 text-[11px] truncate">
                    {f.file_path}:{f.line_number} · {f.engine}
                  </div>
                </div>
                <span className="text-gray-400 text-[10px] whitespace-nowrap">
                  {fmtRelative(f.last_seen_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

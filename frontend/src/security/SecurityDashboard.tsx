// SecurityDashboard 安全大屏 — 亮色 Material 主题,与全站视觉一致。
// 4 区:KPI / 图表 / 分类榜+AI 复核 / 服务健康+最新发现,底部 MCP 集成。
// 支持 F11 全屏投屏。

import { Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  Bug,
  Coins,
  GaugeCircle,
  Maximize2,
  Radio,
  ShieldCheck,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ScanStatusBadge, SeverityBadge } from "@/components/security/badges"
import {
  CHART,
  SCAN_STATUS_META,
  SEVERITY_META,
  SEVERITY_ORDER,
} from "@/components/security/theme"
import {
  EmptyBlock,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/security/ui"
import { fmtDuration, fmtNum, fmtRelative } from "@/lib/format"
import type { ScanRun } from "@/security/api"
import { useCurrentProject } from "@/security/CurrentProjectProvider"
import {
  useCategories,
  useCostStats,
  useFindingReviewStats,
  useRecentFindings,
  useScanRuns,
  useServiceList,
  useStats,
  useTrend,
  useVerifierStats,
} from "@/security/hooks"
import { MCPPanel } from "@/security/MCPPanel"

// ── KPI 带 ──────────────────────────────────────────────────────────

const KpiBand = () => {
  const stats = useStats()
  const verifier = useVerifierStats()
  // 开放问题数取自 by_status.open:scanner /stats 响应只给 by_status 分组,
  // 没有独立的 open_findings 字段(finding.status 默认 "open",取值仅 open|closed)
  const open = stats.data?.by_status?.open ?? 0
  const critical = stats.data?.by_severity?.CRITICAL ?? 0
  const services = stats.data?.services_count ?? 0
  const fpRate = verifier.data
    ? `${(verifier.data.fp_suppression_rate * 100).toFixed(1)}%`
    : "—"
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="开放问题" value={open} icon={Bug} tone="brand" />
      <StatCard
        label="严重问题"
        value={critical}
        hint="仅 CRITICAL"
        icon={AlertTriangle}
        tone="danger"
      />
      <StatCard
        label="覆盖服务数"
        value={services}
        icon={ShieldCheck}
        tone="success"
      />
      <StatCard
        label="AI 误报抑制率"
        value={fpRate}
        hint={`已驳回 ${
          (verifier.data?.refuted_high ?? 0) +
          (verifier.data?.refuted_medium ?? 0)
        } / ${verifier.data?.total_ai_findings ?? 0}`}
        icon={GaugeCircle}
        tone="warning"
      />
    </div>
  )
}

// ── 图表 ────────────────────────────────────────────────────────────

const SeverityPie = () => {
  const stats = useStats()
  const data = useMemo(() => {
    const by = stats.data?.by_severity ?? {}
    return SEVERITY_ORDER.filter((s) => (by[s] ?? 0) > 0).map((s) => ({
      name: s,
      label: SEVERITY_META[s]?.label ?? s,
      value: by[s] ?? 0,
    }))
  }, [stats.data])
  if (data.length === 0) return <EmptyBlock text="无开放问题" />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={45}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={SEVERITY_META[d.name]?.hex} />
          ))}
        </Pie>
        <Tooltip contentStyle={CHART.tooltip} />
        <Legend wrapperStyle={CHART.legend} />
      </PieChart>
    </ResponsiveContainer>
  )
}

const EngineBars = () => {
  const stats = useStats()
  const data = useMemo(() => {
    const by = stats.data?.by_engine ?? {}
    return Object.entries(by)
      .map(([k, v]) => ({ engine: k, count: v }))
      .sort((a, b) => b.count - a.count)
  }, [stats.data])
  if (data.length === 0) return <EmptyBlock text="尚无引擎产出" />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
        <XAxis type="number" stroke={CHART.axis} fontSize={11} />
        <YAxis
          type="category"
          dataKey="engine"
          stroke={CHART.axis}
          fontSize={11}
          width={90}
        />
        <Tooltip contentStyle={CHART.tooltip} cursor={{ fill: "#00000008" }} />
        <Bar dataKey="count" fill={CHART.brand} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const TrendLine = () => {
  const trend = useTrend(14)
  const data = trend.data?.points ?? []
  if (data.length === 0) return <EmptyBlock text="无趋势数据" />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          stroke={CHART.axis}
          fontSize={11}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis stroke={CHART.axis} fontSize={11} />
        <Tooltip contentStyle={CHART.tooltip} />
        <Legend wrapperStyle={CHART.legend} />
        <Line
          type="monotone"
          dataKey="new"
          name="新增"
          stroke={CHART.warn}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="closed"
          name="关闭"
          stroke={CHART.positive}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="open_running_total"
          name="开放总数"
          stroke={CHART.brand}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

const CategoryList = ({ dimension }: { dimension: "owasp" | "cwe" }) => {
  const cats = useCategories(dimension)
  const items = (cats.data?.items ?? []).slice(0, 10)
  if (items.length === 0) return <EmptyBlock text="尚无数据" />
  const max = Math.max(...items.map((i) => i.open), 1)
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.key} className="text-xs">
          <div className="flex justify-between">
            <span className="text-gray-900 truncate pr-2">{it.label}</span>
            <span className="text-gray-500 tabular-nums">{it.open}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded mt-1 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded"
              style={{ width: `${(it.open / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── AI 复核质量 ─────────────────────────────────────────────────────

const ReviewQualityPanel = () => {
  const review = useFindingReviewStats()
  const d = review.data
  if (review.isLoading) return <EmptyBlock text="加载 AI 复核数据…" />
  if (!d || d.total_reviewed === 0)
    return <EmptyBlock text="尚无 AI 复核记录" />
  const engines = Object.entries(d.by_engine)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-100 py-2.5">
          <div className="text-lg font-black text-gray-900">
            {d.total_reviewed}
          </div>
          <div className="text-[10px] text-gray-500">已复核</div>
        </div>
        <div className="rounded-lg bg-amber-50 py-2.5">
          <div className="text-lg font-black text-amber-600">
            {(d.fp_rate * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-gray-500">误报率</div>
        </div>
        <div className="rounded-lg bg-emerald-50 py-2.5">
          <div className="text-lg font-black text-emerald-600">
            {d.auto_closed}
          </div>
          <div className="text-[10px] text-gray-500">自动关闭</div>
        </div>
      </div>
      <ul className="space-y-1.5">
        {engines.map(([eng, v]) => (
          <li key={eng} className="text-xs flex justify-between items-center">
            <span className="font-mono text-gray-900">{eng}</span>
            <span className="text-gray-500 tabular-nums">
              复核 {v.reviewed} · FP {v.fp} · 关闭 {v.closed}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── 成本概览 ────────────────────────────────────────────────────────
// IA 大屏要求带「成本(token/耗时汇总)」。数据源 GET /cost-stats(项目感知,
// useCostStats 无参 = 当前项目全部服务),四枚小 tile 汇总;明细下钻走扫描区成本页。

const CostSummaryPanel = () => {
  const cost = useCostStats()
  const d = cost.data
  if (cost.isLoading) return <EmptyBlock text="加载成本数据…" />
  if (!d || d.total_tokens === 0) return <EmptyBlock text="尚无成本记录" />
  const tiles = [
    { label: "总 Token", value: fmtNum(d.total_tokens), cls: "text-blue-600" },
    {
      label: "输入 Token",
      value: fmtNum(d.total_input_tokens),
      cls: "text-gray-900",
    },
    {
      label: "输出 Token",
      value: fmtNum(d.total_output_tokens),
      cls: "text-gray-900",
    },
    {
      label: "总耗时",
      value: fmtDuration(d.total_elapsed_seconds),
      cls: "text-amber-600",
    },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg bg-gray-50 py-3 px-3">
          <div className={`text-xl font-black tabular-nums ${t.cls}`}>
            {t.value}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">{t.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── 服务健康榜 ──────────────────────────────────────────────────────

const ScanHistoryBadges = ({ name }: { name: string }) => {
  const { data, isLoading } = useScanRuns(name, 3)
  if (isLoading) return <span className="text-gray-500 text-[10px]">…</span>
  const runs = (data ?? []) as ScanRun[]
  if (runs.length === 0)
    return <span className="text-gray-500 text-[10px]">无</span>
  const ordered = [...runs].reverse() // 旧→新,最右是最新
  return (
    <div className="flex items-center gap-1">
      {ordered.map((r) => {
        const meta = SCAN_STATUS_META[r.status]
        return (
          <span
            key={r.id}
            title={`#${r.id} ${r.sha.slice(0, 8)} · ${r.status} · ${fmtRelative(r.started_at)}`}
            className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-black/5"
            style={{
              background: meta?.hex ?? "#cbd5e1",
              boxShadow:
                r.status === "running" ? `0 0 6px ${meta?.hex}` : undefined,
            }}
          />
        )
      })}
      {Array.from({ length: Math.max(0, 3 - ordered.length) }).map((_, i) => (
        <span
          key={`pad-${i}`}
          className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-black/5 bg-gray-100"
        />
      ))}
    </div>
  )
}

const ServicesHealth = () => {
  const services = useServiceList()
  const list = useMemo(
    () =>
      [...(services.data ?? [])].sort(
        (a, b) => b.open_findings - a.open_findings,
      ),
    [services.data],
  )
  if (list.length === 0) return <EmptyBlock text="未注册服务" />
  return (
    <div className="overflow-auto max-h-[300px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white text-gray-500 text-xs uppercase">
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-2 font-semibold">服务</th>
            <th className="text-right py-2 px-2 font-semibold">开放</th>
            <th className="text-right py-2 px-2 font-semibold">已关</th>
            <th className="text-left py-2 px-2 font-semibold">最近 3 次</th>
            <th className="text-left py-2 px-2 font-semibold">最近扫描</th>
            <th className="text-left py-2 px-2 font-semibold">状态</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr
              key={s.name}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-2 px-2">
                <Link
                  to="/security/services/$name"
                  params={{ name: s.name }}
                  className="text-gray-900 font-medium hover:text-blue-600 hover:underline underline-offset-2"
                >
                  {s.name}
                </Link>
              </td>
              <td className="py-2 px-2 text-right text-blue-600 font-bold tabular-nums">
                {s.open_findings}
              </td>
              <td className="py-2 px-2 text-right text-gray-500 tabular-nums">
                {s.closed_findings}
              </td>
              <td className="py-2 px-2">
                <ScanHistoryBadges name={s.name} />
              </td>
              <td className="py-2 px-2 text-gray-500 text-xs">
                {s.last_scan_at ? fmtRelative(s.last_scan_at) : "—"}
              </td>
              <td className="py-2 px-2">
                {s.last_scan_status ? (
                  <ScanStatusBadge status={s.last_scan_status} />
                ) : (
                  <span className="text-gray-500 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 最新发现 ────────────────────────────────────────────────────────

const RecentFindings = () => {
  const feed = useRecentFindings(30)
  const list = feed.data?.items ?? []
  if (list.length === 0) return <EmptyBlock text="暂无最新问题" />
  return (
    <div className="overflow-auto max-h-[300px] space-y-1.5">
      {list.map((f) => (
        <Link
          key={f.id}
          to="/security/findings/$id"
          params={{ id: String(f.id) }}
          className="flex items-start gap-2 text-xs border-l-2 pl-2 py-1.5 hover:bg-gray-50 transition rounded-r"
          style={{ borderColor: SEVERITY_META[f.severity]?.hex }}
        >
          <SeverityBadge severity={f.severity} />
          <div className="flex-1 min-w-0">
            <div className="text-gray-900 truncate">{f.message}</div>
            <div className="text-gray-500 truncate">
              {f.service_name} · {f.engine} ·{" "}
              <span className="font-mono">
                {f.file_path}:{f.line_number}
              </span>
            </div>
          </div>
          <span className="text-gray-500 text-[10px] whitespace-nowrap">
            {fmtRelative(f.last_seen_at)}
          </span>
        </Link>
      ))}
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────

// ── shell ──────────────────────────────────────────────────────────

export const SecurityDashboard = () => {
  const stats = useStats()
  const { project } = useCurrentProject()
  const [now, setNow] = useState(() => new Date().toLocaleString("zh-CN"))
  // 每分钟刷新时钟,让投屏看起来"活着"(即使数据没变)
  useEffect(() => {
    const t = setInterval(
      () => setNow(new Date().toLocaleString("zh-CN")),
      60_000,
    )
    return () => clearInterval(t)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="安全大屏"
        subtitle={`${now} · 30s 自动刷新 · 最近扫描 ${
          stats.data?.last_scan_at ? fmtRelative(stats.data.last_scan_at) : "—"
        } 前`}
        actions={
          <>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mr-1">
              <Radio className="w-3.5 h-3.5" /> 实时
            </span>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" /> 全屏
            </button>
          </>
        }
      />

      {/* 空项目提示:该项目从未扫描(total=0 且无 last_scan)时,明确告知这是
          "没数据"而非页面故障,并指路——切项目 / 触发扫描。避免把空项目误当 bug。 */}
      {stats.data &&
        stats.data.total_findings === 0 &&
        !stats.data.last_scan_at && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            当前项目
            <span className="font-mono font-semibold">
              {" "}
              {project || "（未选择）"}{" "}
            </span>
            暂无扫描数据(尚未扫描过)。这不是页面故障——请在右上角项目选择器切换到有数据的项目,
            或到「服务」页对目标服务触发一次扫描。
          </div>
        )}

      {/* Zone 1 — KPI */}
      <KpiBand />

      {/* Zone 2 — 图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="严重度分布">
          <SeverityPie />
        </SectionCard>
        <SectionCard title="引擎贡献">
          <EngineBars />
        </SectionCard>
        <SectionCard title="14 天趋势">
          <TrendLine />
        </SectionCard>
      </div>

      {/* Zone 3 — 分类榜 + AI 复核 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="OWASP API Top 10">
          <CategoryList dimension="owasp" />
        </SectionCard>
        <SectionCard title="CWE Top 10">
          <CategoryList dimension="cwe" />
        </SectionCard>
        <SectionCard title="AI 复核质量">
          <ReviewQualityPanel />
        </SectionCard>
      </div>

      {/* Zone 3.5 — 成本概览(IA 要求大屏含成本汇总) */}
      <SectionCard
        title="成本概览"
        action={
          <Link
            to="/security/cost"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            明细 →
          </Link>
        }
      >
        <div className="flex items-center gap-2 mb-3 text-gray-400">
          <Coins className="w-4 h-4" />
          <span className="text-xs">AI token 用量与 wall-clock 耗时汇总</span>
        </div>
        <CostSummaryPanel />
      </SectionCard>

      {/* Zone 4 — 服务健康 + 最新发现 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="服务健康榜" bodyClassName="p-2">
          <ServicesHealth />
        </SectionCard>
        <SectionCard title="最新发现">
          <RecentFindings />
        </SectionCard>
      </div>

      {/* Zone 5 — MCP 集成 */}
      <MCPPanel />
    </div>
  )
}

export default SecurityDashboard

// /security/findings — Findings 处置收件箱。全局可筛选 / 排序 / 分页的漏洞列表,
// 补齐此前只有详情页(findings/$id)、无全局列表的缺口。筛选条件进路由 search
// params(可分享 / 刷新不丢),点行下钻详情页做 triage。数据随当前项目隔离。
import { createFileRoute, Link } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Filter, Inbox } from "lucide-react"
import { z } from "zod"
import { SeverityBadge } from "@/components/security/badges"
import { SEVERITY_ORDER } from "@/components/security/theme"
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from "@/components/security/ui"
import { fmtRelative } from "@/lib/format"
import { type Finding, scannerErrorDetail } from "@/security/api"
import { useFindingsList, useServiceList } from "@/security/hooks"

// 每页条数固定 50(后端 limit 上限 500,收件箱人工浏览 50 足够,翻页看更多)
const PAGE_SIZE = 50

// search params:空串 = 不筛选。page 1-based,进 URL 可分享 / 刷新保留。
const searchSchema = z.object({
  service: z.string().optional().default(""),
  severity: z.string().optional().default(""),
  status: z.string().optional().default(""),
  engine: z.string().optional().default(""),
  rule_prefix: z.string().optional().default(""),
  sort: z.string().optional().default("-id"),
  page: z.number().int().min(1).optional().default(1),
})

export const Route = createFileRoute("/_layout/security/findings/")({
  component: FindingsInboxPage,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Findings 收件箱 · Security Platform" }] }),
})

// 亮色原生下拉 / 输入统一样式(与 tasks 页口径一致)
const CTRL =
  "h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
const SELECT_CLS = `${CTRL} cursor-pointer`

function FindingsInboxPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const services = useServiceList()

  // 任一筛选变更:写回 search,并把页码复位到 1(换了筛选口径,旧页码无意义)
  const setFilter = (key: string, value: string) =>
    navigate({ search: (prev) => ({ ...prev, [key]: value, page: 1 }) })

  const offset = (search.page - 1) * PAGE_SIZE
  const query = useFindingsList({
    ...(search.service ? { service: search.service } : {}),
    ...(search.severity ? { severity: search.severity } : {}),
    ...(search.status ? { status: search.status } : {}),
    ...(search.engine ? { engine: search.engine } : {}),
    ...(search.rule_prefix ? { rule_prefix: search.rule_prefix } : {}),
    sort: search.sort,
    limit: PAGE_SIZE,
    offset,
  })

  const data = query.data
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const gotoPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p }) })

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Inbox}
        title="Findings 收件箱"
        subtitle="全局漏洞列表 — 按服务 / 严重度 / 状态 / 引擎筛选,点行下钻处置"
      />

      {/* 筛选条 */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" /> 筛选
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={SELECT_CLS}
            value={search.service}
            onChange={(e) => setFilter("service", e.target.value)}
          >
            <option value="">全部服务</option>
            {(services.data ?? []).map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            className={SELECT_CLS}
            value={search.severity}
            onChange={(e) => setFilter("severity", e.target.value)}
          >
            <option value="">全部severity</option>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className={SELECT_CLS}
            value={search.status}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="open">open(开放)</option>
            <option value="closed">closed(已关闭)</option>
          </select>

          <input
            className={CTRL}
            placeholder="引擎(如 ai_sonnet)"
            value={search.engine}
            onChange={(e) => setFilter("engine", e.target.value)}
          />

          <input
            className={CTRL}
            placeholder="规则前缀(如 java.)"
            value={search.rule_prefix}
            onChange={(e) => setFilter("rule_prefix", e.target.value)}
          />

          <select
            className={SELECT_CLS}
            value={search.sort}
            onChange={(e) => setFilter("sort", e.target.value)}
          >
            <option value="-id">最新优先</option>
            <option value="id">最早优先</option>
          </select>
        </div>
      </SectionCard>

      {/* 结果表 */}
      <SectionCard
        bodyClassName="p-0"
        title={
          <span className="text-sm font-bold text-gray-900">
            结果{" "}
            <span className="text-gray-400 font-normal">
              共 {total} 条{total > 0 && ` · 第 ${search.page}/${lastPage} 页`}
            </span>
          </span>
        }
        action={
          <Pagination
            page={search.page}
            lastPage={lastPage}
            disabled={query.isFetching}
            onGoto={gotoPage}
          />
        }
      >
        {query.isLoading && <LoadingBlock />}
        {query.isError && <ErrorBlock text={scannerErrorDetail(query.error)} />}
        {!query.isLoading && !query.isError && items.length === 0 && (
          <EmptyBlock text="没有符合条件的 finding" />
        )}
        {items.length > 0 && <ResultsTable items={items} />}
      </SectionCard>
    </div>
  )
}

// ── 结果表 ──────────────────────────────────────────────────────────
function ResultsTable({ items }: { items: Finding[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="text-gray-500 text-xs uppercase border-b border-gray-100">
          <tr>
            <th className="text-left py-2 px-3 font-semibold">severity</th>
            <th className="text-left py-2 px-3 font-semibold">规则 / 描述</th>
            <th className="text-left py-2 px-3 font-semibold">服务</th>
            <th className="text-left py-2 px-3 font-semibold">引擎</th>
            <th className="text-left py-2 px-3 font-semibold">位置</th>
            <th className="text-left py-2 px-3 font-semibold">状态</th>
            <th className="text-right py-2 px-3 font-semibold">最后一次</th>
          </tr>
        </thead>
        <tbody>
          {items.map((f) => (
            <tr
              key={f.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition"
            >
              <td className="py-2 px-3">
                <SeverityBadge severity={f.severity} />
              </td>
              <td className="py-2 px-3 max-w-md">
                <Link
                  to="/security/findings/$id"
                  params={{ id: String(f.id) }}
                  className="block"
                >
                  <div className="text-gray-900 font-mono text-xs truncate hover:text-blue-600">
                    {f.rule_id}
                  </div>
                  <div className="text-gray-500 text-[11px] truncate">
                    {f.message}
                  </div>
                </Link>
              </td>
              <td className="py-2 px-3 text-gray-700">{f.service_name}</td>
              <td className="py-2 px-3 text-gray-500 text-xs uppercase">
                {f.engine}
              </td>
              <td className="py-2 px-3 text-gray-500 font-mono text-[11px] truncate max-w-[220px]">
                {f.file_path}:{f.line_number}
              </td>
              <td className="py-2 px-3">
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                    f.status === "open"
                      ? "bg-blue-50 text-blue-600 border-blue-100"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  {f.status}
                </span>
              </td>
              <td className="py-2 px-3 text-right text-gray-500 text-xs whitespace-nowrap">
                {fmtRelative(f.last_seen_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 分页 ────────────────────────────────────────────────────────────
function Pagination({
  page,
  lastPage,
  disabled,
  onGoto,
}: {
  page: number
  lastPage: number
  disabled: boolean
  onGoto: (p: number) => void
}) {
  const btn =
    "inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={btn}
        disabled={disabled || page <= 1}
        onClick={() => onGoto(page - 1)}
        aria-label="上一页"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs text-gray-500 tabular-nums px-1">
        {page} / {lastPage}
      </span>
      <button
        type="button"
        className={btn}
        disabled={disabled || page >= lastPage}
        onClick={() => onGoto(page + 1)}
        aria-label="下一页"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

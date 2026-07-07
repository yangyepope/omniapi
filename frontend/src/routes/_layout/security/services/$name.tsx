// 服务详情页 — 从大屏服务健康榜下钻. 左侧 KPI(摘要 + 计数),右侧 tabs
// (扫描历史 + Findings 列表). 亮色主题.

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"
import {
  ScanStatusBadge,
  SeverityBadge,
  Tag,
} from "@/components/security/badges"
import { TriggerScanButton } from "@/components/security/TriggerScanButton"
import { SCAN_STATUS_META, stageLabel } from "@/components/security/theme"
import {
  Card,
  ConfirmDialog,
  EmptyBlock,
  LoadingBlock,
  SectionCard,
} from "@/components/security/ui"
import { type ScanRun, SecurityApi } from "@/security/api"
import {
  useScanRuns,
  useServiceFindings,
  useServiceList,
  useSourceCache,
} from "@/security/hooks"
import { ScanRunDetailPanel } from "@/security/ScanRunDetailPanel"

export const Route = createFileRoute("/_layout/security/services/$name")({
  component: ServiceDetail,
  head: () => ({ meta: [{ title: "Service · Security Platform" }] }),
})

function formatRel(iso?: string | null): string {
  if (!iso) return "—"
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "—"
  const diff = Date.now() - t
  if (diff < 60_000) return "刚刚"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return `${Math.floor(diff / 86_400_000)}d`
}

function ServiceDetail() {
  const { name } = useParams({ from: "/_layout/security/services/$name" })
  const services = useServiceList()
  const svc = services.data?.find((s) => s.name === name)
  const [tab, setTab] = useState<"history" | "findings" | "cache">("history")
  const [historyLimit, setHistoryLimit] = useState<3 | 10>(3)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          to="/security-dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" /> 返回大屏
        </Link>
        <TriggerScanButton service={name} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左:服务摘要 */}
        <div className="lg:col-span-1 space-y-3">
          <Card className="p-4 gap-0">
            <h1 className="text-lg font-black text-gray-900">{name}</h1>
            <div className="text-xs text-gray-500 mt-1">
              {svc?.language ?? "—"} · {svc?.framework ?? "—"}
            </div>
            <div className="text-xs text-gray-400 mt-1 break-all">
              {svc?.repo_url}
            </div>
          </Card>
          <Card className="p-4 gap-0">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-semibold">
              问题计数
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-900">开放</span>
              <span className="text-2xl font-black text-blue-600 tabular-nums">
                {svc?.open_findings ?? "—"}
              </span>
            </div>
            <div className="flex justify-between items-baseline mt-1">
              <span className="text-gray-900">已关</span>
              <span className="text-gray-500 tabular-nums">
                {svc?.closed_findings ?? "—"}
              </span>
            </div>
          </Card>
          <Card className="p-4 gap-0">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-semibold">
              最近扫描
            </div>
            <div className="text-sm text-gray-900">
              {formatRel(svc?.last_scan_at)}
            </div>
            <div className="mt-1.5">
              {svc?.last_scan_status ? (
                <ScanStatusBadge status={svc.last_scan_status} />
              ) : (
                <span className="text-xs text-gray-500">—</span>
              )}
            </div>
          </Card>
        </div>

        {/* 右:tabs */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 border-b border-gray-100 mb-3">
            <TabButton
              active={tab === "history"}
              onClick={() => setTab("history")}
              label="扫描历史"
            />
            <TabButton
              active={tab === "findings"}
              onClick={() => setTab("findings")}
              label="Findings"
            />
            <TabButton
              active={tab === "cache"}
              onClick={() => setTab("cache")}
              label="源码缓存"
            />
            {tab === "history" && (
              <div className="ml-auto flex items-center gap-1 text-xs">
                <span className="text-gray-500">展示</span>
                <LimitButton
                  on={historyLimit === 3}
                  onClick={() => setHistoryLimit(3)}
                >
                  3
                </LimitButton>
                <LimitButton
                  on={historyLimit === 10}
                  onClick={() => setHistoryLimit(10)}
                >
                  10
                </LimitButton>
              </div>
            )}
          </div>
          {tab === "history" ? (
            <ScanHistoryTab name={name} limit={historyLimit} />
          ) : tab === "findings" ? (
            <FindingsTab name={name} />
          ) : (
            <CacheTab name={name} />
          )}
        </div>
      </div>
    </div>
  )
}

const TabButton = ({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
      active
        ? "border-blue-300 text-blue-600"
        : "border-transparent text-gray-500 hover:text-gray-900"
    }`}
  >
    {label}
  </button>
)

const LimitButton = ({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2 py-0.5 rounded-md border border-gray-200 ${
      on
        ? "bg-blue-50 text-blue-600 border-blue-200"
        : "bg-gray-100 text-gray-500 border-transparent hover:bg-gray-100"
    }`}
  >
    {children}
  </button>
)

const ScanHistoryTab = ({ name, limit }: { name: string; limit: number }) => {
  const { data, isLoading } = useScanRuns(name, limit)
  const [expanded, setExpanded] = useState<number | null>(null)
  if (isLoading) return <LoadingBlock />
  const runs = (data ?? []) as ScanRun[]
  if (runs.length === 0)
    return (
      <SectionCard>
        <EmptyBlock text="无历史扫描。点击右上角「触发扫描」开始。" />
      </SectionCard>
    )
  const latest = runs[0]
  const latestRunning = latest.status === "running"
  return (
    <div className="space-y-3">
      {/* 当前扫描:最新 run 仍在跑时,顶部常驻实时进度面板 */}
      {latestRunning && (
        <div>
          <div className="text-xs font-semibold text-blue-600 mb-1.5">
            当前扫描 · 实时进度
          </div>
          <ScanRunDetailPanel name={name} runId={latest.id} live />
        </div>
      )}
      <div className="space-y-2">
        {runs.map((r) => {
          const color = SCAN_STATUS_META[r.status]?.hex ?? "#cbd5e1"
          const took = r.finished_at
            ? Math.round(
                (new Date(r.finished_at).getTime() -
                  new Date(r.started_at).getTime()) /
                  1000,
              )
            : null
          const isOpen = expanded === r.id
          return (
            <Card
              key={r.id}
              className="p-3 gap-0"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="flex items-center justify-between flex-wrap gap-2 text-left w-full"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-3">
                    {isOpen ? "▾" : "▸"}
                  </span>
                  <ScanStatusBadge status={r.status} />
                  <span className="text-gray-900 font-mono text-sm">
                    #{r.id}
                  </span>
                  <span className="text-gray-500 font-mono text-xs">
                    {r.sha.slice(0, 16)}
                  </span>
                  {r.resume_count > 0 && (
                    <span className="text-amber-600 text-[10px]">
                      resume×{r.resume_count}
                    </span>
                  )}
                  {r.status === "running" && r.current_stage && (
                    <span className="text-blue-600 text-[10px]">
                      · {stageLabel(r.current_stage)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(r.started_at).toLocaleString("zh-CN")}
                  {took !== null && ` · ${took}s`}
                </div>
              </button>
              {!isOpen && r.engines_completed?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.engines_completed.map((e) => (
                    <Tag key={e}>{e}</Tag>
                  ))}
                </div>
              )}
              {isOpen && (
                <div className="mt-3">
                  <ScanRunDetailPanel
                    name={name}
                    runId={r.id}
                    live={r.status === "running"}
                  />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

const FindingsTab = ({ name }: { name: string }) => {
  const findings = useServiceFindings(name, 200)
  const list = findings.data?.items ?? []
  if (list.length === 0)
    return (
      <SectionCard>
        <EmptyBlock text="无 findings。" />
      </SectionCard>
    )
  return (
    <SectionCard bodyClassName="p-0">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase border-b border-gray-100">
            <tr>
              <th className="text-left py-2.5 px-3 font-semibold">严重度</th>
              <th className="text-left py-2.5 px-2 font-semibold">引擎</th>
              <th className="text-left py-2.5 px-2 font-semibold">规则</th>
              <th className="text-left py-2.5 px-2 font-semibold">文件</th>
              <th className="text-left py-2.5 px-2 font-semibold">状态</th>
            </tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr
                key={f.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-3">
                  <Link
                    to="/security/findings/$id"
                    params={{ id: String(f.id) }}
                  >
                    <SeverityBadge severity={f.severity} />
                  </Link>
                </td>
                <td className="py-2 px-2 text-gray-500 text-xs">
                  <Link
                    to="/security/findings/$id"
                    params={{ id: String(f.id) }}
                    className="hover:text-blue-600"
                  >
                    {f.engine}
                  </Link>
                </td>
                <td className="py-2 px-2 text-gray-900 text-xs">
                  <Link
                    to="/security/findings/$id"
                    params={{ id: String(f.id) }}
                    className="hover:text-blue-600 hover:underline underline-offset-2 font-mono"
                  >
                    {f.rule_id}
                  </Link>
                </td>
                <td className="py-2 px-2 text-gray-500 text-xs font-mono">
                  <span title={f.file_path}>
                    {f.file_path.split("/").slice(-2).join("/")}:{f.line_number}
                  </span>
                </td>
                <td className="py-2 px-2 text-xs">
                  <span
                    className={
                      f.status === "open" ? "text-blue-600" : "text-gray-500"
                    }
                  >
                    {f.status}
                    {f.closed_reason ? ` (${f.closed_reason})` : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {findings.data && findings.data.total > list.length && (
          <div className="text-center text-xs text-gray-500 py-3">
            展示 {list.length} / {findings.data.total} 条
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function fmtSize(bytes: number): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

const CacheTab = ({ name }: { name: string }) => {
  const { data, isLoading } = useSourceCache(name)
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  // 待确认的破坏性操作(null = 无弹窗);受控 ConfirmDialog 替代原生 window.confirm
  const [pending, setPending] = useState<{
    sha: string
    rescan: boolean
  } | null>(null)

  const evict = useMutation({
    mutationFn: ({ sha, rescan }: { sha: string; rescan: boolean }) =>
      SecurityApi.evictSourceCache(name, sha).then(() =>
        rescan ? SecurityApi.triggerScan(name, "main", sha) : null,
      ),
    onSettled: () => {
      setBusy(null)
      qc.invalidateQueries({ queryKey: ["security", "source-cache", name] })
      qc.invalidateQueries({ queryKey: ["security", "scan-runs"] })
    },
  })

  // 点「删除 / 删除并重扫」→ 只打开确认弹窗,不立即执行
  const run = (sha: string, rescan: boolean) => setPending({ sha, rescan })

  // 用户在弹窗点确认 → 真正执行删除(+可选重扫)
  const handleConfirm = () => {
    if (!pending) return
    setBusy(pending.sha)
    evict.mutate(pending)
    setPending(null)
  }

  if (isLoading) return <LoadingBlock />
  const rows = data ?? []

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 px-1">
        已拉取到本地缓存的代码版本。删除会一并清除该 sha 的续跑标记(AI/分级),
        下次扫描从头重跑;重拉需 scanner 配置 GITLAB_ACCESS_TOKEN。
      </div>
      {rows.length === 0 ? (
        <SectionCard>
          <EmptyBlock text="无源码缓存 — 尚未拉取过代码,或已全部清除。" />
        </SectionCard>
      ) : (
        rows.map((c) => (
          <Card key={c.sha} className="p-3 gap-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-gray-900">
                  {c.sha.slice(0, 16)}
                </span>
                {c.is_last_scanned && (
                  <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
                    最近扫描
                  </span>
                )}
                {!c.ready && (
                  <span className="text-[10px] text-amber-600">未就绪</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{fmtSize(c.size_bytes)}</span>
                <span>{formatRel(c.pulled_at)}</span>
                <button
                  type="button"
                  disabled={busy === c.sha}
                  onClick={() => run(c.sha, false)}
                  className="text-red-600 hover:underline disabled:opacity-50"
                >
                  删除
                </button>
                <button
                  type="button"
                  disabled={busy === c.sha}
                  onClick={() => run(c.sha, true)}
                  className="text-blue-600 hover:underline disabled:opacity-50"
                >
                  删除并重扫
                </button>
              </div>
            </div>
          </Card>
        ))
      )}
      {/* 破坏性操作确认框:替代原生 window.confirm,文案随「是否重扫」切换 */}
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => {
          if (!o) setPending(null)
        }}
        title={pending?.rescan ? "删除缓存并重新拉取+扫描" : "删除缓存"}
        description={
          pending?.rescan
            ? `将删除 ${pending.sha.slice(0, 12)} 并重新拉取扫描;需 scanner 已配置 GITLAB_ACCESS_TOKEN 才能重拉。`
            : pending
              ? `将删除 ${pending.sha.slice(0, 12)},并清除该 sha 的续跑标记(下次扫描从头重跑)。`
              : ""
        }
        confirmText={pending?.rescan ? "删除并重扫" : "删除"}
        tone={pending?.rescan ? "brand" : "danger"}
        busy={busy !== null}
        onConfirm={handleConfirm}
      />
    </div>
  )
}

// 服务详情页 — 从大屏服务健康榜下钻. 左侧 KPI(摘要 + 计数),右侧 tabs
// (扫描历史 + Findings 列表). 亮色主题.

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  useCanGoBack,
  useParams,
  useRouter,
} from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
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
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/format"
import {
  type DastRun,
  type Finding,
  type ScanRun,
  SecurityApi,
  scannerErrorDetail,
} from "@/security/api"
import {
  useDastRuns,
  useScanRuns,
  useServiceEngineCounts,
  useServiceFindingRuns,
  useServiceFindings,
  useServiceList,
  useSourceCache,
} from "@/security/hooks"
import { KnowledgePanel } from "@/security/KnowledgePage"
import { ProjectUnderstandingPanel } from "@/security/ProjectUnderstandingPanel"
import { ScanRunDetailPanel } from "@/security/ScanRunDetailPanel"
import { ServiceInterfacesPanel } from "@/security/ServiceInterfacesPanel"
import { SystemProfilePanel } from "@/security/SystemProfilePanel"

export const Route = createFileRoute("/_layout/security/services/$name")({
  component: ServiceDetail,
  head: () => ({ meta: [{ title: "Service · Security Platform" }] }),
})

function ServiceDetail() {
  const { name } = useParams({ from: "/_layout/security/services/$name" })
  const services = useServiceList()
  const svc = services.data?.find((s) => s.name === name)
  const [tab, setTab] = useState<
    | "history"
    | "findings"
    | "interfaces"
    | "systemprofile"
    | "knowledge"
    | "understanding"
    | "dast"
    | "cache"
  >("history")
  const [historyLimit, setHistoryLimit] = useState<3 | 10>(3)
  // 返回上一步:优先走历史(从哪进来回哪去),无历史(直接粘贴 URL)兜底回大屏
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const goBack = () =>
    canGoBack
      ? router.history.back()
      : router.navigate({ to: "/security-dashboard" })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
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
              {fmtRelative(svc?.last_scan_at)}
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
              active={tab === "interfaces"}
              onClick={() => setTab("interfaces")}
              label="接口"
            />
            <TabButton
              active={tab === "systemprofile"}
              onClick={() => setTab("systemprofile")}
              label="系统画像"
            />
            <TabButton
              active={tab === "knowledge"}
              onClick={() => setTab("knowledge")}
              label="业务知识"
            />
            <TabButton
              active={tab === "understanding"}
              onClick={() => setTab("understanding")}
              label="项目理解"
            />
            <TabButton
              active={tab === "dast"}
              onClick={() => setTab("dast")}
              label="DAST"
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
          ) : tab === "interfaces" ? (
            <ServiceInterfacesPanel name={name} />
          ) : tab === "systemprofile" ? (
            <SystemProfilePanel service={name} />
          ) : tab === "knowledge" ? (
            <KnowledgePanel service={name} />
          ) : tab === "understanding" ? (
            <ProjectUnderstandingPanel name={name} />
          ) : tab === "dast" ? (
            <DastTab name={name} project={svc?.project} />
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
                  {fmtDateTime(r.started_at)}
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

// Findings 标签:全引擎口径(总数与左侧 KPI「开放」、扫描历史一致)。顶部引擎筛选
// chip:「全部」+ 各引擎,数字为 open 命中数(各引擎 open 之和 = KPI 开放数,对得上)。
// 默认选中 AI 引擎(平台以 AI 分析为主),可点其他引擎切换。只展示 open findings。
const FindingsTab = ({ name }: { name: string }) => {
  const counts = useServiceEngineCounts(name)
  const engines = counts.data?.items ?? []
  // 默认选 AI(引擎 key 以 ai 开头);无 AI 则退回「全部」
  const aiKey = engines.find((e) => e.key.startsWith("ai"))?.key
  // sel=null 表示用户未手动选,采用默认;选过之后固定用户选择
  const [sel, setSel] = useState<string | null>(null)
  const active = sel ?? aiKey ?? "all"
  // 扫描批次筛选:null=全部(不按 run 过滤);数字=只看该次扫描产出的 finding。
  const [selRun, setSelRun] = useState<number | null>(null)
  // 扫描批次 pill:最近 3 次真实产出 finding 的扫描,计数随当前引擎筛选联动。
  const runs = useServiceFindingRuns(name, {
    engine: active === "all" ? undefined : active,
  })
  const runItems = runs.data ?? []
  const findings = useServiceFindings(name, {
    engine: active === "all" ? undefined : active,
    scan_run_id: selRun ?? undefined,
  })
  const list = findings.data?.items ?? []
  const totalOpen = engines.reduce((s, e) => s + e.open, 0)

  return (
    <div className="space-y-3">
      {/* 引擎筛选 chip:全部 + 各引擎(数字=open,之和=左侧 KPI 开放数) */}
      <div className="flex flex-wrap gap-2">
        <EnginePill on={active === "all"} onClick={() => setSel("all")}>
          <span className="text-sm font-semibold">全部</span>
          <span className="text-xs text-gray-500 tabular-nums">
            {totalOpen} 开放
          </span>
        </EnginePill>
        {engines.map((e) => (
          <EnginePill
            key={e.key}
            on={active === e.key}
            onClick={() => setSel(e.key)}
          >
            <span className="text-sm font-semibold">{e.label || e.key}</span>
            <span className="text-xs text-gray-500 tabular-nums">
              {e.open} 开放
            </span>
          </EnginePill>
        ))}
      </div>

      {/* 扫描批次筛选 chip:全部 + 最近若干次扫描(有产出的 + 已完成的)。数字=该次
          去重产出,零产出显示 0(置灰)。与引擎 chip 组合过滤:选引擎 + 选批次 = 该
          引擎在该次扫描的产出。编号与「扫描历史」对齐(含刚扫完零产出的最新批次)。 */}
      {runItems.length > 0 && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 mr-0.5">按扫描批次</span>
            <EnginePill on={selRun === null} onClick={() => setSelRun(null)}>
              <span className="text-sm font-semibold">全部</span>
            </EnginePill>
            {runItems.map((r) => (
              <EnginePill
                key={r.scan_run_id}
                on={selRun === r.scan_run_id}
                onClick={() => setSelRun(r.scan_run_id)}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <ScanStatusBadge status={r.status} />#{r.scan_run_id}
                </span>
                <span
                  className={`text-xs tabular-nums ${
                    r.count === 0 ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {r.count} 条 · {fmtDate(r.started_at)}
                </span>
              </EnginePill>
            ))}
          </div>
          {/* 数字是「单次去重产出」,不是累计;开放总数以上方引擎 chip 为准 */}
          <p className="text-[11px] text-gray-400 pl-0.5">
            数字为该次扫描去重产出,非累计;开放总数见上方引擎筛选
          </p>
        </div>
      )}

      {/* 四态:loading / empty / success */}
      {findings.isLoading ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <SectionCard>
          <EmptyBlock text="无开放 findings。" />
        </SectionCard>
      ) : (
        <>
          <FindingsTable items={list} />
          {findings.data && findings.data.total > list.length && (
            <div className="text-xs text-gray-500 px-1">
              共 {findings.data.total} 条开放,本页展示 {list.length} 条
            </div>
          )}
        </>
      )}
    </div>
  )
}

// 引擎筛选的一枚 chip
const EnginePill = ({
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
    className={`flex flex-col items-start px-3 py-1.5 rounded-lg border text-left transition ${
      on
        ? "bg-blue-50 border-blue-300 text-blue-700"
        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
    }`}
  >
    {children}
  </button>
)

// 单个分组的 findings 表格(按扫描分组后复用)
const FindingsTable = ({ items }: { items: Finding[] }) => (
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
          {items.map((f) => (
            <tr
              key={f.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-2 px-3">
                <Link to="/security/findings/$id" params={{ id: String(f.id) }}>
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
    </div>
  </SectionCard>
)

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
                <span>{fmtRelative(c.pulled_at)}</span>
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

// DAST 标签(scanner FEAT-033~036):某服务的动态扫描历史 + 触发按钮。
// DAST 会真的去打运行中的目标,故触发走二次确认;未授权目标由 scanner 落
// 一条 skipped run(带原因),前端如实展示,不当成失败也不藏。
const DAST_STATUS_HEX: Record<DastRun["status"], string> = {
  running: "#3b82f6", // 蓝:进行中
  completed: "#10b981", // 绿:完成
  failed: "#ef4444", // 红:失败
  skipped: "#f59e0b", // 琥珀:被授权门跳过(非错误)
}

const DastTab = ({ name, project }: { name: string; project?: string }) => {
  const { data, isLoading } = useDastRuns(name, project)
  const qc = useQueryClient()
  // 二次确认弹窗开合:DAST 主动打目标,不做静默触发
  const [confirming, setConfirming] = useState(false)

  const trigger = useMutation({
    mutationFn: () => SecurityApi.triggerDast(name, project),
    onSuccess: (res) => {
      // accepted=true 只代表已受理并落 run;是否真扫由 scanner scope 门决定
      toast.success(`已受理 DAST:${res.service}(状态见下方列表)`)
      qc.invalidateQueries({ queryKey: ["security", "dast-runs", name] })
      setConfirming(false)
    },
    onError: (err) => toast.error(`触发 DAST 失败:${scannerErrorDetail(err)}`),
  })

  if (isLoading) return <LoadingBlock />
  const runs = data?.items ?? []
  const running = runs.some((r) => r.status === "running")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-gray-500">
          带外动态扫描(nuclei / ZAP 等)。仅对授权范围内(scanner
          DAST_SCOPE_ALLOWLIST)的运行目标发起;越界目标会落一条 skipped 记录。
        </div>
        <button
          type="button"
          disabled={trigger.isPending || running}
          onClick={() => setConfirming(true)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {running ? "DAST 进行中…" : "触发 DAST"}
        </button>
      </div>

      {runs.length === 0 ? (
        <SectionCard>
          <EmptyBlock text="无 DAST 记录。需 scanner 侧 DAST_ENABLED=true 且目标在 DAST_SCOPE_ALLOWLIST 内;点右上角「触发 DAST」开始。" />
        </SectionCard>
      ) : (
        <div className="space-y-2">
          {runs.map((r) => {
            const took =
              r.finished_at && r.started_at
                ? Math.round(
                    (new Date(r.finished_at).getTime() -
                      new Date(r.started_at).getTime()) /
                      1000,
                  )
                : null
            return (
              <Card
                key={r.id}
                className="p-3 gap-0"
                style={{ borderLeft: `3px solid ${DAST_STATUS_HEX[r.status]}` }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: DAST_STATUS_HEX[r.status] }}
                    >
                      {r.status}
                    </span>
                    <span className="text-gray-900 font-mono text-sm">
                      #{r.id}
                    </span>
                    {r.target_url && (
                      <span
                        className="text-gray-500 font-mono text-xs truncate max-w-[22rem]"
                        title={r.target_url}
                      >
                        {r.target_url}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {r.findings_total} 命中
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {fmtDateTime(r.started_at)}
                    {took !== null && ` · ${took}s`}
                    {r.triggered_by && ` · ${r.triggered_by}`}
                  </div>
                </div>
                {/* skipped:把授权门给的原因显式摆出来,别让人以为白跑了 */}
                {r.status === "skipped" && r.skip_reason && (
                  <div className="mt-2 text-[11px] text-amber-600">
                    跳过原因:{r.skip_reason}
                  </div>
                )}
                {r.engines?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.engines.map((e) => (
                      <Tag key={e.engine}>
                        {e.engine} · {e.status}
                        {typeof e.findings === "number"
                          ? ` (${e.findings})`
                          : ""}
                      </Tag>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* 二次确认:DAST 会主动向目标发包,确认后才下发 */}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="确认触发 DAST 扫描"
        description={
          <>
            将对服务{" "}
            <span className="font-mono font-semibold text-gray-900">
              {name}
            </span>{" "}
            的运行目标发起带外动态扫描(主动发包)。目标不在 scanner
            授权范围内时会落一条 skipped 记录而非真正扫描。
          </>
        }
        confirmText="触发 DAST"
        tone="brand"
        busy={trigger.isPending}
        onConfirm={() => trigger.mutate()}
      />
    </div>
  )
}

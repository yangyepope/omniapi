// Finding 详情 — 从任意 finding 行下钻. 完整描述 + AI verifier 推理 + 源位置 +
// 时间线 + triage 面板(fp/fixed/wontfix/suppressed/reopen). 亮色主题.
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  useCanGoBack,
  useParams,
  useRouter,
} from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  ExternalLink,
  Loader2,
  ShieldCheck,
  ShieldX,
} from "lucide-react"
import { useState } from "react"
import { SeverityBadge } from "@/components/security/badges"
import { SEVERITY_META } from "@/components/security/theme"
import { Card, KV, SectionCard } from "@/components/security/ui"
import { fmtDateTime } from "@/lib/format"
import { SecurityApi, type TriageAction } from "@/security/api"
import { useFinding } from "@/security/hooks"

export const Route = createFileRoute("/_layout/security/findings/$id")({
  component: FindingDetailPage,
  head: () => ({ meta: [{ title: "Finding · Security Platform" }] }),
})

function FindingDetailPage() {
  const { id: idStr } = useParams({ from: "/_layout/security/findings/$id" })
  const id = Number(idStr)
  const { data: f, isLoading, error } = useFinding(id)
  // 返回上一步:优先走浏览器/路由历史(从哪进来回哪去),没有历史时(直接粘贴 URL 打开)兜底回大屏
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const goBack = () =>
    canGoBack
      ? router.history.back()
      : router.navigate({ to: "/security-dashboard" })

  if (isLoading)
    return (
      <Center>
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </Center>
    )
  if (error || !f)
    return (
      <Center>
        <div className="text-gray-500">未找到该 finding (id={id})</div>
      </Center>
    )

  const sevColor = SEVERITY_META[f.severity]?.hex ?? "#64748b"
  const verifier = f.verifier

  return (
    <div className="space-y-5">
      {/* 顶栏 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <Link
          to="/security/services/$name"
          params={{ name: f.service_name }}
          className="text-sm text-gray-500 hover:text-blue-600"
        >
          {f.service_name} 服务详情 →
        </Link>
      </div>

      {/* Header */}
      <Card
        className="p-5 gap-0"
        style={{ borderLeft: `4px solid ${sevColor}` }}
      >
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <SeverityBadge severity={f.severity} />
          <span className="text-xs text-gray-500 uppercase">{f.engine}</span>
          {f.cwe_id && (
            <a
              href={`https://cwe.mitre.org/data/definitions/${f.cwe_id.replace(/^CWE-/i, "").trim()}.html`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              {f.cwe_id} <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {f.cve_id && (
            <a
              href={`https://nvd.nist.gov/vuln/detail/${f.cve_id}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-amber-600 hover:underline flex items-center gap-1"
            >
              {f.cve_id} <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <span
            className={`ml-auto inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${
              f.status === "open"
                ? "bg-blue-50 text-blue-600 border-blue-100"
                : "bg-gray-100 text-gray-500 border-gray-200"
            }`}
          >
            {f.status}
            {f.closed_reason ? ` · ${f.closed_reason}` : ""}
          </span>
        </div>
        <div className="text-base text-gray-900 font-mono break-all">
          {f.rule_id}
        </div>
        <div className="text-xs text-gray-500 font-mono mt-1 break-all">
          {f.file_path}:{f.line_number}
        </div>
      </Card>

      {/* 两栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title="问题描述">
            <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
              {f.message}
            </p>
          </SectionCard>

          {verifier && (
            <SectionCard
              title="AI Verifier 推理"
              action={
                verifier.refuted ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <ShieldCheck className="w-3.5 h-3.5" /> refuted · 误报已抑制
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <ShieldX className="w-3.5 h-3.5" /> confirmed ·{" "}
                    {verifier.confidence} confidence
                  </span>
                )
              }
            >
              <div className="flex items-start gap-3">
                <Bot className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {verifier.reason}
                </p>
              </div>
            </SectionCard>
          )}

          {(f.raw_output?.interface_label ||
            f.raw_output?.interface_handler) && (
            <SectionCard title="接口上下文">
              <ul className="text-sm space-y-1.5">
                {f.raw_output.interface_label && (
                  <KV k="入口" v={String(f.raw_output.interface_label)} />
                )}
                {f.raw_output.interface_handler && (
                  <KV
                    k="Handler"
                    v={String(f.raw_output.interface_handler)}
                    mono
                  />
                )}
                {f.raw_output.category && (
                  <KV k="OWASP 类目" v={String(f.raw_output.category)} />
                )}
              </ul>
              {f.raw_output.scope_truncated && (
                <div className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  扫描时上下文被截断 — AI 可能未看到完整调用链
                </div>
              )}
            </SectionCard>
          )}

          <SectionCard title="原始输出 (raw_output)">
            <pre className="text-[11px] text-gray-500 leading-relaxed overflow-auto max-h-[400px] bg-gray-100 p-3 rounded-lg font-mono">
              {JSON.stringify(f.raw_output, null, 2)}
            </pre>
          </SectionCard>
        </div>

        {/* 右栏 */}
        <div className="space-y-4">
          <TriagePanel finding={f} />

          <SectionCard title="时间线">
            <ul className="text-xs space-y-1.5">
              <KV k="首次发现" v={fmtDateTime(f.first_seen_at)} />
              <KV k="最后一次" v={fmtDateTime(f.last_seen_at)} />
              <KV k="首见 SHA" v={f.first_seen_sha.slice(0, 12)} mono />
              <KV k="末见 SHA" v={f.last_seen_sha.slice(0, 12)} mono />
              {f.closed_at && (
                <>
                  <KV k="关闭时间" v={fmtDateTime(f.closed_at)} />
                  {f.closed_by && <KV k="关闭人" v={f.closed_by} />}
                  {f.closed_note && <KV k="关闭备注" v={f.closed_note} />}
                </>
              )}
            </ul>
          </SectionCard>

          <SectionCard title="元数据">
            <ul className="text-xs space-y-1.5">
              <KV k="ID" v={String(f.id)} mono />
              <KV k="服务" v={f.service_name} />
              <KV k="引擎" v={f.engine} />
              {f.interface_id !== null && (
                <KV k="Interface ID" v={String(f.interface_id)} />
              )}
              {f.finding_group_id !== null && (
                <KV k="同组 finding" v={`group ${f.finding_group_id}`} />
              )}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

// ── triage 面板 ─────────────────────────────────────────────────────

function TriagePanel({
  finding,
}: {
  finding: { id: number; status: string; closed_reason: string | null }
}) {
  const qc = useQueryClient()
  const [reason, setReason] = useState("")
  const [pendingAction, setPendingAction] = useState<TriageAction | null>(null)
  const triage = useMutation({
    mutationFn: ({
      action,
      reason,
    }: {
      action: TriageAction
      reason?: string
    }) => SecurityApi.triageFinding(finding.id, action, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "finding", finding.id] })
      qc.invalidateQueries({ queryKey: ["security", "findings"] })
      qc.invalidateQueries({ queryKey: ["security", "stats"] })
      setPendingAction(null)
      setReason("")
    },
  })

  const submit = (action: TriageAction, needsReason: boolean) => {
    if (needsReason && !reason.trim()) {
      setPendingAction(action)
      return
    }
    triage.mutate({ action, reason: reason.trim() || undefined })
  }

  if (finding.status === "closed") {
    return (
      <SectionCard title="Triage">
        <p className="text-xs text-gray-500 mb-3">
          状态:{finding.closed_reason ?? "closed"}。如果是误判可以重开。
        </p>
        <button
          type="button"
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          disabled={triage.isPending}
          onClick={() => triage.mutate({ action: "reopen" })}
        >
          {triage.isPending ? "处理中…" : "重新打开"}
        </button>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Triage">
      <p className="text-xs text-gray-500 mb-3">
        标记后 AI 在下次扫描时会读取此结论(#177 fp 反馈回路)。
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="说明理由(标 fp 时必填,例如 'CSRF 已被 Spring Security 全局过滤器拦截')"
        rows={3}
        className="w-full text-xs bg-white border border-gray-200 rounded-md p-2 text-gray-900 mb-3 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"
      />
      <div className="grid grid-cols-2 gap-2">
        <TriageBtn
          label="误报 (FP)"
          pending={triage.isPending && pendingAction === "fp"}
          onClick={() => submit("fp", true)}
          tone="amber"
        />
        <TriageBtn
          label="已修复"
          pending={triage.isPending && pendingAction === "fixed"}
          onClick={() => submit("fixed", false)}
          tone="green"
        />
        <TriageBtn
          label="不修(wontfix)"
          pending={triage.isPending && pendingAction === "wontfix"}
          onClick={() => submit("wontfix", false)}
          tone="slate"
        />
        <TriageBtn
          label="抑制"
          pending={triage.isPending && pendingAction === "suppressed"}
          onClick={() => submit("suppressed", false)}
          tone="slate"
        />
      </div>
      {pendingAction === "fp" && !reason.trim() && (
        <div className="text-[11px] text-amber-600 mt-2">
          标记误报需要填写理由 — AI 会用这条理由学习
        </div>
      )}
      {triage.isSuccess && (
        <div className="text-[11px] text-emerald-600 mt-2 flex items-center gap-1">
          <Check className="w-3 h-3" /> 已更新
        </div>
      )}
      {triage.isError && (
        <div className="text-[11px] text-red-600 mt-2">
          失败:{(triage.error as Error)?.message ?? "未知错误"}
        </div>
      )}
    </SectionCard>
  )
}

const TriageBtn = ({
  label,
  pending,
  onClick,
  tone,
}: {
  label: string
  pending: boolean
  onClick: () => void
  tone: "amber" | "green" | "slate"
}) => {
  const tones: Record<string, string> = {
    amber: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
    green:
      "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    slate: "bg-gray-100 border-transparent text-gray-900 hover:bg-gray-100",
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`px-3 py-1.5 rounded-md text-xs font-medium border border-gray-200 transition-colors ${tones[tone]} disabled:opacity-50`}
    >
      {pending ? "…" : label}
    </button>
  )
}

const Center = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    {children}
  </div>
)

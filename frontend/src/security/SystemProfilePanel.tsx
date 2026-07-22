// 系统画像面板(系统级视图)——服务详情页的一个 Tab。
// 四维:系统框架(派生)/ 暴露面(引用接口)/ 技术流程(拓扑+AI 关键流)/
// 风险点(引用 finding,链到详情)+ AI 叙述。顶部支持「重新生成」(刷新聚合+叙述)。
// 无画像(404)→ 提示先扫描;画像由扫描流水线末尾的 system_profile 阶段自动生成。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  Boxes,
  Cpu,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Target,
} from "lucide-react"
import { toast } from "sonner"
import {
  MethodBadge,
  RiskBadge,
  SeverityBadge,
  Tag,
} from "@/components/security/badges"
import { SEVERITY_ORDER } from "@/components/security/theme"
import { EmptyBlock, LoadingBlock, SectionCard } from "@/components/security/ui"
import { fmtDateTime, fmtNum } from "@/lib/format"
import { SecurityApi, type SystemProfile, scannerErrorDetail } from "./api"
import { useCurrentProject } from "./CurrentProjectProvider"
import { useSystemProfile } from "./hooks"

function isNotFound(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 404
}

export function SystemProfilePanel({ service }: { service: string }) {
  const { project } = useCurrentProject()
  const profile = useSystemProfile(service)
  const qc = useQueryClient()

  const regenerate = useMutation({
    mutationFn: () => SecurityApi.regenerateSystemProfile(service, project),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["security", "system-profile", service],
      })
      toast.success("系统画像已重新生成")
    },
    onError: (err) => toast.error(`重新生成失败:${scannerErrorDetail(err)}`),
  })

  if (profile.isLoading) return <LoadingBlock text="加载系统画像…" />

  if (profile.isError) {
    if (isNotFound(profile.error)) {
      return (
        <SectionCard>
          <EmptyBlock text="尚无系统画像 — 请先对该服务完成一次扫描,画像会在扫描末尾自动生成。" />
        </SectionCard>
      )
    }
    return (
      <SectionCard>
        <EmptyBlock
          text={`无法加载系统画像:${scannerErrorDetail(profile.error)}`}
        />
      </SectionCard>
    )
  }

  const p = profile.data as SystemProfile

  return (
    <div className="space-y-4">
      {/* 头部:sha / 生成时间 / 模型 + 重新生成 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-gray-500">
          <span className="font-mono text-gray-700">{p.sha.slice(0, 12)}</span>
          {" · 生成于 "}
          {fmtDateTime(p.generated_at)}
          {p.model ? ` · ${p.model}` : ""}
        </div>
        <button
          type="button"
          disabled={regenerate.isPending}
          onClick={() => regenerate.mutate()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          {regenerate.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          重新生成
        </button>
      </div>

      {/* AI 叙述 */}
      {p.narrative && (
        <SectionCard title="系统概述">
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {p.narrative}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FrameworkCard fw={p.framework} />
        <SurfaceCard surface={p.surface} />
      </div>

      <FlowCard flow={p.flow} />
      <ReconCard recon={p.recon} />
      <RiskCard risks={p.risks} />
    </div>
  )
}

// ── 系统框架 ────────────────────────────────────────────────────────
function FrameworkCard({ fw }: { fw: SystemProfile["framework"] }) {
  const deps = fw.key_dependencies ?? []
  const layers = fw.layers ?? []
  return (
    <SectionCard title={<TitleWithIcon icon={Cpu} text="系统框架" />}>
      <dl className="space-y-1.5 text-sm">
        <Row k="框架">
          {fw.framework ?? "—"}
          {fw.framework_version ? (
            <span className="text-gray-400"> · {fw.framework_version}</span>
          ) : null}
        </Row>
        <Row k="主语言">{fw.primary_language ?? "—"}</Row>
        <Row k="构建工具">{fw.build_tool ?? "—"}</Row>
        <Row k="语言分布">
          <span className="flex flex-wrap gap-1">
            {(fw.languages ?? []).length === 0 ? (
              <span className="text-gray-400">—</span>
            ) : (
              (fw.languages ?? []).map((l) => (
                <Tag key={l.language}>
                  {l.language} · {l.file_count}
                </Tag>
              ))
            )}
          </span>
        </Row>
      </dl>

      {layers.length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> 架构分层
          </div>
          <div className="space-y-1">
            {layers.map((l) => (
              <div
                key={l.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-700 font-medium">{l.name}</span>
                <span className="text-gray-400 font-mono truncate max-w-[60%]">
                  {l.packages.join(", ") || "—"} · {l.file_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {deps.length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
            关键依赖
          </div>
          <div className="flex flex-wrap gap-1">
            {deps
              .filter((d) => d.key)
              .slice(0, 20)
              .map((d) => (
                <span
                  key={`${d.group}:${d.name}`}
                  className="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-mono text-blue-600"
                >
                  {d.name}
                  {d.version ? `:${d.version}` : ""}
                </span>
              ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ── 暴露面 ──────────────────────────────────────────────────────────
function SurfaceCard({ surface }: { surface: SystemProfile["surface"] }) {
  const byRisk = surface.by_risk ?? {}
  const byMethod = surface.by_method ?? {}
  const sensitive = surface.sensitive_interface_ids ?? []
  return (
    <SectionCard title={<TitleWithIcon icon={Boxes} text="暴露面" />}>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-black text-blue-600 tabular-nums">
          {fmtNum(surface.total_endpoints ?? 0)}
        </span>
        <span className="text-sm text-gray-500">个接口</span>
      </div>

      <div className="space-y-2 text-sm">
        <Row k="风险分布">
          <span className="flex flex-wrap gap-1.5 items-center">
            {["P0", "P1", "P2"].map((r) =>
              byRisk[r] ? (
                <span key={r} className="inline-flex items-center gap-1">
                  <RiskBadge risk={r} />
                  <span className="text-gray-500 tabular-nums">
                    {byRisk[r]}
                  </span>
                </span>
              ) : null,
            )}
            {byRisk.unclassified ? (
              <span className="text-xs text-gray-400">
                未分级 {byRisk.unclassified}
              </span>
            ) : null}
          </span>
        </Row>
        <Row k="方法分布">
          <span className="flex flex-wrap gap-1">
            {Object.entries(byMethod).map(([m, n]) => (
              <span key={m} className="inline-flex items-center gap-1">
                <MethodBadge method={m} />
                <span className="text-gray-500 text-xs tabular-nums">{n}</span>
              </span>
            ))}
          </span>
        </Row>
        <Row k="敏感接口">
          <span className="text-gray-900 tabular-nums">{sensitive.length}</span>
          <span className="text-gray-400 text-xs"> (见「接口」标签下钻)</span>
        </Row>
        <Row k="出站 / Feign">
          <span className="text-gray-900 tabular-nums">
            {surface.outbound_count ?? 0} / {surface.feign_count ?? 0}
          </span>
        </Row>
      </div>
    </SectionCard>
  )
}

// ── 技术流程 ────────────────────────────────────────────────────────
function FlowCard({ flow }: { flow: SystemProfile["flow"] }) {
  const keyFlows = flow.key_flows ?? []
  const outbound = flow.outbound ?? []
  const feign = flow.feign ?? []
  return (
    <SectionCard title={<TitleWithIcon icon={GitBranch} text="技术流程" />}>
      {keyFlows.length === 0 && outbound.length === 0 && feign.length === 0 ? (
        <EmptyBlock text="无出站调用 / 关键流(单体或未解析到跨服务调用)" />
      ) : (
        <div className="space-y-4">
          {keyFlows.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                关键请求流(AI)
              </div>
              {keyFlows.map((f) => (
                <div
                  key={f.name}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-2.5"
                >
                  <div className="text-sm font-semibold text-gray-900">
                    {f.name}
                  </div>
                  {f.narrative && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {f.narrative}
                    </div>
                  )}
                  {f.steps.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-gray-600">
                      {f.steps.map((s, i) => (
                        <span
                          key={`${f.name}-${i}`}
                          className="flex items-center gap-1"
                        >
                          {i > 0 && <span className="text-gray-300">→</span>}
                          <span className="font-mono">{s}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {outbound.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                出站调用({outbound.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {outbound.slice(0, 30).map((o, i) => (
                  <span
                    key={`${o.host}-${o.path}-${i}`}
                    className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-mono text-gray-600"
                    title={`${o.method ?? ""} ${o.host ?? ""}${o.path ?? ""} (${o.resolution})`}
                  >
                    {o.host ?? "?"}
                    {o.path ?? ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {feign.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                Feign 契约({feign.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {feign.map((f) => (
                  <Tag key={f.interface_fqn}>
                    {f.target_service ?? f.interface_fqn.split(".").pop()}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// ── 渗透视角(recon)──────────────────────────────────────────────────
function ReconCard({ recon }: { recon: SystemProfile["recon"] }) {
  const entries = recon.entry_points ?? []
  const boundaries = recon.trust_boundaries ?? []
  const injection = recon.injection_candidates ?? []
  const notDerivable = recon.not_derivable_from_code ?? []
  const empty =
    entries.length === 0 && boundaries.length === 0 && injection.length === 0
  return (
    <SectionCard title={<TitleWithIcon icon={Target} text="渗透视角" />}>
      {empty ? (
        <EmptyBlock text="暂无可派生的渗透线索(未分级接口 / 无出站 / 无注入类 finding)" />
      ) : (
        <div className="space-y-4">
          {entries.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                入口点(P0/P1 接口,优先打点)
              </div>
              <div className="space-y-1">
                {entries.map((e) => (
                  <Link
                    key={e.interface_id}
                    to="/security/interfaces/$id"
                    params={{ id: String(e.interface_id) }}
                    className="flex items-center gap-2 text-xs hover:bg-gray-50 rounded px-1 py-0.5"
                  >
                    <RiskBadge risk={e.risk} />
                    <MethodBadge method={e.method} />
                    <span className="font-mono text-gray-700 truncate">
                      {e.path}
                    </span>
                    {e.sensitivity && (
                      <span className="text-[10px] text-gray-400">
                        {e.sensitivity}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {injection.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                注入点候选(命中注入类 CWE 的 finding)
              </div>
              <div className="space-y-1.5">
                {injection.map((inj) => (
                  <div
                    key={inj.cwe}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="inline-flex items-center rounded-md border border-red-100 bg-red-50 px-2 py-0.5 font-bold text-red-600">
                      {inj.label} · {inj.cwe}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {inj.finding_ids.slice(0, 12).map((id) => (
                        <Link
                          key={id}
                          to="/security/findings/$id"
                          params={{ id: String(id) }}
                          className="font-mono text-blue-600 hover:underline"
                        >
                          #{id}
                        </Link>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {boundaries.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                信任边界(依赖的外部/内部服务)
              </div>
              <div className="flex flex-wrap gap-1">
                {boundaries.map((b) => (
                  <span
                    key={`${b.kind}:${b.name}`}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-mono text-gray-600"
                  >
                    <span className="text-gray-400">{b.kind}</span>
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {notDerivable.length > 0 && (
        <div className="mt-3 text-[11px] text-gray-400 border-t border-gray-100 pt-2">
          代码侧无法判定(需主机/部署侧):{notDerivable.join("、")}
        </div>
      )}
    </SectionCard>
  )
}

// ── 风险点 ──────────────────────────────────────────────────────────
function RiskCard({ risks }: { risks: SystemProfile["risks"] }) {
  const bySev = risks.open_by_severity ?? {}
  const themes = risks.themes ?? []
  const topIds = risks.top_finding_ids ?? []
  const severities = [...SEVERITY_ORDER].filter((s) => bySev[s])
  return (
    <SectionCard title={<TitleWithIcon icon={ShieldAlert} text="风险点" />}>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-black text-red-600 tabular-nums">
          {fmtNum(risks.open_total ?? 0)}
        </span>
        <span className="text-sm text-gray-500">个开放问题</span>
        {risks.group_count ? (
          <span className="text-xs text-gray-400 ml-2">
            · {risks.group_count} 个互证组
          </span>
        ) : null}
      </div>

      {severities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {severities.map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <SeverityBadge severity={s} />
              <span className="text-gray-500 text-xs tabular-nums">
                {bySev[s]}
              </span>
            </span>
          ))}
        </div>
      )}

      {themes.length > 0 && (
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
            主题(CWE)
          </div>
          <div className="flex flex-wrap gap-1">
            {themes.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>
      )}

      {topIds.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
            Top 问题(链到详情)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topIds.slice(0, 20).map((id) => (
              <Link
                key={id}
                to="/security/findings/$id"
                params={{ id: String(id) }}
                className="inline-flex items-center rounded-md border border-gray-200 px-2 py-0.5 text-xs font-mono text-blue-600 hover:bg-blue-50"
              >
                #{id}
              </Link>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ── 小组件 ──────────────────────────────────────────────────────────
function TitleWithIcon({
  icon: Icon,
  text,
}: {
  icon: typeof Cpu
  text: string
}) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-gray-400" />
      {text}
    </span>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 justify-between items-start">
      <span className="text-gray-400 shrink-0">{k}</span>
      <span className="text-gray-900 text-right">{children}</span>
    </div>
  )
}

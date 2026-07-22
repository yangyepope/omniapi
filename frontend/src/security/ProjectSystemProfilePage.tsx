// 系统画像(项目级)—— 整个系统一页看:技术栈 / 架构流程(跨服务拓扑)/
// 暴露面 / 风险 / 渗透视角,跨当前项目所有服务聚合(scanner 实时 rollup)。
// 明细仍按 id/服务下钻到已有页面(服务详情的单服务画像、finding 详情)。
import { Link } from "@tanstack/react-router"
import { Boxes, Cpu, GitBranch, ShieldAlert, Target } from "lucide-react"
import {
  MethodBadge,
  RiskBadge,
  SeverityBadge,
  Tag,
} from "@/components/security/badges"
import { SEVERITY_ORDER } from "@/components/security/theme"
import {
  EmptyBlock,
  LoadingBlock,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/security/ui"
import { fmtNum } from "@/lib/format"
import type { ProjectSystemProfile } from "./api"
import { useCurrentProject } from "./CurrentProjectProvider"
import { useProjectSystemProfile } from "./hooks"

export function ProjectSystemProfilePage() {
  const { project } = useCurrentProject()
  const q = useProjectSystemProfile()

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Cpu}
        title="系统画像(项目级)"
        subtitle={`整个系统一页看:技术栈 / 架构流程 / 暴露面 / 风险 / 渗透视角 —— 跨项目「${project || "?"}」所有服务聚合`}
      />

      {!project ? (
        <SectionCard>
          <EmptyBlock text="请先在右上角选择一个项目" />
        </SectionCard>
      ) : q.isLoading ? (
        <LoadingBlock text="聚合项目画像…" />
      ) : q.isError ? (
        <SectionCard>
          <EmptyBlock text="无法加载项目画像(scanner 不可达或未配置)" />
        </SectionCard>
      ) : (
        <Body data={q.data as ProjectSystemProfile} />
      )}
    </div>
  )
}

function Body({ data }: { data: ProjectSystemProfile }) {
  const sevs = [...SEVERITY_ORDER].filter((s) => data.risks.by_severity?.[s])
  return (
    <>
      {/* KPI 带 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="服务"
          value={data.service_count}
          hint={`${data.profiled_count} 个已生成画像`}
          icon={Boxes}
          tone="brand"
        />
        <StatCard
          label="接口总数"
          value={fmtNum(data.surface.total_endpoints)}
          hint={`敏感 ${data.surface.sensitive_endpoints}`}
          icon={Boxes}
          tone="brand"
        />
        <StatCard
          label="开放风险"
          value={fmtNum(data.risks.open_total)}
          hint={sevs
            .map((s) => `${s} ${data.risks.by_severity[s]}`)
            .join(" · ")}
          icon={ShieldAlert}
          tone="danger"
        />
        <StatCard
          label="技术栈"
          value={data.tech_stack.frameworks.length || "—"}
          hint={
            data.tech_stack.frameworks.map((f) => f.name).join(" / ") || "—"
          }
          icon={Cpu}
          tone="brand"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 技术栈 */}
        <SectionCard title={<Title icon={Cpu} t="技术栈" />}>
          <Sub t="框架" />
          <ChipRow
            items={data.tech_stack.frameworks.map(
              (f) => `${f.name} ×${f.services}`,
            )}
          />
          <div className="mt-3">
            <Sub t="语言" />
            <ChipRow
              items={data.tech_stack.languages.map(
                (l) => `${l.name} ×${l.services}`,
              )}
            />
          </div>
        </SectionCard>

        {/* 暴露面 */}
        <SectionCard title={<Title icon={Boxes} t="暴露面" />}>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-blue-600 tabular-nums">
              {fmtNum(data.surface.total_endpoints)}
            </span>
            <span className="text-sm text-gray-500">个接口</span>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {["P0", "P1", "P2"].map((r) =>
              data.surface.by_risk?.[r] ? (
                <span key={r} className="inline-flex items-center gap-1">
                  <RiskBadge risk={r} />
                  <span className="text-gray-500 text-xs tabular-nums">
                    {data.surface.by_risk[r]}
                  </span>
                </span>
              ) : null,
            )}
            <span className="text-xs text-gray-400 ml-2">
              敏感接口 {data.surface.sensitive_endpoints}
            </span>
          </div>
        </SectionCard>
      </div>

      {/* 服务清单 */}
      <SectionCard
        title={<Title icon={Boxes} t={`服务清单(${data.services.length})`} />}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="py-2.5 px-4 font-semibold">服务</th>
                <th className="py-2.5 px-2 font-semibold">框架</th>
                <th className="py-2.5 px-2 font-semibold">接口</th>
                <th className="py-2.5 px-2 font-semibold">风险(P0/P1/P2)</th>
                <th className="py-2.5 px-2 font-semibold">开放</th>
                <th className="py-2.5 px-4 font-semibold">画像</th>
              </tr>
            </thead>
            <tbody>
              {data.services.map((s) => (
                <tr
                  key={s.name}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2.5 px-4">
                    <Link
                      to="/security/services/$name"
                      params={{ name: s.name }}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-2.5 px-2 text-gray-600 text-xs">
                    {s.framework ?? "—"}
                    {s.framework_version ? ` ${s.framework_version}` : ""}
                  </td>
                  <td className="py-2.5 px-2 tabular-nums text-gray-700">
                    {s.endpoint_count}
                  </td>
                  <td className="py-2.5 px-2 text-xs tabular-nums text-gray-500">
                    {s.by_risk?.P0 ?? 0}/{s.by_risk?.P1 ?? 0}/
                    {s.by_risk?.P2 ?? 0}
                  </td>
                  <td className="py-2.5 px-2 tabular-nums text-blue-600 font-semibold">
                    {s.open_findings}
                  </td>
                  <td className="py-2.5 px-4">
                    {s.has_profile ? (
                      <span className="text-emerald-600 text-xs">✓ 已生成</span>
                    ) : (
                      <span className="text-gray-400 text-xs">— 未扫描</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* 架构流程:跨服务拓扑 */}
      <SectionCard title={<Title icon={GitBranch} t="架构流程 · 跨服务调用" />}>
        {data.flow.cross_service_edges.length === 0 ? (
          <EmptyBlock text="未解析到跨服务调用(或服务尚未扫描)" />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {data.flow.cross_service_edges.map((e) => (
              <span
                key={`${e.from}->${e.to}`}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
              >
                <span className="font-medium text-gray-700">{e.from}</span>
                <span className="text-gray-300">→</span>
                <span className="font-medium text-gray-700">{e.to}</span>
                {e.calls > 1 && (
                  <span className="text-gray-400">×{e.calls}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 风险 + 渗透视角 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={<Title icon={ShieldAlert} t="风险点" />}>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-black text-red-600 tabular-nums">
              {fmtNum(data.risks.open_total)}
            </span>
            <span className="text-sm text-gray-500">个开放问题</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {sevs.map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <SeverityBadge severity={s} />
                <span className="text-gray-500 text-xs tabular-nums">
                  {data.risks.by_severity[s]}
                </span>
              </span>
            ))}
          </div>
          {data.risks.injection_candidates.length > 0 && (
            <>
              <Sub t="注入点候选(全项目)" />
              <div className="space-y-1">
                {data.risks.injection_candidates.map((inj) => (
                  <div
                    key={inj.cwe}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="inline-flex items-center rounded-md border border-red-100 bg-red-50 px-2 py-0.5 font-bold text-red-600">
                      {inj.label} · {inj.cwe}
                    </span>
                    <span className="text-gray-500">{inj.count} 处</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title={<Title icon={Target} t="渗透视角" />}>
          <Sub t="入口点(全项目 P0/P1)" />
          {data.recon.entry_points.length === 0 ? (
            <EmptyBlock text="无(服务尚未生成画像)" />
          ) : (
            <div className="space-y-1 max-h-72 overflow-auto">
              {data.recon.entry_points.map((e) => (
                <Link
                  key={`${e.service}-${e.interface_id}`}
                  to="/security/interfaces/$id"
                  params={{ id: String(e.interface_id) }}
                  className="flex items-center gap-2 text-xs hover:bg-gray-50 rounded px-1 py-0.5"
                >
                  <RiskBadge risk={e.risk} />
                  <MethodBadge method={e.method} />
                  <span className="text-gray-400">{e.service}</span>
                  <span className="font-mono text-gray-700 truncate">
                    {e.path}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {data.recon.trust_boundaries.length > 0 && (
            <div className="mt-3">
              <Sub t="信任边界" />
              <ChipRow items={data.recon.trust_boundaries.map((b) => b.name)} />
            </div>
          )}
          {data.recon.not_derivable_from_code.length > 0 && (
            <div className="mt-3 text-[11px] text-gray-400 border-t border-gray-100 pt-2">
              代码侧无法判定(需主机/部署侧):
              {data.recon.not_derivable_from_code.join("、")}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  )
}

function Title({ icon: Icon, t }: { icon: typeof Cpu; t: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-gray-400" />
      {t}
    </span>
  )
}
function Sub({ t }: { t: string }) {
  return (
    <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
      {t}
    </div>
  )
}
function ChipRow({ items }: { items: string[] }) {
  if (items.length === 0)
    return <span className="text-gray-400 text-sm">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it) => (
        <Tag key={it}>{it}</Tag>
      ))}
    </div>
  )
}

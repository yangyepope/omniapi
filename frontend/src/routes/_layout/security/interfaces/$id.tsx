// /security/interfaces/$id — 单接口详情. 上:接口元数据;下:关联 findings,
// 点击跳详情页. 亮色主题.
import {
  createFileRoute,
  Link,
  useCanGoBack,
  useParams,
  useRouter,
} from "@tanstack/react-router"
import { ArrowLeft, ExternalLink, Loader2, ShieldCheck } from "lucide-react"
import {
  MethodBadge,
  RiskBadge,
  SeverityBadge,
  Tag,
} from "@/components/security/badges"
import { SEVERITY_META } from "@/components/security/theme"
import { Card, KV, SectionCard } from "@/components/security/ui"
import { fmtDateTime } from "@/lib/format"
import { useInterface } from "@/security/hooks"
import { InterfaceProfileEditor } from "@/security/InterfaceProfileEditor"

export const Route = createFileRoute("/_layout/security/interfaces/$id")({
  component: InterfaceDetailPage,
  head: () => ({ meta: [{ title: "Interface · Security Platform" }] }),
})

function InterfaceDetailPage() {
  const { id: idStr } = useParams({ from: "/_layout/security/interfaces/$id" })
  const id = Number(idStr)
  const { data: iface, isLoading, error } = useInterface(id)
  // 返回上一步:优先走历史(从服务详情「接口」Tab 进来就回那);无历史兜底回服务清单。
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const goBack = () =>
    canGoBack
      ? router.history.back()
      : router.navigate({ to: "/security/services" })

  if (isLoading)
    return (
      <Center>
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </Center>
    )
  if (error || !iface)
    return (
      <Center>
        <div className="text-gray-500">未找到该接口 (id={id})</div>
      </Center>
    )

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
          params={{ name: iface.service_name }}
          className="text-sm text-gray-500 hover:text-blue-600"
        >
          {iface.service_name} 服务详情 →
        </Link>
      </div>

      {/* Header */}
      <Card className="p-5 gap-0">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <MethodBadge method={iface.http_method} />
          <span className="font-mono text-base text-gray-900 break-all">
            {iface.path}
          </span>
          {iface.risk_level && <RiskBadge risk={iface.risk_level} />}
          {iface.op_type && <Tag>{iface.op_type}</Tag>}
        </div>
        {iface.description && (
          <p className="text-sm text-gray-900 mt-2">{iface.description}</p>
        )}
        {iface.business_summary && (
          <p className="text-sm text-gray-500 mt-2 italic">
            {iface.business_summary}
          </p>
        )}
      </Card>

      {/* 两栏:左 findings,右 元数据 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左 — findings */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-gray-900">关联 Findings</h2>
            <span className="text-xs text-gray-500">
              开放{" "}
              <span className="text-blue-600 font-bold">
                {iface.open_findings_count}
              </span>{" "}
              / 总计{" "}
              <span className="text-gray-900 font-bold">
                {iface.findings_count}
              </span>
            </span>
          </div>

          {iface.findings.length === 0 ? (
            <Card className="p-8 gap-0 items-center text-center">
              <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500/70 mb-2" />
              <p className="text-sm text-gray-500">该接口暂无安全问题</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {iface.findings.map((f) => (
                <Link
                  key={f.id}
                  to="/security/findings/$id"
                  params={{ id: String(f.id) }}
                  className="block"
                >
                  <Card
                    className="p-3 gap-0 hover:bg-gray-50 transition"
                    style={{
                      borderLeft: `3px solid ${SEVERITY_META[f.severity]?.hex ?? "#cbd5e1"}`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <SeverityBadge severity={f.severity} />
                        <span className="text-xs text-gray-500 uppercase">
                          {f.engine}
                        </span>
                        {f.cwe_id && (
                          <span className="text-xs text-blue-600">
                            {f.cwe_id}
                          </span>
                        )}
                        {f.status === "closed" && (
                          <Tag>
                            closed
                            {f.closed_reason ? ` · ${f.closed_reason}` : ""}
                          </Tag>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">#{f.id}</span>
                    </div>
                    <div className="mt-1.5 text-xs text-gray-900 font-mono break-all">
                      {f.rule_id}
                    </div>
                    {f.message && (
                      <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {f.message}
                      </div>
                    )}
                    <div className="mt-1.5 text-[10px] text-gray-400 font-mono truncate">
                      {f.file_path}:{f.line_number}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 右 — 元数据 */}
        <div className="space-y-4">
          <SectionCard title="位置">
            <ul className="text-xs space-y-1.5">
              <KV k="文件" v={iface.file_path ?? "—"} mono />
              {iface.line_number !== null && (
                <KV k="行号" v={String(iface.line_number)} mono />
              )}
              {iface.handler && <KV k="Handler" v={iface.handler} mono />}
            </ul>
          </SectionCard>

          <InterfaceProfileEditor key={iface.id} iface={iface} />

          <SectionCard title="元数据">
            <ul className="text-xs space-y-1.5">
              <KV k="ID" v={String(iface.id)} mono />
              <KV k="服务" v={iface.service_name} />
              <KV k="来源" v={iface.source} />
              <KV k="抽取时间" v={fmtDateTime(iface.extracted_at)} />
            </ul>
          </SectionCard>

          <Link
            to="/security/services/$name"
            params={{ name: iface.service_name }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm bg-gray-100 text-gray-900 hover:bg-gray-100 transition"
          >
            查看服务全部接口 <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

const Center = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    {children}
  </div>
)

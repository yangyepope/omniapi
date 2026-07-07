// /security/scans — 扫描管理树形页. 左侧:服务列表(open findings + 最近扫描
// 状态);右侧:选中服务的接口列表(按 risk_level 排序),可下钻单接口详情.
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  ChevronRight,
  RadioTower,
  ShieldCheck,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
  MethodBadge,
  RiskBadge,
  ScanStatusBadge,
} from "@/components/security/badges"
import { TriggerScanButton } from "@/components/security/TriggerScanButton"
import {
  isLowValueInterface,
  SCAN_STATUS_META,
} from "@/components/security/theme"
import {
  EmptyBlock,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from "@/components/security/ui"
import {
  useScanRuns,
  useServiceInterfaces,
  useServiceList,
} from "@/security/hooks"

export const Route = createFileRoute("/_layout/security/scans")({
  component: ScanManagePage,
  head: () => ({ meta: [{ title: "扫描管理 · Security Platform" }] }),
})

function ScanManagePage() {
  const services = useServiceList()
  const [selected, setSelected] = useState<string | null>(null)
  const list = useMemo(
    () =>
      [...(services.data ?? [])].sort(
        (a, b) => b.open_findings - a.open_findings,
      ),
    [services.data],
  )
  // 首次加载完成后自动选中第一个服务
  if (!selected && list.length > 0 && !services.isLoading) {
    setSelected(list[0].name)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="扫描管理"
        subtitle="按服务 → 接口下钻查看漏洞分布,点击接口看完整调用上下文与关联 findings"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左:服务树 */}
        <div className="lg:col-span-1">
          <SectionCard title={`服务 (${list.length})`} bodyClassName="p-0">
            <div className="max-h-[calc(100vh-260px)] overflow-auto">
              {services.isLoading && <LoadingBlock />}
              {list.map((s) => (
                <ServiceRow
                  key={s.name}
                  name={s.name}
                  language={s.language}
                  open={s.open_findings}
                  closed={s.closed_findings}
                  lastScanStatus={s.last_scan_status}
                  isSelected={selected === s.name}
                  onClick={() => setSelected(s.name)}
                />
              ))}
              {list.length === 0 && !services.isLoading && (
                <EmptyBlock text="无服务" />
              )}
            </div>
          </SectionCard>
        </div>

        {/* 右:选中服务的接口 */}
        <div className="lg:col-span-3">
          {selected ? (
            <InterfacePanel name={selected} />
          ) : (
            <SectionCard>
              <EmptyBlock text="选择左侧一个服务查看其接口列表" />
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}

const ServiceRow = ({
  name,
  language,
  open,
  closed,
  lastScanStatus,
  isSelected,
  onClick,
}: {
  name: string
  language: string | null
  open: number
  closed: number
  lastScanStatus: string | null
  isSelected: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 transition ${
      isSelected
        ? "bg-blue-50 border-l-2 border-l-blue-500"
        : "hover:bg-gray-50"
    }`}
  >
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{
        background: SCAN_STATUS_META[lastScanStatus ?? ""]?.hex ?? "#cbd5e1",
      }}
    />
    <div className="flex-1 min-w-0">
      <div
        className={`text-sm truncate ${
          isSelected ? "text-blue-600 font-bold" : "text-gray-900 font-medium"
        }`}
      >
        {name}
      </div>
      <div className="text-[10px] text-gray-500 mt-0.5">
        {language ?? "—"} · 开放 {open} · 已关 {closed}
      </div>
    </div>
    {open > 0 && (
      <span className="text-xs font-bold text-blue-600 tabular-nums">
        {open}
      </span>
    )}
    <ChevronRight
      className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-gray-300"}`}
    />
  </button>
)

const InterfacePanel = ({ name }: { name: string }) => {
  const interfaces = useServiceInterfaces(name)
  const scanRuns = useScanRuns(name, 1)
  // 默认隐藏低价值接口(错误页/基础设施);view-only,可切换。不影响 findings。
  const [showLowValue, setShowLowValue] = useState(false)

  const allItems = interfaces.data ?? []
  const lowValueCount = useMemo(
    () => allItems.filter((it) => isLowValueInterface(it)).length,
    [allItems],
  )
  const items = useMemo(
    () =>
      showLowValue
        ? allItems
        : allItems.filter((it) => !isLowValueInterface(it)),
    [allItems, showLowValue],
  )
  const grouped = useMemo(() => {
    const byRisk: Record<string, typeof items> = {
      P0: [],
      P1: [],
      P2: [],
      OTHER: [],
    }
    for (const it of items) {
      const key = (it.risk_level ?? "OTHER") as keyof typeof byRisk
      ;(byRisk[key] ?? byRisk.OTHER).push(it)
    }
    return byRisk
  }, [items])
  const totalOpen = items.reduce((a, b) => a + b.open_findings_count, 0)
  const recentRun = scanRuns.data?.[0]

  return (
    <SectionCard
      bodyClassName="p-0"
      title={
        <span className="flex items-center gap-2">
          <Link
            to="/security/services/$name"
            params={{ name }}
            className="text-base font-bold text-gray-900 hover:text-blue-600"
          >
            {name}
          </Link>
          {recentRun && <ScanStatusBadge status={recentRun.status} />}
          <span className="text-xs text-gray-500 font-normal">
            {items.length} 接口 · 开放 findings{" "}
            <span className="text-blue-600 font-bold">{totalOpen}</span>
          </span>
        </span>
      }
      action={<TriggerScanButton service={name} />}
    >
      <div className="max-h-[calc(100vh-260px)] overflow-auto">
        {interfaces.isLoading && <LoadingBlock />}
        {!interfaces.isLoading && allItems.length === 0 && (
          <EmptyBlock
            icon={RadioTower}
            text="尚未抽取接口 — 点击「触发扫描」开始"
          />
        )}
        {lowValueCount > 0 && (
          <div className="px-4 py-1.5 flex items-center justify-between text-xs text-gray-500 bg-amber-50/40 border-b border-gray-100">
            <span>
              {showLowValue ? "含" : "已隐藏"} {lowValueCount}{" "}
              个低价值接口(错误页/基础设施)
            </span>
            <button
              type="button"
              onClick={() => setShowLowValue((v) => !v)}
              className="text-blue-600 hover:underline"
            >
              {showLowValue ? "隐藏" : "显示"}
            </button>
          </div>
        )}
        {(["P0", "P1", "P2", "OTHER"] as const).map((risk) => {
          const group = grouped[risk]
          if (!group || group.length === 0) return null
          return (
            <div key={risk}>
              <div className="px-4 py-2 text-xs uppercase tracking-wider text-gray-500 bg-gray-50 sticky top-0 z-10 flex items-center gap-2 border-b border-gray-100">
                {risk !== "OTHER" ? (
                  <RiskBadge risk={risk} />
                ) : (
                  <span>未分级</span>
                )}
                <span className="text-gray-400">({group.length})</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {group.map((it) => {
                    const dangerous = it.open_findings_count > 0
                    return (
                      <tr
                        key={it.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-2 px-4 w-16">
                          <MethodBadge method={it.http_method} />
                        </td>
                        <td className="py-2 px-2">
                          <Link
                            to="/security/interfaces/$id"
                            params={{ id: String(it.id) }}
                            className="block"
                          >
                            <div className="text-gray-900 font-mono text-xs hover:text-blue-600">
                              {it.path}
                            </div>
                            {it.handler && (
                              <div className="text-gray-500 text-[10px] truncate mt-0.5">
                                {it.handler.split(".").slice(-2).join(".")}
                              </div>
                            )}
                          </Link>
                        </td>
                        <td className="py-2 px-4 text-right w-32">
                          {dangerous ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-amber-600 font-bold tabular-nums text-sm">
                                {it.open_findings_count}
                              </span>
                              <span className="text-gray-500 text-[10px]">
                                / {it.findings_count}
                              </span>
                            </div>
                          ) : (
                            <span className="flex items-center justify-end gap-1 text-emerald-600/80 text-xs">
                              <ShieldCheck className="w-3 h-3" />
                              clean
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

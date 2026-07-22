// 服务接口清单面板(IA 区 3:服务详情「接口」Tab)。按 risk_level(P0/P1/P2/未分级)
// 分组展示某服务的接口,默认隐藏低价值接口(错误页/基础设施,可切换),点接口下钻
// 单接口详情 /security/interfaces/$id。抽自原扫描管理页的 InterfacePanel,供服务详情复用。
import { Link } from "@tanstack/react-router"
import { AlertTriangle, RadioTower, ShieldCheck } from "lucide-react"
import { useMemo, useState } from "react"
import { MethodBadge, RiskBadge } from "@/components/security/badges"
import { isLowValueInterface } from "@/components/security/theme"
import { EmptyBlock, LoadingBlock, SectionCard } from "@/components/security/ui"
import { useServiceInterfaces } from "@/security/hooks"

export function ServiceInterfacesPanel({ name }: { name: string }) {
  const interfaces = useServiceInterfaces(name)
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

  return (
    <SectionCard
      bodyClassName="p-0"
      title={
        <span className="text-xs text-gray-500 font-normal">
          {items.length} 接口 · 开放 findings{" "}
          <span className="text-blue-600 font-bold">{totalOpen}</span>
        </span>
      }
    >
      <div className="max-h-[calc(100vh-320px)] overflow-auto">
        {interfaces.isLoading && <LoadingBlock />}
        {!interfaces.isLoading && allItems.length === 0 && (
          <EmptyBlock
            icon={RadioTower}
            text="尚未抽取接口 — 点击右上角「触发扫描」开始"
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

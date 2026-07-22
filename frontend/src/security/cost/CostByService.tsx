// 成本分区②:按服务(第二级下钻)。点击某行 → 通过 onSelect 设置服务筛选,
// 联动上层 cost-stats / cost-runs 两个 query 重取(F-001:query key 变化自动重取)。
// 当前选中的服务行高亮,再点一次(在筛选器里选"全部")即可清除。
import { EmptyBlock, SectionCard } from "@/components/security/ui"
import type { ServiceCost } from "../api"
import { fmtDateTime, fmtDuration, fmtNum } from "./format"

export function CostByService({
  services,
  activeService,
  onSelect,
}: {
  services: ServiceCost[]
  activeService: string
  onSelect: (name: string) => void
}) {
  return (
    <SectionCard title="按服务" bodyClassName="p-0">
      {services.length === 0 ? (
        <EmptyBlock text="窗口内无扫描记录" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="py-2.5 px-4 font-semibold">服务</th>
                <th className="py-2.5 px-2 font-semibold">扫描次数</th>
                <th className="py-2.5 px-2 font-semibold">Findings</th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  输入 Token
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  输出 Token
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  总 Token
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">耗时</th>
                <th className="py-2.5 px-4 font-semibold">最近一次</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const active = s.service === activeService
                return (
                  <tr
                    key={s.service}
                    onClick={() => onSelect(s.service)}
                    className={`cursor-pointer border-b border-gray-100 ${
                      active ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono text-gray-900">
                      {s.service}
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 tabular-nums">
                      {s.runs}
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 tabular-nums">
                      {s.findings}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-gray-500">
                      {s.input_tokens ? fmtNum(s.input_tokens) : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-gray-500">
                      {s.output_tokens ? fmtNum(s.output_tokens) : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-blue-600 font-semibold">
                      {s.total_tokens ? fmtNum(s.total_tokens) : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-gray-500">
                      {fmtDuration(s.elapsed_seconds)}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 tabular-nums">
                      {fmtDateTime(s.last_run_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

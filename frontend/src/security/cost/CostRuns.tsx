// 成本分区③:扫描明细(第三级下钻)。每行一次扫描,显示"具体那次什么时间"
// (started_at 绝对时间)、服务、sha、状态、总 Token、耗时;点击行内展开该次的
// 逐引擎明细。自带取数 + 四态,父组件只需传筛选条件。
import { ChevronDown, ChevronRight } from "lucide-react"
import { Fragment, useState } from "react"
import { ScanStatusBadge } from "@/components/security/badges"
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  SectionCard,
} from "@/components/security/ui"
import type { RunCost } from "../api"
import { useCostRuns } from "../hooks"
import { fmtDateTime, fmtDuration, fmtNum } from "./format"

// 单次扫描展开后的逐引擎子表
function EngineDetailRows({ run }: { run: RunCost }) {
  return (
    <tr className="bg-gray-50/60">
      <td colSpan={7} className="px-4 py-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-200">
              <th className="py-1.5 pr-2 font-medium">引擎 / 阶段</th>
              <th className="py-1.5 pr-2 font-medium">模型</th>
              <th className="py-1.5 pr-2 font-medium text-right">输入</th>
              <th className="py-1.5 pr-2 font-medium text-right">输出</th>
              <th className="py-1.5 pr-2 font-medium text-right">Findings</th>
              <th className="py-1.5 pr-2 font-medium text-right">耗时</th>
              <th className="py-1.5 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {run.by_engine.map((e) => (
              <tr
                key={e.engine}
                className="border-b border-gray-100 last:border-0"
              >
                <td className="py-1.5 pr-2 font-mono text-gray-800">
                  {e.engine}
                </td>
                <td className="py-1.5 pr-2 text-gray-500">{e.model ?? "—"}</td>
                <td className="py-1.5 pr-2 text-right font-mono text-gray-500">
                  {e.input_tokens ? fmtNum(e.input_tokens) : "—"}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono text-gray-500">
                  {e.output_tokens ? fmtNum(e.output_tokens) : "—"}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-gray-500">
                  {e.findings}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono text-gray-500">
                  {fmtDuration(e.elapsed_seconds)}
                </td>
                <td className="py-1.5 text-gray-500">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  )
}

export function CostRuns({
  service,
  days,
}: {
  service?: string
  days?: number
}) {
  const runs = useCostRuns(service, days)
  // 展开的 run_id 集合(行内展开,本地状态)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <SectionCard title="扫描明细(每行一次扫描)" bodyClassName="p-0">
      {runs.isLoading && <LoadingBlock text="加载扫描明细…" />}
      {runs.isError && <ErrorBlock text="无法加载扫描明细" />}
      {runs.data && runs.data.length === 0 && (
        <EmptyBlock text="窗口内无扫描记录" />
      )}
      {runs.data && runs.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="py-2.5 px-4 font-semibold">时间</th>
                <th className="py-2.5 px-2 font-semibold">服务</th>
                <th className="py-2.5 px-2 font-semibold">SHA</th>
                <th className="py-2.5 px-2 font-semibold">状态</th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  总 Token
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">耗时</th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  Findings
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.data.map((r) => {
                const open = expanded.has(r.run_id)
                return (
                  <Fragment key={r.run_id}>
                    <tr
                      onClick={() => toggle(r.run_id)}
                      className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2.5 px-4 text-gray-900 tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          {open ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                          )}
                          {fmtDateTime(r.started_at)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-gray-700">
                        {r.service}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-gray-400">
                        {r.sha.slice(0, 8)}
                      </td>
                      <td className="py-2.5 px-2">
                        <ScanStatusBadge status={r.status} />
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-blue-600 font-semibold">
                        {r.total_tokens ? fmtNum(r.total_tokens) : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-gray-500">
                        {fmtDuration(r.elapsed_seconds)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-gray-500">
                        {r.findings}
                      </td>
                    </tr>
                    {open && <EngineDetailRows key={`${r.run_id}-d`} run={r} />}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

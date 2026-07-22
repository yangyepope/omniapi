// 成本分区①:按引擎(第一级视角)。两张图 + 引擎明细表,原样迁移自旧 CostPage。
// token 图只画有 token 的 LLM 引擎;耗时图画全部引擎。
import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { CHART } from "@/components/security/theme"
import { EmptyBlock, SectionCard } from "@/components/security/ui"
import type { EngineCost } from "../api"
import { fmtDuration, fmtNum } from "./format"

export function CostByEngine({ engines }: { engines: EngineCost[] }) {
  // token 图只画有 token 的引擎(LLM 类);耗时图画全部引擎并按耗时降序
  const tokenData = useMemo(
    () => engines.filter((e) => e.total_tokens > 0),
    [engines],
  )
  const elapsedData = useMemo(
    () => [...engines].sort((a, b) => b.elapsed_seconds - a.elapsed_seconds),
    [engines],
  )

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="按引擎 Token 用量">
          {tokenData.length === 0 ? (
            <EmptyBlock text="窗口内无 LLM token 消耗" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tokenData} layout="vertical">
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  stroke={CHART.axis}
                  fontSize={11}
                  tickFormatter={fmtNum}
                />
                <YAxis
                  type="category"
                  dataKey="engine"
                  stroke={CHART.axis}
                  fontSize={11}
                  width={100}
                />
                <Tooltip
                  contentStyle={CHART.tooltip}
                  cursor={{ fill: "#00000008" }}
                  formatter={(v) => fmtNum(Number(v))}
                />
                <Legend wrapperStyle={CHART.legend} />
                <Bar
                  dataKey="input_tokens"
                  name="输入"
                  stackId="t"
                  fill={CHART.brand}
                />
                <Bar
                  dataKey="output_tokens"
                  name="输出"
                  stackId="t"
                  fill={CHART.accent}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="按引擎耗时(秒)">
          {elapsedData.length === 0 ? (
            <EmptyBlock text="窗口内无扫描记录" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={elapsedData} layout="vertical">
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis type="number" stroke={CHART.axis} fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="engine"
                  stroke={CHART.axis}
                  fontSize={11}
                  width={100}
                />
                <Tooltip
                  contentStyle={CHART.tooltip}
                  cursor={{ fill: "#00000008" }}
                  formatter={(v) => fmtDuration(Number(v))}
                />
                <Bar
                  dataKey="elapsed_seconds"
                  name="耗时"
                  fill={CHART.warn}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <SectionCard title="引擎明细" bodyClassName="p-0">
        {engines.length === 0 ? (
          <EmptyBlock text="窗口内无扫描记录" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="py-2.5 px-4 font-semibold">引擎</th>
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
                  <th className="py-2.5 px-4 font-semibold text-right">耗时</th>
                </tr>
              </thead>
              <tbody>
                {engines.map((e) => (
                  <tr
                    key={e.engine}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2.5 px-4 font-mono text-gray-900">
                      {e.engine}
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 tabular-nums">
                      {e.runs}
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 tabular-nums">
                      {e.findings}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-gray-500">
                      {e.input_tokens ? fmtNum(e.input_tokens) : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-gray-500">
                      {e.output_tokens ? fmtNum(e.output_tokens) : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-blue-600 font-semibold">
                      {e.total_tokens ? fmtNum(e.total_tokens) : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-gray-500">
                      {fmtDuration(e.elapsed_seconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  )
}

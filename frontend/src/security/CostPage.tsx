// 扫描成本页(scanner FEAT-009)— 亮色主题,纯编排。
// 三级下钻:全局 KPI + 按引擎(CostByEngine)→ 按服务(CostByService,点行联动筛选)
// → 单次扫描明细(CostRuns,行内展开看逐引擎)。
// 数据源:/security/cost-stats(全局+按引擎+按服务)、/security/cost-runs(单次明细)。
import { Clock, Cpu, DollarSign, Zap } from "lucide-react"
import { useState } from "react"
import {
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  StatCard,
} from "@/components/security/ui"
import type { EngineCost } from "./api"
import { CostByEngine } from "./cost/CostByEngine"
import { CostByService } from "./cost/CostByService"
import { CostRuns } from "./cost/CostRuns"
import { fmtDuration, fmtNum } from "./cost/format"
import { useCostStats, useServiceList } from "./hooks"

// 亮色原生下拉的统一样式
const SELECT_CLS =
  "h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"

export function ScannerCostPage() {
  // service 空串 = 全部服务;同时驱动 cost-stats 与(子组件里的)cost-runs 重取
  const [service, setService] = useState<string>("")
  const [days, setDays] = useState<number>(30)
  const services = useServiceList()
  const cost = useCostStats(service || undefined, days)

  const data = cost.data
  const engines: EngineCost[] = data?.by_engine ?? []
  const tokenEngineCount = engines.filter((e) => e.total_tokens > 0).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={DollarSign}
        title="扫描成本"
        subtitle="按引擎 / 服务 / 单次扫描的 AI token 用量与 wall-clock 耗时(来自 scan_engine_runs 记录)"
        actions={
          <div className="flex items-center gap-2">
            <select
              aria-label="选择服务"
              className={SELECT_CLS}
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="">全部服务</option>
              {(services.data ?? []).map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              aria-label="时间窗"
              className={SELECT_CLS}
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value="7">近 7 天</option>
              <option value="30">近 30 天</option>
              <option value="90">近 90 天</option>
            </select>
          </div>
        }
      />

      {cost.isLoading && <LoadingBlock text="加载成本数据…" />}
      {cost.isError && <ErrorBlock text="无法加载成本数据" />}

      {data && (
        <>
          {/* KPI 带(全局统计) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="总 Token"
              value={fmtNum(data.total_tokens)}
              hint={`输入 ${fmtNum(data.total_input_tokens)} / 输出 ${fmtNum(data.total_output_tokens)}`}
              icon={Zap}
              tone="brand"
            />
            <StatCard
              label="输入 Token"
              value={fmtNum(data.total_input_tokens)}
              icon={Zap}
              tone="success"
            />
            <StatCard
              label="总耗时"
              value={fmtDuration(data.total_elapsed_seconds)}
              hint="所有引擎 wall-clock 之和"
              icon={Clock}
              tone="warning"
            />
            <StatCard
              label="覆盖引擎"
              value={String(engines.length)}
              hint={`其中 ${tokenEngineCount} 个 LLM 引擎`}
              icon={Cpu}
              tone="brand"
            />
          </div>

          {/* 分区①:按引擎 */}
          <CostByEngine engines={engines} />

          {/* 分区②:按服务(点行联动筛选) */}
          <CostByService
            services={data.by_service}
            activeService={service}
            onSelect={(name) => setService(name === service ? "" : name)}
          />

          {/* 分区③:单次扫描明细(行内展开) */}
          <CostRuns service={service || undefined} days={days} />
        </>
      )}
    </div>
  )
}

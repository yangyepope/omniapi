// /security/tasks — 扫描任务总览:跨所有服务列出全部 scan run(任务)及其
// 执行状态。数据来自后端聚合端点 GET /security/scan-runs。服务/状态筛选进
// 路由 search params,顶部可选服务直接触发扫描,新任务经 30s 心跳自动出现。
import { createFileRoute, Link } from "@tanstack/react-router"
import { ListChecks, RadioTower } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"
import { ScanStatusBadge } from "@/components/security/badges"
import { TriggerScanButton } from "@/components/security/TriggerScanButton"
import { SCAN_STATUS_META } from "@/components/security/theme"
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from "@/components/security/ui"
import { type ScanRun, scannerErrorDetail } from "@/security/api"
import { useAllScanRuns, useServiceList } from "@/security/hooks"

const searchSchema = z.object({
  // 空串表示不筛选;进 search params 驱动 query 重取
  service: z.string().optional().default(""),
  status: z.string().optional().default(""),
})

export const Route = createFileRoute("/_layout/security/tasks")({
  component: ScanTasksPage,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "扫描任务 · Security Platform" }] }),
})

// 计算任务耗时(秒→易读),running 显示进行中
function formatDuration(run: ScanRun): string {
  if (!run.finished_at) return run.status === "running" ? "进行中…" : "—"
  const ms =
    new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
  if (!Number.isFinite(ms) || ms < 0) return "—"
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

// 亮色原生下拉的统一样式
const SELECT_CLS =
  "h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"

function ScanTasksPage() {
  const { service, status } = Route.useSearch()
  const navigate = Route.useNavigate()
  const services = useServiceList()
  // status 进 query key,切换即重取;service 在前端过滤(聚合端点无 service 参数)
  const tasks = useAllScanRuns({ status: status || undefined })

  const rows = useMemo(() => {
    const all = tasks.data ?? []
    return service ? all.filter((t) => t.service_name === service) : all
  }, [tasks.data, service])

  // 更新单个 search param,其余保持
  const setParam = (key: "service" | "status", value: string) =>
    navigate({ search: (prev) => ({ ...prev, [key]: value }) })

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ListChecks}
        title="扫描任务"
        subtitle="gitlab-scan 全部服务的扫描任务与执行状态 · 每 30s 自动刷新"
        actions={
          <div className="flex items-center gap-2">
            <select
              aria-label="选择服务"
              className={SELECT_CLS}
              value={service}
              onChange={(e) => setParam("service", e.target.value)}
            >
              <option value="">全部服务</option>
              {(services.data ?? []).map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              aria-label="按状态筛选"
              className={SELECT_CLS}
              value={status}
              onChange={(e) => setParam("status", e.target.value)}
            >
              <option value="">全部状态</option>
              {Object.entries(SCAN_STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <TriggerScanButton service={service} disabled={!service} />
          </div>
        }
      />

      <SectionCard bodyClassName="p-0">
        {tasks.isLoading && <LoadingBlock />}
        {tasks.isError && (
          <ErrorBlock
            text={`加载任务失败:${scannerErrorDetail(tasks.error)}`}
          />
        )}
        {!tasks.isLoading && !tasks.isError && rows.length === 0 && (
          <EmptyBlock
            icon={RadioTower}
            text="暂无扫描任务 — 选择上方服务后「触发扫描」"
          />
        )}
        {rows.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="text-left py-2.5 px-4 font-semibold">服务</th>
                <th className="text-left py-2.5 px-2 font-semibold">状态</th>
                <th className="text-left py-2.5 px-2 font-semibold">SHA</th>
                <th className="text-left py-2.5 px-2 font-semibold">
                  开始时间
                </th>
                <th className="text-left py-2.5 px-2 font-semibold">耗时</th>
                <th className="text-left py-2.5 px-2 font-semibold">
                  已完成引擎
                </th>
                <th className="text-right py-2.5 px-4 font-semibold">Resume</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((run) => (
                <tr
                  key={`${run.service_name}-${run.id}`}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2.5 px-4 text-gray-900 font-medium">
                    <Link
                      to="/security/services/$name"
                      params={{ name: run.service_name }}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {run.service_name}
                    </Link>
                  </td>
                  <td className="py-2.5 px-2">
                    <ScanStatusBadge status={run.status} />
                  </td>
                  <td className="py-2.5 px-2 font-mono text-xs text-gray-500">
                    {run.sha ? run.sha.slice(0, 8) : "—"}
                  </td>
                  <td className="py-2.5 px-2 text-gray-500 text-xs tabular-nums">
                    {run.started_at
                      ? new Date(run.started_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2.5 px-2 text-gray-500 text-xs tabular-nums">
                    {formatDuration(run)}
                  </td>
                  <td className="py-2.5 px-2 text-gray-500 text-xs">
                    {run.engines_completed?.length
                      ? run.engines_completed.join(", ")
                      : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-right text-gray-500 tabular-nums">
                    {run.resume_count ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}

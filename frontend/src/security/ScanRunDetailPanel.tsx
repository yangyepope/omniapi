// 单次扫描详情 / 实时进度面板(FEAT-011)。
//
// 控制台点服务名进服务详情页后,对某次 run 轮询 scanner 的
// GET /security/services/{name}/scan-runs/{id},展示:
//   ① 头部:状态 / #id / sha / 开始 / 耗时 / resume / 存活(最后活动 Xs 前)
//   ② 阶段进度条:固定阶段顺序,已完成✓ / 当前⟳ / 待执行,带完成时间戳
//   ③ 逐引擎表:引擎 / 状态 / 耗时 / 发现数 / token / model
//
// live=true(run 仍在跑)时 hook 内 4s 快轮询;结束即停。

import { ScanStatusBadge } from "@/components/security/badges"
import {
  PHASE_KEY_FOR_STAGE,
  SCAN_STATUS_META,
  STAGE_META,
  STAGE_ORDER,
  stageLabel,
  stageSlot,
} from "@/components/security/theme"
import {
  Card,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  SectionCard,
} from "@/components/security/ui"
import { useScanRunDetail } from "@/security/hooks"

function fmtDuration(startISO: string, endISO: string | null): string {
  const end = endISO ? new Date(endISO).getTime() : Date.now()
  const s = Math.max(0, Math.round((end - new Date(startISO).getTime()) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m${s % 60}s`
  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`
}

function fmtClock(iso?: string | null): string {
  if (!iso) return "—"
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? "—" : new Date(iso).toLocaleTimeString("zh-CN")
}

export function ScanRunDetailPanel({
  name,
  runId,
  live,
}: {
  name: string
  runId: number
  live: boolean
}) {
  const { data, isLoading, error } = useScanRunDetail(name, runId, live)

  if (isLoading) return <LoadingBlock />
  if (error) return <ErrorBlock text="加载扫描详情失败" />
  if (!data) return <EmptyBlock text="无扫描详情" />

  const running = data.status === "running"
  const currentSlot = stageSlot(data.current_stage)
  // 当前阶段在固定顺序里的下标;它之前的都算已完成。
  const currentIdx = currentSlot
    ? (STAGE_ORDER as readonly string[]).indexOf(currentSlot)
    : -1
  const finished = !running // 已终态:全部阶段视作走完(用于历史 run)

  return (
    <div className="space-y-3">
      {/* ① 头部 */}
      <Card
        className="p-4 gap-0"
        style={{
          borderLeft: `3px solid ${SCAN_STATUS_META[data.status]?.hex ?? "#cbd5e1"}`,
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <ScanStatusBadge status={data.status} />
            <span className="font-mono text-sm text-gray-900">#{data.id}</span>
            <span className="font-mono text-xs text-gray-500">
              {data.sha.slice(0, 16)}
            </span>
            {data.resume_count > 0 && (
              <span className="text-amber-600 text-[10px]">
                resume×{data.resume_count}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(data.started_at).toLocaleString("zh-CN")} ·{" "}
            {fmtDuration(data.started_at, data.finished_at)}
          </div>
        </div>
        {running && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-blue-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              正在执行:{stageLabel(data.current_stage)}
            </span>
            {data.seconds_since_heartbeat != null && (
              <span className="text-gray-400">
                最后活动 {Math.round(data.seconds_since_heartbeat)}s 前
              </span>
            )}
            <span className="text-gray-400">
              已发现 {data.findings_count} 条
            </span>
          </div>
        )}
      </Card>

      {/* ② 阶段进度条 */}
      <SectionCard title="扫描过程">
        <ol className="space-y-1.5">
          {STAGE_ORDER.map((slot, i) => {
            const isCurrent = running && i === currentIdx
            const isDone = finished || (currentIdx >= 0 && i < currentIdx)
            const phaseKey = PHASE_KEY_FOR_STAGE[slot]
            const doneAt = phaseKey
              ? data.phases_completed?.[phaseKey]
              : undefined
            // 引擎槽:running 且当前在引擎阶段时,显示正在跑的具体引擎名
            const label =
              slot === "engines" && isCurrent
                ? stageLabel(data.current_stage)
                : STAGE_META[slot]
            const mark = isCurrent ? "⟳" : isDone ? "✓" : "○"
            const color = isCurrent
              ? "text-blue-600"
              : isDone
                ? "text-green-600"
                : "text-gray-300"
            return (
              <li key={slot} className="flex items-center gap-2 text-sm">
                <span
                  className={`${color} ${isCurrent ? "animate-spin" : ""} w-4 text-center`}
                >
                  {mark}
                </span>
                <span
                  className={
                    isCurrent
                      ? "text-gray-900 font-medium"
                      : isDone
                        ? "text-gray-700"
                        : "text-gray-400"
                  }
                >
                  {label}
                </span>
                {slot === "engines" && data.engines_completed?.length > 0 && (
                  <span className="text-[10px] text-gray-400">
                    ({data.engines_completed.join(", ")})
                  </span>
                )}
                {doneAt && (
                  <span className="ml-auto text-[10px] text-gray-400 font-mono">
                    {fmtClock(doneAt)}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </SectionCard>

      {/* ③ 逐引擎明细 */}
      <SectionCard title="逐引擎明细" bodyClassName="p-0">
        {data.by_engine.length === 0 ? (
          <div className="p-4">
            <EmptyBlock text={running ? "引擎尚未产出记录…" : "无引擎记录"} />
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-xs uppercase border-b border-gray-100">
                <tr>
                  <th className="text-left py-2.5 px-3 font-semibold">引擎</th>
                  <th className="text-left py-2 px-2 font-semibold">状态</th>
                  <th className="text-right py-2 px-2 font-semibold">耗时</th>
                  <th className="text-right py-2 px-2 font-semibold">发现</th>
                  <th className="text-right py-2 px-2 font-semibold">token</th>
                  <th className="text-left py-2 px-2 font-semibold">模型</th>
                </tr>
              </thead>
              <tbody>
                {data.by_engine.map((e) => (
                  <tr
                    key={e.engine}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-3 font-mono text-xs text-gray-900">
                      {e.engine}
                    </td>
                    <td className="py-2 px-2 text-xs">
                      <span
                        className={
                          e.status === "ok"
                            ? "text-green-600"
                            : e.status === "error"
                              ? "text-red-600"
                              : "text-gray-500"
                        }
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-700">
                      {e.elapsed_seconds}s
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-900">
                      {e.findings}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-500 text-xs">
                      {e.total_tokens || "—"}
                    </td>
                    <td className="py-2 px-2 text-gray-500 text-xs font-mono">
                      {e.model ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

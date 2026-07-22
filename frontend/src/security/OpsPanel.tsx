// 运维面板 — 一键「重建并部署扫描器」(内部工具)。
// 点按钮 → 二次确认 → 后端 docker.sock 跑 `docker compose build scanner && up -d scanner`,
// 后端后台执行、前端轮询状态 + 实时日志尾巴。构建中禁用按钮。
// 注:重建期间 scanner 会短暂重启,在跑的扫描会被 scanner FIX-009 自动续跑。
import * as Dialog from "@radix-ui/react-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { SectionCard } from "@/components/security/ui"
import { SecurityApi, scannerErrorDetail } from "@/security/api"
import { useOpsStatus } from "@/security/hooks"

const STATUS_META: Record<string, { label: string; cls: string }> = {
  idle: { label: "空闲", cls: "bg-gray-100 text-gray-500 border-gray-200" },
  running: {
    label: "构建中",
    cls: "bg-blue-50 text-blue-600 border-blue-100",
  },
  success: {
    label: "成功",
    cls: "bg-green-50 text-green-600 border-green-100",
  },
  failed: { label: "失败", cls: "bg-red-50 text-red-600 border-red-100" },
}

export function OpsPanel() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data } = useOpsStatus(false) // 组件内根据 status 决定是否快轮询
  const running = data?.status === "running"
  // running 时用一个额外的快轮询 hook 实例(同 queryKey,react-query 去重)
  useOpsStatus(running)

  const redeploy = useMutation({
    mutationFn: SecurityApi.redeployScanner,
    onSuccess: (res) => {
      if (res.already_running) {
        toast.info("已有重建在进行中")
      } else {
        toast.success("已开始重建并部署扫描器")
      }
      setOpen(false)
      qc.invalidateQueries({ queryKey: ["security", "ops", "scanner-status"] })
    },
    onError: (err) => toast.error(`触发失败:${scannerErrorDetail(err)}`),
  })

  const meta = STATUS_META[data?.status ?? "idle"] ?? STATUS_META.idle
  const took =
    data?.started_at && data?.finished_at
      ? Math.round(
          (new Date(data.finished_at).getTime() -
            new Date(data.started_at).getTime()) /
            1000,
        )
      : null

  return (
    <SectionCard title="运维操作">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-900 font-medium">扫描器 scanner</span>
            <span
              className={`text-xs rounded px-1.5 py-0.5 border ${meta.cls}`}
            >
              {meta.label}
              {running && data?.step ? `·${data.step}` : ""}
            </span>
            {took !== null && data?.status !== "running" && (
              <span className="text-xs text-gray-400">
                上次 {took}s{data?.returncode ? ` (rc=${data.returncode})` : ""}
              </span>
            )}
          </div>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                disabled={running || redeploy.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {running ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                重建并部署扫描器
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-100 bg-white p-6 shadow-xl focus:outline-none">
                <Dialog.Title className="text-base font-bold text-gray-900">
                  确认重建并部署扫描器
                </Dialog.Title>
                <Dialog.Description className="mt-1.5 text-sm text-gray-500">
                  将{" "}
                  <span className="font-mono">
                    docker compose build scanner && up -d scanner
                  </span>
                  ,用最新代码重建镜像并重启。
                </Dialog.Description>
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0 text-amber-500" />
                  <span>
                    重建期间 scanner 会短暂重启;正在跑的扫描会被自动标记
                    <span className="font-semibold">已中断</span>并从断点
                    <span className="font-semibold">自动续跑</span>(FIX-009)。
                    构建约需几分钟。
                  </span>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
                    >
                      取消
                    </button>
                  </Dialog.Close>
                  <button
                    type="button"
                    onClick={() => redeploy.mutate()}
                    disabled={redeploy.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {redeploy.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    确认重建
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        {/* 实时日志尾巴 */}
        {data?.log && data.log.length > 0 && (
          <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 text-gray-100 text-[11px] leading-relaxed p-3 font-mono whitespace-pre-wrap">
            {data.log.join("\n")}
          </pre>
        )}
      </div>
    </SectionCard>
  )
}

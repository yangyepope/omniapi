// 可复用「触发扫描」按钮 — 点击弹二次确认框,确认后才真正下发扫描。
// 确认框用 Radix Dialog 原语拿无障碍(焦点陷阱/Esc/遮罩点击),但全部套字面亮色
// 类,规避安全区 F-004 坑(shadcn dialog 的 bg-background 等语义 token 会随 .dark 变深色)。
// 若该服务已有扫描在运行,框内给琥珀色提示;成功/失败仍走 sonner,成功后失效相关 query。
import * as Dialog from "@radix-ui/react-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2, RadioTower } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { SecurityApi, scannerErrorDetail } from "@/security/api"
import { useScanRuns } from "@/security/hooks"

type Props = {
  service: string
  gitRef?: string
  disabled?: boolean
}

export function TriggerScanButton({ service, gitRef, disabled }: Props) {
  const qc = useQueryClient()
  // 确认框开合:承载「二次确认」这一步
  const [open, setOpen] = useState(false)
  // 取该服务最近一次扫描,判断是否正在运行。limit=1 与 scans 页 useScanRuns 同 query
  // key,react-query 天然去重,不产生额外请求;30s 心跳刷新让 isRunning 保持新鲜。
  const runs = useScanRuns(service, 1)
  const isRunning = runs.data?.[0]?.status === "running"

  const trigger = useMutation({
    mutationFn: () => SecurityApi.triggerScan(service, gitRef),
    onSuccess: (res) => {
      toast.success(
        `已下发扫描:${service}${res.sha ? ` @ ${res.sha.slice(0, 8)}` : ""}`,
      )
      qc.invalidateQueries({ queryKey: ["security", "scan-runs"] })
      qc.invalidateQueries({ queryKey: ["security", "services"] })
      setOpen(false) // 下发成功后关闭确认框
    },
    onError: (err) => toast.error(`触发扫描失败:${scannerErrorDetail(err)}`),
  })

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* asChild:把触发行为挂到既有蓝色主按钮上;disabled 时原生 button 不响应点击,框不会打开 */}
      <Dialog.Trigger asChild>
        <button
          type="button"
          disabled={disabled || !service || trigger.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          <RadioTower className="w-4 h-4" />
          触发扫描
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-100 bg-white p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-base font-bold text-gray-900">
            确认触发扫描
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm text-gray-500">
            将对服务{" "}
            <span className="font-mono font-semibold text-gray-900">
              {service}
            </span>{" "}
            触发一次扫描(分支{" "}
            <span className="font-mono">{gitRef ?? "服务配置分支"}</span>)。
          </Dialog.Description>

          {/* 已在运行:琥珀色提示,提示但不硬拦——scanner 有 resume/去重,且 running 可能滞后 */}
          {isRunning && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0 text-amber-500" />
              <span>
                该服务已有扫描正在<span className="font-semibold">运行中</span>
                。重复触发会再下发一次任务(scanner 按 SHA
                去重/排队),通常无需重复触发。
              </span>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 cursor-pointer"
              >
                取消
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => trigger.mutate()}
              disabled={trigger.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {trigger.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RadioTower className="w-4 h-4" />
              )}
              确认触发
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default TriggerScanButton

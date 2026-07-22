// 「同步组」弹窗:对已有项目重扫其 GitLab 组,只新增未注册仓库 + 补 webhook。
// group_path 由父页从项目现有服务的 repo_url 推导预填(deriveGroupPath),用户可改。
// 仿 ProjectCreateDialog:Radix Dialog + 受控 useState + useMutation + sonner + invalidate。
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, RefreshCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { SecurityApi, type SyncGroupResp, scannerErrorDetail } from "./api"
import { Field, inputCls } from "./formKit"

const STATUS_TEXT: Record<SyncGroupResp["items"][number]["status"], string> = {
  new: "新增",
  "already-registered": "已存在",
  supplemented: "补建 webhook",
  "conflict-other-project": "冲突(属别项目)",
  error: "失败",
}

export function SyncGroupDialog({
  projectKey,
  initialGroupPath,
  open,
  onOpenChange,
}: {
  projectKey: string
  initialGroupPath: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const [groupPath, setGroupPath] = useState(initialGroupPath)
  const [result, setResult] = useState<SyncGroupResp | null>(null)

  const sync = useMutation({
    mutationFn: () =>
      SecurityApi.syncProjectGroup(projectKey, {
        group_path: groupPath.trim(),
      }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["security", "project-services"] })
      qc.invalidateQueries({ queryKey: ["security", "projects"] })
      qc.invalidateQueries({ queryKey: ["security", "services"] })
      setResult(d)
      toast.success(
        `同步完成:新增 ${d.added}、已存在 ${d.skipped}、冲突 ${d.conflicts}`,
      )
    },
    onError: (err) => toast.error(`同步失败:${scannerErrorDetail(err)}`),
  })

  const canSubmit = groupPath.trim() && !sync.isPending

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-gray-100 shadow-xl p-5 focus:outline-none">
          <DialogPrimitive.Title className="text-base font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600" /> 同步 GitLab 组
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-gray-500 mt-1">
            重扫该组,只把尚未注册的仓库加进本项目并补建 webhook;已注册仓库不动。
            组地址已按现有服务预填,可修改。
          </DialogPrimitive.Description>

          <div className="mt-4">
            <Field
              label="GitLab 组地址"
              hint="如 iam/middleground(含子组一并递归)"
            >
              <input
                className={`${inputCls} font-mono`}
                value={groupPath}
                onChange={(e) => setGroupPath(e.target.value)}
                placeholder="group/subgroup"
              />
            </Field>
          </div>

          {result && (
            <div className="mt-4 max-h-60 overflow-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <tbody>
                  {result.items.map((it) => (
                    <tr
                      key={it.repo_url}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="px-3 py-1.5 font-medium text-gray-800">
                        {it.name}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {STATUS_TEXT[it.status]}
                      </td>
                      <td className="px-3 py-1.5 text-gray-400">
                        webhook:{it.webhook}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={sync.isPending}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              {result ? "关闭" : "取消"}
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => sync.mutate()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {sync.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {result ? "再次同步" : "开始同步"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

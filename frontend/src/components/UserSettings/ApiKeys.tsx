import { useState } from "react"
import { useForm } from "react-hook-form"
import {
  FiCheck,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiKey,
  FiPlus,
  FiTrash2,
} from "react-icons/fi"
import { LuLoader } from "react-icons/lu"
import { fmtDate } from "@/lib/format"
import type { ApiKeyCreate, ApiKeyPublic } from "../../client"
import { useApiKeys } from "../../hooks/useApiKeys"
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"

const ApiKeys = () => {
  // 从自定义钩子中获取 API 密钥的查询、创建和删除等变动方法
  const { apiKeysQuery, createApiKeyMutation, deleteApiKeyMutation } =
    useApiKeys()
  // 初始化剪贴板复制钩子
  const [copiedText, copy] = useCopyToClipboard()
  // 控制“生成新密钥”对话框的显示状态
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  // 临时存储新生成的密钥明文，仅在创建成功后显示一次
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  // 跟踪当前在表格中明文显示的密钥 ID
  const [showFullKeyId, setShowFullKeyId] = useState<string | null>(null)
  // 存储待确认删除的密钥 ID
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // 初始化 React Hook Form，并设置默认值
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ApiKeyCreate>({
    defaultValues: {
      name: "",
      description: "",
    },
  })

  // 处理新密钥的创建提交逻辑
  const onSubmit = async (data: ApiKeyCreate) => {
    try {
      // 调用变动方法向后端发送创建请求
      const result = await createApiKeyMutation.mutateAsync({
        requestBody: data,
      })
      // 保存并显示返回的密钥内容
      setNewlyCreatedKey(result.key)
      // 关闭创建窗口并重置表单内容
      setIsCreateOpen(false)
      reset()
    } catch (_error) {
      // 错误已由变动钩子的 Toast 全局处理
    }
  }

  // 触发删除确认对话框
  const handleDelete = (id: string) => {
    setDeleteConfirmId(id)
  }

  // 执行最终的删除 API 调用
  const confirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteApiKeyMutation.mutateAsync(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  // 处理文本复制操作
  const handleCopy = (text: string) => {
    copy(text)
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shadow-sm border border-blue-100">
              <FiKey className="w-5 h-5" />
            </div>
            API 密钥管理
          </h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-xl">
            管理用于编程访问的密钥。出于安全考虑，密钥在创建后仅会显示一次，请务必妥善保存。
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/10 rounded-2xl px-6 h-12 font-black uppercase tracking-widest text-xs gap-2"
        >
          <FiPlus className="w-4 h-4" />
          生成新密钥
        </Button>
      </div>

      <div className="w-full">
        {apiKeysQuery.isLoading ? (
          <div className="flex h-64 items-center justify-center bg-gray-50/50 rounded-[2.5rem] border border-gray-100/50">
            <LuLoader className="h-10 w-10 animate-spin text-blue-600/40" />
          </div>
        ) : (
          <div className="rounded-[2.5rem] border border-gray-100 overflow-hidden bg-white shadow-sm transition-all hover:shadow-xl hover:border-blue-50 duration-500">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">
                    名称
                  </TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">
                    密钥预览
                  </TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">
                    调用次数
                  </TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">
                    最后使用
                  </TableHead>
                  <TableHead className="text-right px-8 font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeysQuery.data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-gray-400 font-medium"
                    >
                      暂未创建任何 API 密钥，开始生成您的第一个凭据吧。
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeysQuery.data?.data.map((key: ApiKeyPublic) => (
                    <TableRow
                      key={key.id}
                      className="group border-gray-50 hover:bg-blue-50/20 transition-colors"
                    >
                      <TableCell className="font-black text-gray-900 px-8 py-6 tracking-tight">
                        {key.name || "未命名密钥"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 font-mono text-xs">
                          <span className="text-gray-500 font-bold bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 group-hover:bg-white group-hover:border-blue-100 transition-all">
                            {showFullKeyId === key.id
                              ? key.key
                              : `••••••••${key.key.slice(-8)}`}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            onClick={() =>
                              setShowFullKeyId(
                                showFullKeyId === key.id ? null : key.id,
                              )
                            }
                          >
                            {showFullKeyId === key.id ? (
                              <FiEyeOff size={14} />
                            ) : (
                              <FiEye size={14} />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center rounded-xl bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-600 border border-blue-100/50">
                          {key.total_calls} 次调用
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 font-bold">
                        {key.last_used_at
                          ? fmtDate(key.last_used_at)
                          : "从未访问"}
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(key.id)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all rounded-full h-9 w-9"
                          disabled={deleteApiKeyMutation.isPending}
                        >
                          <FiTrash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-gray-50 border-b border-gray-100">
            <DialogTitle className="flex items-center gap-4 text-2xl font-black text-gray-900 tracking-tight">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
                <FiKey className="w-6 h-6" />
              </div>
              生成新 API 密钥
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-medium py-2">
              请为该密钥提供一个描述性名称。该名称将帮助您在密钥列表中快速识别其用途。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="space-y-3">
              <Label
                htmlFor="name"
                className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1"
              >
                密钥名称
              </Label>
              <Input
                id="name"
                placeholder="例如：主仪表盘访问密钥"
                {...register("name", { required: true })}
                className="h-14 rounded-2xl bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white transition-all font-bold text-gray-900"
              />
            </div>
            <div className="space-y-3">
              <Label
                htmlFor="description"
                className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1"
              >
                描述 (可选)
              </Label>
              <Input
                id="description"
                placeholder="简述该密钥的使用场景..."
                {...register("description")}
                className="h-14 rounded-2xl bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white transition-all font-bold text-gray-900"
              />
            </div>
            <DialogFooter className="pt-4 flex !justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="h-12 rounded-2xl px-8 font-bold text-gray-500 hover:bg-gray-100"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-2xl px-10 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-black"
              >
                {isSubmitting ? (
                  <LuLoader className="mr-2 animate-spin w-4 h-4" />
                ) : (
                  <FiPlus className="mr-2 w-4 h-4" />
                )}
                生成密钥凭据
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disclosure Dialog (Show newly created key) */}
      <Dialog
        open={!!newlyCreatedKey}
        onOpenChange={(open: boolean) => !open && setNewlyCreatedKey(null)}
      >
        <DialogContent className="sm:max-w-[560px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-green-50 border-b border-green-100">
            <DialogTitle className="flex items-center gap-4 text-2xl font-black text-green-700 tracking-tight">
              <div className="p-3 rounded-2xl bg-green-100 text-green-600 shadow-sm border border-green-200">
                <FiCheck className="w-6 h-6" />
              </div>
              密钥生成成功
            </DialogTitle>
            <DialogDescription className="text-green-700/70 font-bold py-2 leading-relaxed">
              请立即复制并妥善保存此 API
              密钥。此密钥**仅显示一次**，出于安全考虑，系统不会再次展示原始密钥。
            </DialogDescription>
          </DialogHeader>
          <div className="p-8">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex items-center justify-between gap-6 group hover:border-green-200 transition-all">
              <code className="font-mono break-all text-xs flex-1 text-gray-900 font-black leading-relaxed">
                {newlyCreatedKey}
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-12 w-12 rounded-xl text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all shrink-0 border border-transparent hover:border-green-100"
                onClick={() => newlyCreatedKey && handleCopy(newlyCreatedKey)}
              >
                {copiedText ? <FiCheck size={18} /> : <FiCopy size={18} />}
              </Button>
            </div>
            <DialogFooter className="mt-8">
              <Button
                className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black shadow-lg shadow-green-600/20 text-sm uppercase tracking-[0.2em]"
                onClick={() => setNewlyCreatedKey(null)}
              >
                我已经备份并保存了密钥
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open: boolean) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <FiTrash2 />
              删除 API 密钥？
            </DialogTitle>
            <DialogDescription>
              这是一个不可逆的操作。该密钥将被<strong>永久删除</strong>
              。所有使用此密钥的应用将立即失效。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteApiKeyMutation.isPending}
            >
              {deleteApiKeyMutation.isPending ? (
                <LuLoader className="mr-2 animate-spin" />
              ) : (
                <FiTrash2 className="mr-2" />
              )}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ApiKeys

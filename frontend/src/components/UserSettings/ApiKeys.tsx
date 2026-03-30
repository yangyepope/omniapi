import { useState } from "react"
import { useForm } from "react-hook-form"
import {
  FiCopy,
  FiCheck,
  FiPlus,
  FiTrash2,
  FiKey,
  FiEye,
  FiEyeOff,
} from "react-icons/fi"
import { LuLoader } from "react-icons/lu"

import {
  type ApiKeyCreate,
  type ApiKeyPublic,
} from "../../client"
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
import { useApiKeys } from "../../hooks/useApiKeys"
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard"

const ApiKeys = () => {
  const { apiKeysQuery, createApiKeyMutation, deleteApiKeyMutation } =
    useApiKeys()
  const [copiedText, copy] = useCopyToClipboard()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [showFullKeyId, setShowFullKeyId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

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

  const onSubmit = async (data: ApiKeyCreate) => {
    try {
      const result = await createApiKeyMutation.mutateAsync({
        requestBody: data,
      })
      setNewlyCreatedKey(result.key)
      setIsCreateOpen(false)
      reset()
    } catch (error) {
      // Error handled by mutation toast
    }
  }

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteApiKeyMutation.mutateAsync(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  const handleCopy = (text: string) => {
    copy(text)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
            <FiKey className="text-primary-fixed" />
            API 密钥管理
          </h3>
          <p className="text-sm text-on-surface-variant">管理用于编程访问的密钥。出于安全考虑，密钥在创建后仅会显示一次。</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shrink-0">
          <FiPlus className="mr-2" />
          生成新密钥
        </Button>
      </div>

      <div className="w-full">
        {apiKeysQuery.isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <LuLoader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border border-outline-variant overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">名称</TableHead>
                  <TableHead>密钥预览</TableHead>
                  <TableHead className="text-center">调用次数</TableHead>
                  <TableHead>最后使用</TableHead>
                  <TableHead className="text-right px-4">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeysQuery.data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-on-surface-variant">
                      暂未创建任何 API 密钥
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeysQuery.data?.data.map((key: ApiKeyPublic) => (
                    <TableRow key={key.id} className="group">
                      <TableCell className="font-medium px-4">
                        {key.name || "未命名密钥"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-mono text-sm">
                          <span className="text-on-surface-variant">
                            {showFullKeyId === key.id ? key.key : `••••••••${key.key.slice(-8)}`}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setShowFullKeyId(showFullKeyId === key.id ? null : key.id)}
                          >
                            {showFullKeyId === key.id ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center rounded-md bg-primary-fixed/10 px-2 py-0.5 text-xs font-medium text-primary-fixed">
                          {key.total_calls}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-on-surface-variant">
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString("zh-CN")
                          : "从未访问"}
                      </TableCell>
                      <TableCell className="text-right px-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(key.id)}
                          className="text-on-surface-variant hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          disabled={deleteApiKeyMutation.isPending}
                        >
                          <FiTrash2 size={15} />
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FiKey />
              生成新 API 密钥
            </DialogTitle>
            <DialogDescription>
              请为该密钥提供一个描述性名称。该名称将帮助您在密钥列表中快速识别其用途。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="name">密钥名称</Label>
              <Input
                id="name"
                placeholder="例如：主仪表盘访问密钥"
                {...register("name", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述 (可选)</Label>
              <Input
                id="description"
                placeholder="简述该密钥的使用场景..."
                {...register("description")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <LuLoader className="mr-2 animate-spin" /> : <FiPlus className="mr-2" />}
                确认生成密钥
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <FiCheck />
              密钥生成成功
            </DialogTitle>
            <DialogDescription>
              请立即复制并妥善保存此 API 密钥。此密钥仅显示一次，出于安全考虑，系统不会再次展示原始密钥。
            </DialogDescription>
          </DialogHeader>
          <div className="bg-surface-container rounded-lg p-4 flex items-center justify-between gap-3 my-2">
            <code className="font-mono break-all text-sm flex-1">{newlyCreatedKey}</code>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => newlyCreatedKey && handleCopy(newlyCreatedKey)}
            >
              {copiedText ? <FiCheck size={18} /> : <FiCopy size={18} />}
            </Button>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setNewlyCreatedKey(null)}>
              我已经备份了此密钥
            </Button>
          </DialogFooter>
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
              这是一个不可逆的操作。该密钥将被<strong>永久删除</strong>。所有使用此密钥的应用将立即失效。
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
              {deleteApiKeyMutation.isPending ? <LuLoader className="mr-2 animate-spin" /> : <FiTrash2 className="mr-2" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


export default ApiKeys

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  type ApiError,
  SystemModulesService,
  type SystemModuleUpdate,
} from "@/client"
import useCustomToast from "./useCustomToast"

/**
 * useSystemModules Hook - 管理服务模块的变更逻辑（更新与删除）
 */
export const useSystemModules = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // --- 更新模块 (状态/负责人等) ---
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; requestBody: SystemModuleUpdate }) =>
      SystemModulesService.updateSystemModule({
        moduleId: data.id,
        requestBody: data.requestBody,
      }),
    onSuccess: () => {
      // 成功后失效查询，触发 UI 重新加载统计数据
      queryClient.invalidateQueries({ queryKey: ["system-modules"] })
      showSuccessToast("服务信息已持久化")
    },
    onError: (err: ApiError) => {
      const errDetail = (err.body as any)?.detail || "操作失败"
      showErrorToast(errDetail as string)
    },
  })

  // --- 删除模块 ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      SystemModulesService.deleteSystemModule({ moduleId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-modules"] })
      showSuccessToast("该服务及其关联数据已从系统中清理")
    },
    onError: (err: ApiError) => {
      const errDetail = (err.body as any)?.detail || "删除过程中发生错误"
      showErrorToast(errDetail as string)
    },
  })

  return {
    updateModule: updateMutation,
    deleteModule: deleteMutation,
    isLoading: updateMutation.isPending || deleteMutation.isPending,
  }
}

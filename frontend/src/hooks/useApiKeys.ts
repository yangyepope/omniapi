import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type ApiKeysCreateApiKeyData, ApiKeysService } from "../client"
import useCustomToast from "./useCustomToast"

export const useApiKeys = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const apiKeysQuery = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => ApiKeysService.readApiKeys(),
  })

  const createApiKeyMutation = useMutation({
    mutationFn: (data: ApiKeysCreateApiKeyData) =>
      ApiKeysService.createApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
      showSuccessToast("API key created successfully")
    },
    onError: (error: any) => {
      showErrorToast(error.message || "Failed to create API key")
    },
  })

  const deleteApiKeyMutation = useMutation({
    mutationFn: (id: string) => ApiKeysService.deleteApiKey({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
      showSuccessToast("API key deleted successfully")
    },
    onError: (error: any) => {
      showErrorToast(error.message || "Failed to delete API key")
    },
  })

  return {
    apiKeysQuery,
    createApiKeyMutation,
    deleteApiKeyMutation,
  }
}

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { FiAlertTriangle } from "react-icons/fi"

import { UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { LoadingButton } from "@/components/ui/loading-button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const DeleteConfirmation = () => {
  // 获取全局查询客户端实例以管理缓存失效
  const queryClient = useQueryClient()
  // 初始化自定义 Toast 钩子
  const { showSuccessToast, showErrorToast } = useCustomToast()
  // 简易表单处理，主要用于拦截原生提交事件
  const { handleSubmit } = useForm()
  // 获取退出登录方法，用于销毁本地会话
  const { logout } = useAuth()

  // 定义删除账户的变动逻辑
  const mutation = useMutation({
    // 调用后端 API 删除当前用户
    mutationFn: () => UsersService.deleteUserMe(),
    onSuccess: () => {
      // 显示成功提示并强制退出登录
      showSuccessToast("您的账户已成功注销")
      logout()
    },
    // 将错误处理绑定至全局错误处理器
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      // 无论结果如何，失效当前用户信息缓存以防残留
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })

  // 处理最终的表单提交事件并发起变动请求
  const onSubmit = async () => {
    mutation.mutate()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-600/20 px-8 h-12 uppercase tracking-widest text-[10px] gap-2 transition-all hover:scale-105 active:scale-95">
          <FiAlertTriangle className="w-4 h-4" />
          立即注销账户
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader className="p-8 bg-red-50 border-b border-red-100">
            <DialogTitle className="text-2xl font-black text-red-600 tracking-tight flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-red-600 text-white shadow-lg">
                <FiAlertTriangle className="w-6 h-6" />
              </div>
              账户注销确认
            </DialogTitle>
            <DialogDescription className="text-red-700/60 font-bold py-2 leading-relaxed">
              这是一个**不可逆**的操作。一旦确认，您的所有关联数据将被**永久性抹除**且无法找回。
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 bg-white">
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
              如果您确认要继续，请点击下方黑色确认按钮。退出操作后，您将立即被强制注销当前会话。
            </p>
            
            <DialogFooter className="flex !justify-between gap-4">
              <DialogClose asChild>
                <Button variant="ghost" disabled={mutation.isPending} className="h-12 rounded-2xl px-8 font-bold text-gray-500 hover:bg-gray-100">
                  返回安全地带
                </Button>
              </DialogClose>
              <LoadingButton
                type="submit"
                loading={mutation.isPending}
                className="h-12 rounded-2xl px-10 bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-600/20 font-black uppercase tracking-widest text-xs"
              >
                确认彻底注销
              </LoadingButton>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


export default DeleteConfirmation

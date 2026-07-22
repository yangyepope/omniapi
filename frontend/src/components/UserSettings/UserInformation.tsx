import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import {
  FiCheckCircle,
  FiEdit2,
  FiInfo,
  FiMail,
  FiShield,
  FiUser,
} from "react-icons/fi"
import { z } from "zod"

import { UsersService, type UserUpdateMe } from "@/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z.object({
  full_name: z.string().max(30).optional(),
  email: z.string().min(1, { message: "请输入用户名或邮箱" }), // 登录标识(用户名或邮箱):与后端放宽后的 str 校验对齐
})

type FormData = z.infer<typeof formSchema>

const UserInformation = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [editMode, setEditMode] = useState(false)
  const { user: currentUser } = useAuth()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      full_name: currentUser?.full_name ?? undefined,
      email: currentUser?.email,
    },
  })

  const toggleEditMode = () => {
    setEditMode(!editMode)
  }

  const mutation = useMutation({
    mutationFn: (data: UserUpdateMe) =>
      UsersService.updateUserMe({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("个人资料更新成功")
      toggleEditMode()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries()
    },
  })

  const onSubmit = (data: FormData) => {
    const updateData: UserUpdateMe = {}

    if (data.full_name !== currentUser?.full_name) {
      updateData.full_name = data.full_name
    }
    if (data.email !== currentUser?.email) {
      updateData.email = data.email
    }

    mutation.mutate(updateData)
  }

  const onCancel = () => {
    form.reset()
    toggleEditMode()
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-right-4 duration-500">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Full Name Field */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-bold text-gray-500 flex items-center gap-2 px-1">
                    <FiUser className="text-blue-600" />
                    真实姓名 / 昵称
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Input
                        type="text"
                        {...field}
                        disabled={!editMode}
                        className={`
                          h-14 px-4 bg-gray-50 border-2 transition-all duration-300 rounded-2xl text-gray-900 font-medium
                          ${editMode ? "border-blue-600/50 focus:border-blue-600 shadow-sm" : "border-transparent opacity-80 cursor-default bg-gray-50 shadow-none"}
                        `}
                        placeholder="尚未设置姓名"
                      />
                      {!editMode && field.value && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <FiCheckCircle className="text-blue-600/40" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-medium px-1" />
                </FormItem>
              )}
            />

            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-bold text-gray-500 flex items-center gap-2 px-1">
                    <FiMail className="text-blue-600" />
                    绑定的电子邮箱
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Input
                        type="email"
                        {...field}
                        disabled={!editMode}
                        className={`
                          h-14 px-4 bg-gray-50 border-2 transition-all duration-300 rounded-2xl text-gray-900 font-medium
                          ${editMode ? "border-blue-600/50 focus:border-blue-600 shadow-sm" : "border-transparent opacity-80 cursor-default bg-gray-50 shadow-none"}
                        `}
                        placeholder="example@domain.com"
                      />
                      {!editMode && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <FiShield className="text-blue-600/40" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-medium px-1" />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-100 mt-8">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="p-2 rounded-full bg-gray-50">
                <FiInfo className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xs leading-relaxed max-w-sm font-medium">
                {editMode
                  ? "编辑模式下，您可以修改展示名称和电子邮箱。邮箱是您的重要登录凭据，请确保其准确性。"
                  : "个人资料信息已锁定。如需修改，请点击下方的编辑按钮开启编辑模式。"}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {editMode ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="flex-1 sm:flex-none hover:bg-gray-100 text-gray-500 rounded-full px-6 font-bold"
                    disabled={mutation.isPending}
                  >
                    取消变更
                  </Button>
                  <LoadingButton
                    type="submit"
                    loading={mutation.isPending}
                    disabled={!form.formState.isDirty}
                    className="flex-1 sm:flex-none bg-blue-600 text-white hover:bg-blue-700 rounded-full px-8 shadow-lg shadow-blue-600/20 font-black"
                  >
                    确认保存
                  </LoadingButton>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={toggleEditMode}
                  className="w-full sm:w-auto bg-gray-50 text-gray-900 hover:bg-gray-100 rounded-full px-8 gap-2 border border-gray-200 font-black transition-all shadow-sm"
                >
                  <FiEdit2 className="h-4 w-4" />
                  编辑个人资料
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>

      {/* Account Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
        {[
          {
            label: "账号状态",
            value: "活跃中",
            icon: FiCheckCircle,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "安全等级",
            value: "正常",
            icon: FiShield,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "所属角色",
            value: currentUser?.is_superuser ? "超级管理员" : "标准用户",
            icon: FiUser,
            color: "text-gray-500",
            bg: "bg-gray-50",
          },
        ].map((item, idx) => (
          <Card
            key={idx}
            className={`${item.bg} border-gray-100 shadow-none rounded-[1.5rem] transition-transform hover:scale-[1.02]`}
          >
            <CardContent className="p-6 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 opacity-60">
                  {item.label}
                </span>
                <item.icon className={`h-4 w-4 ${item.color} opacity-40`} />
              </div>
              <span className={`text-xl font-black ${item.color}`}>
                {item.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default UserInformation

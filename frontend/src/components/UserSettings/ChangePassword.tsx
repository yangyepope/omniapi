import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { type UpdatePassword, UsersService } from "@/client"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { LoadingButton } from "@/components/ui/loading-button"
import { PasswordInput } from "@/components/ui/password-input"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z
  .object({
    current_password: z
      .string()
      .min(1, { message: "Password is required" })
      .min(6, { message: "Password must be at least 6 characters" }),
    new_password: z
      .string()
      .min(1, { message: "Password is required" })
      .min(6, { message: "Password must be at least 6 characters" }),
    confirm_password: z
      .string()
      .min(1, { message: "Password confirmation is required" }),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "The passwords don't match",
    path: ["confirm_password"],
  })

type FormData = z.infer<typeof formSchema>

const ChangePassword = () => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    criteriaMode: "all",
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: UpdatePassword) =>
      UsersService.updatePasswordMe({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("密码已成功更新")
      form.reset()
    },
    onError: handleError.bind(showErrorToast),
  })

  const onSubmit = async (data: FormData) => {
    mutation.mutate(data)
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">
          修改登录密码
        </h3>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          定期更换密码可以显著提高您的账户安全性。建议使用包含字母、数字和特殊字符的复杂组合。
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="current_password"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">
                  当前旧密码
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    id="current_password"
                    placeholder="请输入当前密码"
                    {...field}
                    className="h-14 bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white rounded-2xl transition-all font-bold text-gray-900"
                  />
                </FormControl>
                <FormMessage className="text-xs font-bold px-1" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">
                    新登录密码
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="new_password"
                      placeholder="设置新密码"
                      {...field}
                      className="h-14 bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white rounded-2xl transition-all font-bold text-gray-900"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold px-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">
                    确认新密码
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="confirm_password"
                      placeholder="再次输入新密码"
                      {...field}
                      className="h-14 bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white rounded-2xl transition-all font-bold text-gray-900"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold px-1" />
                </FormItem>
              )}
            />
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <LoadingButton
              type="submit"
              loading={mutation.isPending}
              className="h-12 rounded-2xl px-12 bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-600/20 font-black uppercase tracking-widest text-xs"
            >
              更新安全密码
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default ChangePassword

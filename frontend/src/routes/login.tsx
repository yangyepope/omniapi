import { createFileRoute } from "@tanstack/react-router"
import { ArrowRight, Fingerprint, Key, Lock, Mail, Shield } from "lucide-react"
import { motion } from "motion/react"
import { useForm } from "react-hook-form"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/login")({
  component: Login,
})

function Login() {
  const { loginMutation } = useAuth()
  const { register, handleSubmit } = useForm<AccessToken>()

  const onSubmit = (data: AccessToken) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="bg-background text-on-surface h-screen flex overflow-hidden font-sans">
      {/* Left Panel: Brand & Visuals */}
      <div className="hidden lg:flex w-7/12 relative items-center justify-center p-20 overflow-hidden h-full bg-[#040f1c]">
        {/* Nebula Background */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(0, 93, 170, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(0, 117, 213, 0.1) 0%, transparent 50%)
            `,
          }}
        />
        {/* Cyber Pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Zenith Rings */}
        <div className="absolute w-[800px] h-[800px] pointer-events-none opacity-40">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-primary-fixed/10 rounded-full scale-100 opacity-20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-primary-fixed/10 rounded-full scale-90 opacity-40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] border border-primary-fixed/10 rounded-full scale-75 opacity-60" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] border border-primary-fixed/20 rounded-full scale-50 opacity-80" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 blur-xl bg-[radial-gradient(circle,rgba(0,117,213,0.4)_0%,transparent_70%)]" />
        </div>

        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center">
          <header className="mb-24">
            <h1 className="text-6xl text-white font-light tracking-[0.2em] mb-6 drop-shadow-sm">
              流量大师<span className="font-black">安全哨兵</span>
            </h1>
            <p className="text-primary-container/60 text-sm tracking-[0.5em] uppercase font-bold">
              Digital Sentinel • Absolute Assurance • Zenith Guard
            </p>
          </header>

          <div className="grid grid-cols-3 gap-12 w-full">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 group relative bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.2)]">
                <div className="absolute inset-0 bg-primary-fixed/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                <div className="w-10 h-10 rounded-full border border-primary-fixed/40 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-primary-fixed/60 shadow-[0_0_15px_rgba(0,93,170,0.8)]" />
                </div>
              </div>
              <h3 className="text-white/60 text-[10px] tracking-[0.3em] uppercase mb-1 font-bold">
                防御矩阵
              </h3>
              <p className="text-white/90 text-xs font-light">持续强化</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 group relative bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.2)]">
                <div className="absolute inset-0 bg-secondary-fixed/10 blur-xl opacity-100 transition-opacity rounded-full" />
                <div className="w-12 h-12 flex items-center justify-center relative">
                  <svg
                    className="w-full h-full text-secondary-fixed/40"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="30"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <Shield className="absolute text-secondary-fixed w-4 h-4 opacity-80" />
                </div>
              </div>
              <h3 className="text-white/60 text-[10px] tracking-[0.3em] uppercase mb-1 font-bold">
                运行能效
              </h3>
              <p className="text-white/90 text-xs font-light">稳健运行</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 group relative bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.2)]">
                <div className="w-8 h-8 flex flex-col justify-center gap-1">
                  <div className="h-[1px] w-full bg-white/20" />
                  <div className="h-[1px] w-2/3 bg-primary-container shadow-[0_0_8px_rgba(0,117,213,0.6)]" />
                  <div className="h-[1px] w-full bg-white/20" />
                </div>
              </div>
              <h3 className="text-white/60 text-[10px] tracking-[0.3em] uppercase mb-1 font-bold">
                全球态势
              </h3>
              <p className="text-white/90 text-xs font-light">全域响应</p>
            </div>
          </div>

          <div className="mt-24 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="absolute bottom-12 left-0 right-0 flex justify-center text-white/20 text-[9px] tracking-[0.4em] uppercase font-bold">
          © 2026 TrafficMaster Security &nbsp; | &nbsp; Zenith Guard Protocol
          v3.0
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-5/12 bg-surface flex items-center justify-center p-8 sm:p-16 h-full overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md my-auto"
        >
          <div className="lg:hidden flex flex-col items-center mb-12">
            <h1 className="text-2xl font-black text-primary-fixed tracking-tight">
              流量大师安全哨兵
            </h1>
            <div className="w-12 h-px bg-primary-fixed mt-3" />
          </div>

          <header className="mb-12">
            <h2 className="text-3xl font-black text-on-surface tracking-tight mb-2">
              欢迎回来
            </h2>
            <p className="text-on-surface-variant text-sm font-medium">
              请验证您的安全凭证以进入系统
            </p>
          </header>

          <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1"
              >
                用户名 / 邮箱
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-primary-fixed transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="username"
                  data-testid="email-input"
                  {...register("username", {
                    required: "Username is required",
                  })}
                  type="text"
                  placeholder="admin@trafficmaster.com"
                  className="block w-full pl-11 pr-4 py-4 rounded-md bg-surface-container-highest border-b-2 border-transparent focus:bg-surface-container-lowest focus:border-primary-fixed focus:ring-0 transition-all outline-none text-on-surface placeholder:text-on-surface-variant/40 font-medium shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label
                  htmlFor="password"
                  className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant"
                >
                  访问凭证
                </label>
                <a
                  href="#"
                  className="text-[10px] uppercase tracking-widest font-bold text-primary-fixed hover:text-primary-container transition-colors"
                >
                  找回凭证
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-primary-fixed transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  data-testid="password-input"
                  {...register("password", {
                    required: "Password is required",
                  })}
                  type="password"
                  placeholder="••••••••••••"
                  className="block w-full pl-11 pr-12 py-4 rounded-md bg-surface-container-highest border-b-2 border-transparent focus:bg-surface-container-lowest focus:border-primary-fixed focus:ring-0 transition-all outline-none text-on-surface placeholder:text-on-surface-variant/40 font-medium shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center ml-1">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="h-4 w-4 rounded-sm border-outline-variant/50 text-primary-fixed focus:ring-primary-fixed focus:ring-offset-0 bg-surface-container-highest cursor-pointer"
              />
              <label
                htmlFor="remember"
                className="ml-2.5 block text-xs font-medium text-on-surface-variant cursor-pointer"
              >
                维持当前会话安全连接
              </label>
            </div>

            <button
              type="submit"
              data-testid="login-button"
              disabled={loginMutation.isPending}
              className="w-full py-4 px-6 bg-primary-fixed hover:bg-primary-container text-on-primary rounded-md font-bold text-base shadow-[0_8px_30px_rgba(0,93,170,0.12)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 group mt-2 disabled:opacity-50"
            >
              <span>
                {loginMutation.isPending ? "验证中..." : "进入控制中心"}
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="relative py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/15" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50">
                <span className="px-4 bg-surface">多因子身份认证</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-outline-variant/10 hover:bg-outline-variant/20 text-primary-fixed transition-all duration-200 group"
              >
                <Key className="w-4 h-4 text-on-surface-variant group-hover:text-primary-fixed transition-colors" />
                <span className="text-xs font-bold">SSO 登录</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-outline-variant/10 hover:bg-outline-variant/20 text-primary-fixed transition-all duration-200 group"
              >
                <Fingerprint className="w-4 h-4 text-on-surface-variant group-hover:text-primary-fixed transition-colors" />
                <span className="text-xs font-bold">安全令牌</span>
              </button>
            </div>
          </form>

          <footer className="mt-16 text-center">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60">
              需要技术支援？{" "}
              <a href="#" className="text-primary-fixed hover:underline ml-1">
                联系安全响应小组
              </a>
            </p>
          </footer>
        </motion.div>
      </div>
    </div>
  )
}

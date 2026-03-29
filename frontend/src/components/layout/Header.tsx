import { Bell, Search, Shield, User, LogOut } from "lucide-react"
import { motion } from "motion/react"
import useAuth from "@/hooks/useAuth"
import { Link } from "@tanstack/react-router"

export function Header() {
  const { user: currentUser, logout } = useAuth()

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 w-full h-16 flex items-center justify-between px-6 gap-8 bg-surface/80 backdrop-blur-xl shadow-sm shadow-primary/5 z-50 border-b border-outline-variant/20"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <Shield className="text-primary-fixed w-7 h-7 fill-primary-fixed/20" />
          <div className="absolute inset-0 bg-primary-fixed/20 blur-md rounded-full -z-10" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-black tracking-tight text-primary-fixed leading-none">流量大师</span>
          <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase leading-none mt-1">Security Sentinel</span>
        </div>
        <div className="hidden md:flex items-center gap-6 ml-8">
          <Link 
            to="/services" 
            className="text-on-surface-variant hover:text-primary-fixed hover:border-b-2 hover:border-primary-fixed pb-1 transition-all font-medium cursor-pointer"
            activeProps={{ className: "text-primary-fixed font-semibold border-b-2 border-primary-fixed pb-1" }}
          >
            服务管理
          </Link>
          <a className="text-on-surface-variant hover:text-primary-fixed transition-colors font-medium cursor-pointer">全局搜索</a>
          <a className="text-on-surface-variant hover:text-primary-fixed transition-colors font-medium cursor-pointer">重放任务</a>
        </div>
      </div>
      
      <div className="flex-1 max-w-xl hidden md:flex">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary-fixed transition-colors" />
          <input 
            type="text" 
            placeholder="搜索服务、流量、任务..." 
            className="w-full bg-surface-container-highest/40 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-fixed/20 transition-all outline-none text-on-surface placeholder:text-on-surface-variant/60"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-full hover:bg-primary-fixed/10 transition-all active:scale-95 text-on-surface-variant hover:text-primary-fixed">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-tertiary rounded-full border border-surface" />
        </button>
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/10">
          <div className="w-6 h-6 rounded-full bg-primary-fixed/20 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-primary-fixed" />
          </div>
          <span className="text-xs font-bold text-on-surface truncate max-w-[100px]">
            {currentUser?.full_name || currentUser?.email || "User"}
          </span>
          <button 
            onClick={logout}
            className="p-1 px-1.5 hover:bg-tertiary/10 text-on-surface-variant hover:text-tertiary transition-colors rounded"
            title="退出登录"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.header>
  )
}

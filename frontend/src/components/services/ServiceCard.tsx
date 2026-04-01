import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Server, Trash2, Edit2, ArrowRight, ChevronDown, Check, X, Clock, CalendarOff } from "lucide-react"

import { type SystemModuleStats } from "@/client"
import { useSystemModules } from "@/hooks/useSystemModules"
import { cn } from "@/lib/utils"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

/**
 * 格式化相对时间
 */
function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "从无流量记录"
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "刚刚"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分钟前`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小时前`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} 天前`
  
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/**
 * ServiceCard 组件 - 遵循 Stitch 设计语言同步的高保真服务卡片
 */
export function ServiceCard({ module, onClick }: { module: SystemModuleStats; onClick: () => void }) {
  const { updateModule, deleteModule } = useSystemModules()
  
  // --- 负责人编辑状态管理 ---
  const [isEditingOwner, setIsEditingOwner] = useState(false)
  const [tempOwner, setTempOwner] = useState(module.owner || "未指定")
  
  // --- 删除确认弹窗状态 ---
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // --- 状态切换逻辑 ---
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const handleUpdateStatus = (newStatus: 'active' | 'deprecated') => {
    updateModule.mutate({
      id: module.id,
      requestBody: { status: newStatus }
    })
    setShowStatusMenu(false)
  }

  const handleUpdateOwner = () => {
    if (tempOwner !== module.owner) {
      updateModule.mutate({
        id: module.id,
        requestBody: { owner: tempOwner }
      })
    }
    setIsEditingOwner(false)
  }

  const handleDelete = () => {
    deleteModule.mutate(module.id, {
      onSuccess: () => setIsDeleteDialogOpen(false)
    })
  }

  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={() => !isEditingOwner && !showStatusMenu && onClick()}
      className="group bg-white border border-gray-100 hover:border-blue-200 transition-all duration-300 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:shadow-blue-50 cursor-pointer flex flex-col h-full relative"
    >
      {/* 头部区域：左侧服务图标，右侧状态指示器与删除操作 */}
      <div className="flex justify-between items-start mb-10">
        <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
          <Server className="w-8 h-8" />
        </div>
        
        <div className="flex items-center gap-2">
          {/* 状态选择器 */}
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu) }}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-full border text-[11px] font-bold tracking-tight transition-all",
                module.status === 'active' 
                  ? "bg-green-50 text-green-700 border-green-100/50" 
                  : "bg-red-50 text-red-600 border-red-100/50"
              )}
            >
              <span className={cn(
                "w-2 h-2 rounded-full",
                module.status === 'active' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"
              )} />
              {module.status === 'active' ? "ACTIVE" : "DEPRECATED"}
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showStatusMenu && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showStatusMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 py-2 w-36 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => handleUpdateStatus('active')}
                    className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-green-50 text-green-700 flex items-center justify-between"
                  >
                    Active {module.status === 'active' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('deprecated')}
                    className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-red-50 text-red-700 flex items-center justify-between border-t border-gray-50"
                  >
                    Deprecated {module.status === 'deprecated' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-red-500 text-white border-none font-bold">
                  删除服务
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DialogContent className="rounded-[2.5rem] p-10 max-w-sm border-none shadow-2xl bg-white" onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                  <Trash2 className="w-8 h-8" />
                </div>
                <DialogTitle className="text-xl font-black text-center text-gray-900 tracking-tight">
                  确认彻底删除？
                </DialogTitle>
                <DialogDescription className="text-center text-gray-500 font-medium leading-relaxed mt-4 text-sm">
                  确定要移除服务 <span className="text-red-600 font-bold">[{module.name}]</span> 吗？<br />
                  这将会永久清理相关的资产，操作无法撤销。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-8 sm:justify-center gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="rounded-2xl px-6 h-11 font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  取消
                </Button>
                <Button 
                  onClick={handleDelete}
                  disabled={deleteModule.isPending}
                  className="rounded-2xl px-8 h-11 bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  {deleteModule.isPending ? "正在清理..." : "确认删除"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 内容主体：服务名称及活跃信息 */}
      <div className="mb-8">
        <div className="flex justify-between items-start gap-4 mb-4">
          <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight uppercase group-hover:text-blue-600 transition-colors">
            {module.name}
          </h3>
          {module.status === 'deprecated' && module.deprecated_at && (
            <div className="flex flex-col items-end shrink-0">
               <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">弃用于</span>
               <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                 <CalendarOff className="w-3 h-3" />
                 {new Date(module.deprecated_at).toLocaleDateString('zh-CN')}
               </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-4 py-1.5 border-y border-gray-50/50">
          {/* 左侧：责任人 */}
          <div className="relative group/owner min-h-[20px] flex-1">
            {isEditingOwner ? (
              <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-lg border border-blue-100/50" onClick={(e) => e.stopPropagation()}>
                <input 
                  autoFocus
                  className="bg-transparent border-none outline-none text-[11px] font-black text-blue-700 w-full"
                  value={tempOwner}
                  onChange={(e) => setTempOwner(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateOwner()}
                />
                <button onClick={handleUpdateOwner} className="text-blue-600 rounded hover:bg-blue-100/50"><Check className="w-3 h-3" /></button>
              </div>
            ) : (
              <div 
                className="flex items-center gap-1.5 text-gray-500 cursor-pointer group/text"
                onClick={(e) => { e.stopPropagation(); setIsEditingOwner(true) }}
              >
                <span className="opacity-30 uppercase text-[8px] font-black tracking-widest shrink-0">Owner:</span>
                <span className="text-xs font-black text-gray-900 border-b border-dashed border-transparent group-hover/text:border-blue-400 group-hover/text:text-blue-600 transition-all truncate">
                  {module.owner || "Unknown"}
                </span>
              </div>
            )}
          </div>

          {/* 右侧：活跃时间 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className={cn("w-3 h-3", module.last_active_at ? "text-blue-400/50" : "text-gray-200")} />
            <span className="text-[10px] font-black text-gray-400 tabular-nums">
              {formatRelativeTime(module.last_active_at)}
            </span>
          </div>
        </div>
      </div>

      {/* 数据网格：同步 Stitch 的 3 栏 Bento Grid 布局 */}
      <div className="grid grid-cols-3 gap-0.5 bg-gray-100/50 border border-gray-100 rounded-[2rem] overflow-hidden mb-10 shadow-inner">
        <div className="bg-white p-5 text-center transition-colors group-hover:bg-blue-50/20">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">总流量</p>
          <p className="text-xl font-black text-blue-600 leading-none tracking-tighter">
            {(module.total_traffic_count || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-5 text-center transition-colors group-hover:bg-blue-50/20 border-x border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">唯一流量</p>
          <p className="text-xl font-black text-gray-900 leading-none tracking-tighter">
            {(module.unique_traffic_count || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-5 text-center transition-colors group-hover:bg-blue-50/20">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">接口数</p>
          <p className="text-xl font-black text-gray-900 leading-none tracking-tighter">
            {module.interfaces || 0}
          </p>
        </div>
      </div>

      {/* 底部功能区：引导进入接口详情矩阵 */}
      <div className="mt-auto pt-6 border-t border-gray-50 group-hover:border-blue-100 transition-colors">
        <div className="flex items-center justify-center gap-3 text-gray-400 group-hover:text-blue-600 font-black text-[11px] uppercase tracking-[0.2em] transition-all">
          <span>进入接口列表</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
        </div>
      </div>
    </motion.div>
  )
}

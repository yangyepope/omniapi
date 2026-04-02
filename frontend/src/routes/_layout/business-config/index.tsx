import { createFileRoute } from "@tanstack/react-router"
import { motion, AnimatePresence } from "motion/react"
import { useState } from "react"
import { 
  Network, 
  Shield, 
  Activity, 
  Zap, 
  RotateCcw, 
  Download, 
  Plus, 
  Edit3,
  LayoutGrid
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DataGovernanceView } from "@/components/BusinessConfig/DataGovernance"

export const Route = createFileRoute("/_layout/business-config/")({
  component: BusinessConfigCenter,
})

/**
 * 全局配置中心 - 高保真重构版本 (v2.0)
 * 
 * 核心设计决策：
 * 1. 采用内部分栏布局 (Internal Sidebar + Content Area)，严格对齐 Stitch 原型。
 * 2. MD3 设计语言：rounded-[3rem] 超大圆角容器，气泡式激活菜单。
 * 3. 按照 01 规范：高密度中文逐行注释。
 */

function BusinessConfigCenter() {
  const [activeTab, setActiveTab] = useState("route-mapping")

  const menuItems: { id: string; label: string; icon: any; description: string; isDanger?: boolean }[] = [
    { id: "route-mapping", label: "路由映射", icon: Network, description: "管理进入系统的流量路由与微服务对应关系" },
    { id: "normalization", label: "归一化规则", icon: Shield, description: "管理全局路径归一化与流量聚合规则" },
    { id: "traffic-control", label: "流量处理与频率限制", icon: Zap, description: "限制请求体大小与全局 IP 访问频率" },
    { id: "replay-config", label: "重放测试配置", icon: RotateCcw, description: "配置流量重放的目标环境与并发策略" },
    { id: "automation", label: "自动化策略", icon: Activity, description: "设置数据定期清理与接口状态维护周期" },
    { id: "endpoint-status", label: "接口状态维护", icon: LayoutGrid, description: "监控与手动调整各个微服务的接口健康度" },
    { id: "data-governance", label: "全局数据治理", icon: Shield, description: "控制全网流量采集开关与安全回流拦截拦截拦截防线", isDanger: true },
  ]

  const activeTabDetails = menuItems.find(item => item.id === activeTab) || menuItems[0]

  return (
    <div className="flex flex-col gap-10 w-full max-w-7xl mx-auto px-6 py-12">
      {/* 头部标题区域：对齐系统设置的高保真风格 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-[1.5rem] bg-blue-50 border border-blue-100 shadow-sm transition-transform hover:scale-110">
            <LayoutGrid className="text-4xl text-blue-600 w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-gray-900">全局配置中心</h1>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest opacity-60">集中管理全网流量安全审计路由、数据归一化与策略维护</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-2xl h-14 px-8 border-gray-100 font-bold text-gray-600 flex gap-2 hover:bg-gray-50 hover:border-gray-200 transition-all">
            <Download className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
            导出配置 (JSON)
          </Button>
          <Button className="rounded-2xl h-14 px-10 bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 font-black transition-all active:scale-95">
            保存所有更改
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* 左侧侧边栏导航：同步 Settings 样式的胶囊菜单 */}
        <aside className="w-full lg:w-72 flex flex-col gap-2 sticky top-24">
          <div className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            配置菜单
          </div>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 relative overflow-hidden
                ${activeTab === item.id 
                  ? "text-white shadow-xl shadow-blue-600/20" 
                  : "text-gray-500 hover:bg-blue-50/50 hover:text-blue-600"}
                ${item.isDanger && activeTab !== item.id ? "text-red-400/80 hover:bg-red-50/50 hover:text-red-500" : ""}
              `}
            >
              {activeTab === item.id ? (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute inset-0 bg-blue-600 z-0"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              ) : (
                <div className={cn(
                  "absolute left-0 w-1.5 h-0 rounded-full transition-all duration-300 group-hover:h-6",
                  item.isDanger ? "bg-red-500" : "bg-blue-600"
                )} />
              )}
              
              <div className="relative z-10 flex items-center gap-4 w-full">
                <item.icon className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  activeTab === item.id ? "scale-110" : "group-hover:scale-125"
                )} />
                <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-auto"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  </motion.div>
                )}
              </div>
            </button>
          ))}
        </aside>

        {/* 右侧主内容区域：标准化高圆角白板容器 */}
        <main className="flex-1 min-w-0 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-10 lg:p-12 shadow-sm hover:shadow-xl hover:border-blue-50 transition-all duration-500 relative overflow-hidden group min-h-[600px]"
            >
              {/* 背景动态光晕对齐系统风格 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/20 rounded-full -mr-32 -mt-32 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              
              <div className="relative z-10">
                <div className="mb-12 flex justify-between items-start border-b border-gray-100 pb-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                      <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
                      {activeTabDetails.label}
                    </h2>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-xl">{activeTabDetails.description}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all duration-300">
                    <activeTabDetails.icon className="h-6 w-6" />
                  </div>
                </div>
                
                <div className="min-h-[400px]">
                  {activeTab === "route-mapping" && <RouteMappingView key="route" />}
                  {activeTab === "traffic-control" && <TrafficControlView key="traffic" />}
                  {activeTab === "automation" && <AutomationPolicyView key="automation" />}
                  {activeTab === "replay-config" && <ReplayTestingView key="replay" />}
                  {activeTab === "data-governance" && <DataGovernanceView key="gov" />}
                  {/* 其他 Tab 占位逻辑 */}
                  {!["route-mapping", "traffic-control", "automation", "replay-config", "data-governance"].includes(activeTab) && (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-300 text-lg font-bold italic tracking-widest opacity-40">
                       <LayoutGrid className="w-12 h-12 mb-4 animate-pulse" />
                       VIEW DEVELOPING...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

/**
 * 子视图 1：路由映射 (Image 1)
 */
function RouteMappingView() {
  const routes = [
    { prefix: "/*", service: "gateway-orchestrator", tag: "Top-level", owner: "系统管理员", group: "System", initials: "TM" },
    { prefix: "/api/v1/auth/*", service: "identity-service", tag: "", owner: "李卓", group: "Security", initials: "LZ" },
    { prefix: "/api/v1/orders/*", service: "transaction-engine", tag: "", owner: "王伟", group: "Core", initials: "WW" },
  ]
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-10"
    >
      <div className="flex justify-between items-end mb-8 border-l-4 border-blue-600 pl-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">上游服务路由映射</h3>
          <p className="text-sm text-gray-500 mt-2 font-medium">管理进入系统的流量路由。确保每个 API 路径都被正确路由到对应的微服务，并指定安全责任人。</p>
        </div>
        <Button variant="ghost" className="text-blue-600 font-black flex gap-2 items-center hover:bg-blue-50 rounded-xl py-3 px-4">
           <Plus className="w-4 h-4" /> 新增映射
        </Button>
      </div>

      <div className="overflow-hidden border border-gray-100 rounded-[2rem]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">路由前缀</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">微服务名称</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">默认责任人</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {routes.map((r, i) => (
              <tr key={i} className="group hover:bg-blue-50/30 transition-colors">
                <td className="px-8 py-6">
                  <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold font-mono tracking-tight group-hover:bg-white">{r.prefix}</span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
                       <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{r.service}</p>
                      {r.tag && <p className="text-[10px] font-bold text-gray-400">({r.tag})</p>}
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-[10px] font-black border border-white">
                      {r.initials}
                    </div>
                    <p className="text-xs font-bold text-gray-600">{r.owner} <span className="text-gray-400 font-medium">({r.group})</span></p>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="p-3 text-gray-300 hover:text-blue-600 transition-colors">
                    <Edit3 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

/**
 * 子视图 2：流量处理与频率限制 (Image 2)
 */
function TrafficControlView() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="grid grid-cols-2 gap-16"
    >
      <div className="space-y-12">
        <div className="border-l-4 border-blue-600 pl-6 mb-12">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">流量处理与频率限制</h3>
        </div>

        <div className="space-y-8">
           <div className="flex justify-between">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">最大请求体限制 (MB)</p>
              <p className="text-sm font-black text-blue-600">10 MB</p>
           </div>
           <div className="h-2 w-full bg-gray-100 rounded-full relative">
              <div className="absolute h-full w-[10%] bg-blue-600 rounded-full" />
              <div className="absolute top-1/2 left-[10%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border-[4px] border-blue-600 rounded-full shadow-lg" />
           </div>
           <div className="flex justify-between text-[10px] font-bold text-gray-400">
              <span>1MB</span>
              <span>100MB</span>
           </div>
           <p className="text-[10px] text-gray-400 leading-relaxed italic font-medium">限制单个 HTTP 请求 Body 的最大允许尺寸，防止资源消耗尽攻击。</p>
        </div>

        <div className="space-y-8 pt-6">
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest">全局 IP 频率限制 (REQ/S)</p>
           <div className="bg-gray-50 rounded-[1.5rem] p-6 flex justify-between items-center border border-transparent focus-within:border-blue-100 focus-within:bg-white transition-all">
              <span className="text-2xl font-black text-gray-900 tracking-tight">100</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">REQ/S</span>
           </div>
           <p className="text-[10px] text-gray-400 leading-relaxed italic font-medium">设置单个 IP 每秒允许发起最高请求数量，超出限制将返回 429 错误。</p>
        </div>
      </div>

      <div className="space-y-12">
        <div className="space-y-6">
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest">排除的请求头 (EXCLUDED HEADERS)</p>
           <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 flex flex-wrap gap-2">
              {['Date', 'Cookie', 'Authorization'].map(tag => (
                <div key={tag} className="bg-white border border-gray-100 py-3 px-5 rounded-2xl flex items-center gap-3 text-xs font-bold text-gray-700 shadow-sm">
                  {tag} <X className="w-3 h-3 text-gray-300" />
                </div>
              ))}
              <button className="flex items-center gap-2 px-5 text-blue-600 font-bold text-xs ring-1 ring-blue-50 rounded-2xl bg-white hover:bg-blue-50 transition-colors">
                 <Plus className="w-3 h-3" /> 新增
              </button>
           </div>
           <p className="text-[10px] text-gray-400 italic">审计时将忽略这些敏感或不相关的请求头。</p>
        </div>

        <div className="space-y-6 pt-6">
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest">排除的 BODY 字段 (EXCLUDED FIELDS)</p>
           <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 flex flex-wrap gap-2">
              {['timestamp', 'nonce', 'sign'].map(tag => (
                <div key={tag} className="bg-white border border-gray-100 py-3 px-5 rounded-2xl flex items-center gap-3 text-xs font-bold text-gray-700 shadow-sm">
                  {tag} <X className="w-3 h-3 text-gray-300" />
                </div>
              ))}
              <button className="flex items-center gap-2 px-5 text-blue-600 font-bold text-xs ring-1 ring-blue-50 rounded-2xl bg-white hover:bg-blue-50 transition-colors">
                 <Plus className="w-3 h-3" /> 新增
              </button>
           </div>
           <p className="text-[10px] text-gray-400 italic">审计日志脱敏：在存储 Body 时删除这些指定的字段。</p>
        </div>

        <div className="flex justify-end pt-8">
           <Button className="rounded-2xl h-14 px-10 bg-blue-600 text-white font-black shadow-xl shadow-blue-500/20">更新处理策略</Button>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * 子视图 3：自动化策略 (Image 3)
 */
function AutomationPolicyView() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-16"
    >
      <div className="space-y-10">
        <div className="border-l-4 border-blue-600 pl-6">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">数据清理策略</h3>
        </div>
        
        <div className="space-y-6">
          <p className="text-xs font-black text-gray-400 tracking-widest uppercase">原始流量清理周期</p>
          <div className="flex gap-1 bg-gray-50 p-1 rounded-2xl border border-gray-100 w-fit">
            {["3天", "5天", "7天 (默认)", "14天"].map((tab) => (
              <button
                key={tab}
                className={`px-8 py-3 rounded-[1rem] text-sm font-bold transition-all ${
                  tab.includes("7天") 
                    ? "bg-blue-600 text-white shadow-lg" 
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400 italic font-medium pt-2">
             <LayoutGrid className="w-3.5 h-3.5 text-blue-300" />
             过期的原始流量数据将被永久删除以节省存储空间。聚合后的统计数据不受此配置影响。
          </div>
        </div>
      </div>

      <div className="space-y-10 pt-8">
        <div className="border-l-4 border-blue-600 pl-6">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">接口状态维护</h3>
        </div>
        
        <div className="space-y-8">
           <p className="text-xs font-black text-gray-400 tracking-widest uppercase">废弃判定周期 (天)</p>
           <div className="bg-gray-50 rounded-[1.5rem] p-6 flex justify-between items-center border border-transparent max-w-xl group-focus-within:border-blue-100 group-focus-within:bg-white transition-all">
              <span className="text-2xl font-black text-gray-900 tracking-tight">30</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DAYS</span>
           </div>
           <div className="bg-blue-50/50 p-6 rounded-[1.5rem] border border-blue-100/20 max-w-xl flex items-center justify-between group">
              <p className="text-xs font-bold text-blue-700/60">连续无流量请求超过此周期将自动标记为 <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[9px] uppercase tracking-tighter">Deprecated</span></p>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
           </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * 子视图 4：重放测试配置 (Image 4)
 */
function ReplayTestingView() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="grid grid-cols-2 gap-16"
    >
      <div className="space-y-12">
        <div className="border-l-4 border-blue-600 pl-6 mb-12">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">重放测试配置</h3>
        </div>

        <div className="space-y-5">
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest">默认重放目标环境</p>
           <div className="bg-gray-50 rounded-[1.5rem] p-6 border border-transparent focus-within:border-blue-100 focus-within:bg-white transition-all flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">http://test-env.internal</span>
              <LinkIcon className="w-4 h-4 text-gray-300" />
           </div>
           <p className="text-[10px] text-gray-400 italic">指定流量重放时的默认后端目标地址。</p>
        </div>

        <div className="space-y-8 pt-4">
           <div className="flex justify-between">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">默认并发数</p>
              <p className="text-sm font-black text-blue-600">10</p>
           </div>
           <div className="h-2 w-full bg-gray-100 rounded-full relative">
              <div className="absolute h-full w-[10%] bg-blue-600 rounded-full" />
              <div className="absolute top-1/2 left-[10%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border-[4px] border-blue-600 rounded-full shadow-lg" />
           </div>
           <div className="flex justify-between text-[10px] font-bold text-gray-400">
              <span>1</span>
              <span>100</span>
           </div>
           <p className="text-[10px] text-gray-400 italic">设置执行重放测试时的默认并发线程数。</p>
        </div>

        <div className="space-y-8 pt-4">
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest">请求间隔 (MS)</p>
           <div className="bg-gray-50 rounded-[1.5rem] p-6 flex justify-between items-center border border-transparent">
              <span className="text-2xl font-black text-gray-900 tracking-tight">0</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MS</span>
           </div>
        </div>
      </div>

      <div className="space-y-12">
        <div className="space-y-8">
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest">超时时间 (MS)</p>
           <div className="bg-gray-50 rounded-[1.5rem] p-6 flex justify-between items-center">
              <span className="text-2xl font-black text-gray-900 tracking-tight">30000</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MS</span>
           </div>
           <p className="text-[10px] text-gray-400 italic">单个请求的最大等待时间。</p>
        </div>

        <div className="bg-gray-50/50 p-10 rounded-[3rem] border border-gray-100 shadow-inner group">
           <div className="flex items-center gap-3 mb-10">
              <Zap className="w-5 h-5 text-blue-500 animate-pulse" />
              <h4 className="text-sm font-black text-gray-900">熔断策略阈值</h4>
           </div>
           <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">连续失败次数</p>
                 <div className="bg-white border border-gray-200 rounded-2xl p-4 text-xl font-black text-gray-900 text-center">5</div>
              </div>
              <div className="space-y-4">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">时间窗口 (S)</p>
                 <div className="bg-white border border-gray-200 rounded-2xl p-4 text-xl font-black text-gray-900 text-center">60</div>
              </div>
           </div>
           <p className="text-[10px] text-gray-400 leading-relaxed italic font-medium border-t border-gray-100 pt-6">当达到阈值时将自动停止重放任务，保护目标系统。</p>
        </div>

        <div className="flex justify-end pt-8">
           <Button className="rounded-2xl h-14 px-10 bg-blue-600 text-white font-black shadow-xl shadow-blue-500/20">更新重放配置</Button>
        </div>
      </div>
    </motion.div>
  )
}

function X(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  )
}

function LinkIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  )
}

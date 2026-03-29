import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, ChevronRight, Plus, Server, ShieldAlert, CreditCard, User, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "motion/react"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - OmniAPI",
      },
    ],
  }),
})

const services = [
  {
    id: "order-service",
    name: "order-service",
    owner: "张伟",
    status: "running",
    statusText: "运行中",
    lastActive: "2分钟前活跃",
    icon: Server,
    iconColor: "text-primary-fixed",
    iconBg: "bg-primary-fixed/5",
    stats: { total: "1,234", unique: "567", endpoints: "15" }
  },
  {
    id: "user-service",
    name: "user-service",
    owner: "李娜",
    status: "alert",
    statusText: "告警中",
    lastActive: "刚刚活跃",
    icon: ShieldAlert,
    iconColor: "text-tertiary",
    iconBg: "bg-tertiary/5",
    stats: { total: "8,442", unique: "1,021", endpoints: "24" }
  },
  {
    id: "payment-gateway",
    name: "payment-gateway",
    owner: "王强",
    status: "paused",
    statusText: "已暂停",
    lastActive: "5小时前活跃",
    icon: CreditCard,
    iconColor: "text-on-surface-variant",
    iconBg: "bg-on-surface-variant/5",
    stats: { total: "0", unique: "0", endpoints: "8" }
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
}

function Dashboard() {
  const { user: currentUser } = useAuth()

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-2 font-bold">
            <span>系统概览</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-primary-fixed">仪表面板</span>
          </nav>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">
            你好, {currentUser?.full_name || currentUser?.email || "管理员"} 👋
          </h2>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">欢迎回到流量大师安全控制中心</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="gap-2">
            导出报告
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary-fixed/20">
            <Plus className="w-4 h-4" />
            新增监控
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: "活跃服务", value: "42", sub: "+2 新增", color: "text-primary-fixed" },
          { label: "今日流量", value: "1.2M", sub: "+12.5%", color: "text-secondary-fixed" },
          { label: "拦截攻击", value: "842", sub: "安全合规", color: "text-tertiary" },
          { label: "系统健康", value: "99.9%", sub: "运行平稳", color: "text-secondary-fixed" }
        ].map((stat, i) => (
          <div key={i} className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm text-center md:text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{stat.label}</p>
            <div className="flex items-end gap-2 justify-center md:justify-start">
              <span className={`text-3xl font-black tracking-tighter ${stat.color}`}>{stat.value}</span>
              <span className="text-[10px] font-bold text-on-surface-variant/60 mb-1.5">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Content: Service List */}
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-on-surface tracking-tight font-headline">核心服务状态</h3>
            <Link to="/services" className="text-xs font-bold text-primary-fixed hover:underline flex items-center gap-1">
              查看全部 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {services.map((service) => (
              <motion.div 
                key={service.id} 
                variants={itemVariants}
                className="group bg-surface-container-low hover:bg-surface-container-lowest transition-all duration-300 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary-fixed/5 flex flex-col border border-transparent hover:border-outline-variant/15"
              >
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-lg ${service.iconBg} ${service.iconColor}`}>
                      <service.icon className="w-7 h-7" />
                    </div>
                    <Badge variant={service.status === 'running' ? 'success' : service.status === 'alert' ? 'danger' : 'neutral'}>
                      {service.statusText}
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-bold text-on-surface mb-1 truncate">{service.name}</h3>
                  <p className="text-xs text-on-surface-variant mb-6 flex items-center gap-1 font-medium">
                    <User className="w-3.5 h-3.5" />
                    责任人: {service.owner}
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2 bg-surface-container-lowest/50 rounded-lg p-3 border border-outline-variant/10">
                    <div className="text-center">
                      <p className="text-[9px] text-on-surface-variant uppercase font-bold">总流量</p>
                      <p className="text-base font-black text-primary-fixed">{service.stats.total}</p>
                    </div>
                    <div className="text-center border-x border-outline-variant/20">
                      <p className="text-[9px] text-on-surface-variant uppercase font-bold">唯一流量</p>
                      <p className="text-base font-black text-on-surface">{service.stats.unique}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-on-surface-variant uppercase font-bold">接口数</p>
                      <p className="text-base font-black text-on-surface">{service.stats.endpoints}</p>
                    </div>
                  </div>
                </div>
                
                <Link 
                  to="/services"
                  className="p-4 border-t border-outline-variant/10 group-hover:bg-primary-fixed group-hover:text-on-primary transition-colors cursor-pointer block"
                >
                  <div className="w-full flex items-center justify-center gap-2 text-xs font-bold">
                    <span>进入接口列表</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Sidebar: Activity/Alerts */}
        <div className="col-span-12 lg:col-span-4">
          <h3 className="text-xl font-black text-on-surface tracking-tight mb-6 font-headline">安全态势告警</h3>
          <div className="space-y-4">
            {[
              { title: "异常流量激增", time: "刚刚", type: "critical", desc: "user-service 发现异常 GET 请求负载" },
              { title: "未授权路径访问", time: "12分钟前", type: "warning", desc: "检测到对 /admin/config 的探测行为" },
              { title: "系统配置更新", time: "2小时前", type: "info", desc: "order-service 完成灰度版本部署" }
            ].map((alert, i) => (
              <div key={i} className="p-4 bg-surface-container-low rounded-xl border-l-4 border-l-primary-fixed/30 border border-outline-variant/5">
                <div className="flex justify-between items-start mb-1">
                   <h4 className="text-sm font-bold text-on-surface">{alert.title}</h4>
                   <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase">{alert.time}</span>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-2">{alert.desc}</p>
              </div>
            ))}
            
            <div className="p-6 bg-primary-fixed/5 rounded-2xl border border-primary-fixed/10 mt-6 relative overflow-hidden group">
              <div className="relative z-10">
                <ShieldCheck className="w-8 h-8 text-primary-fixed mb-4" />
                <h4 className="text-lg font-black text-primary-fixed mb-2">Zenith Guard Active</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">系统处于最高安全级别，所有流量均经过多重验证引擎审核。</p>
              </div>
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-primary-fixed/10 rounded-full blur-3xl group-hover:bg-primary-fixed/20 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

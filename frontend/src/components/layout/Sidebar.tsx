import { Link, useRouterState } from "@tanstack/react-router"
import {
  Activity,
  BarChart2,
  Boxes,
  Cpu,
  FolderKanban,
  Inbox,
  LayoutGrid,
  Monitor,
  Network,
  PlayCircle,
  Radar,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
} from "lucide-react"

export function Sidebar() {
  const router = useRouterState()
  const pathname = router.location.pathname

  const isDashboardActive = pathname === "/"
  const isServicesActive = pathname.startsWith("/services")

  // 分组导航:把「AI 安全」(gitlab-scan)与「流量劫持」两个领域彻底分开,
  // 不再混在一个扁平列表里。通用项(仪表面板/系统设置)放无标题组。
  const navGroups: {
    title?: string
    items: {
      to: string
      icon: typeof Activity
      label: string
      active: boolean
    }[]
  }[] = [
    {
      items: [
        {
          to: "/",
          icon: Activity,
          label: "仪表面板",
          active: isDashboardActive,
        },
      ],
    },
    {
      title: "AI 安全",
      items: [
        {
          to: "/security-dashboard",
          icon: Monitor,
          label: "总览大屏",
          active: pathname === "/security-dashboard",
        },
        {
          to: "/security/findings",
          icon: Inbox,
          label: "发现",
          // 列表 /security/findings 与详情 /security/findings/$id 都归本区
          active: pathname.startsWith("/security/findings"),
        },
        {
          to: "/security/services",
          icon: Boxes,
          label: "服务",
          // 服务清单 + 详情 /security/services/$name + 接口详情 /security/interfaces/$id
          active:
            pathname.startsWith("/security/services") ||
            pathname.startsWith("/security/interfaces"),
        },
        {
          to: "/security/system-profile",
          icon: Cpu,
          label: "系统画像",
          // 项目级系统画像:整个系统的技术栈/流程/暴露面/风险/渗透视角
          active: pathname.startsWith("/security/system-profile"),
        },
        {
          to: "/security/tasks",
          icon: Radar,
          label: "扫描",
          // 扫描区枢纽:运行记录(tasks)/成本明细(cost)/回归对比(regression);
          // 兼容旧的扫描管理路径 /security/scans。
          active:
            pathname.startsWith("/security/tasks") ||
            pathname.startsWith("/security/cost") ||
            pathname.startsWith("/security/regression") ||
            pathname.startsWith("/security/scans"),
        },
        {
          to: "/projects",
          icon: FolderKanban,
          label: "项目管理",
          // 项目列表(/projects)与项目详情(/projects/$key)都归本入口高亮
          active: pathname.startsWith("/projects"),
        },
        {
          to: "/security/config",
          icon: SlidersHorizontal,
          label: "全局配置",
          // 全局配置枢纽:全局参数(config)/扫描引擎(engines)/AI 分类(ai-rules)/规则与 Skills(rules)
          active:
            pathname.startsWith("/security/config") ||
            pathname.startsWith("/security/engines") ||
            pathname.startsWith("/security/ai-rules") ||
            pathname.startsWith("/security/rules"),
        },
      ],
    },
    {
      title: "流量劫持",
      items: [
        {
          to: "/services",
          icon: Network,
          label: "服务管理",
          active: isServicesActive,
        },
        {
          to: "/business-config",
          icon: LayoutGrid,
          label: "业务配置",
          active: pathname.startsWith("/business-config"),
        },
      ],
    },
    {
      items: [
        {
          to: "/settings",
          icon: Settings,
          label: "系统设置",
          active: pathname === "/settings",
        },
      ],
    },
  ]

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 flex flex-col p-6 gap-2 border-r border-gray-100 bg-white z-40 transition-all">
      {/* Brand Logo Section */}
      <div className="flex items-center gap-3 mb-10 px-2 mt-2">
        <div className="relative">
          <Shield className="text-blue-600 w-8 h-8 fill-blue-500/10" />
          <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full -z-10" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-gray-900 leading-none">
            流量大师
          </span>
          <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase leading-none mt-1">
            Security Sentinel
          </span>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navGroups.map((group, gi) => (
          <div
            key={group.title ?? `group-${gi}`}
            className={group.title ? "mt-3 first:mt-0" : ""}
          >
            {group.title && (
              <div className="px-3 mb-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                {group.title}
              </div>
            )}
            {group.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                  item.active
                    ? "bg-primary-fixed/10 text-primary-fixed shadow-sm border border-primary-fixed/20"
                    : "text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface hover:translate-x-1"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span
                  className={`text-sm ${
                    item.active ? "font-bold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        ))}

        <div className="mx-2 my-4 h-px bg-outline-variant/10" />

        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface hover:translate-x-1 transition-all duration-200 rounded-md"
        >
          <Search className="w-5 h-5" />
          <span className="text-sm font-medium">全局搜索</span>
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface hover:translate-x-1 transition-all duration-200 rounded-md"
        >
          <PlayCircle className="w-5 h-5" />
          <span className="text-sm font-medium">重放任务</span>
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface hover:translate-x-1 transition-all duration-200 rounded-md"
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-sm font-medium">统计分析</span>
        </a>
      </nav>

      <div className="mt-auto p-4 bg-surface-container rounded-xl border border-outline-variant/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse" />
          <span className="text-xs text-on-surface-variant font-bold">
            系统状态：安全
          </span>
        </div>
        <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <div className="h-full bg-secondary-fixed w-full transition-all duration-500" />
        </div>
      </div>
    </aside>
  )
}

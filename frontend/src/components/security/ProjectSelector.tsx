// 「当前项目」选择器 — 安全区顶栏下拉(scanner 多项目 FEAT-024/025)。
// 亮色套件字面类(不用会随 .dark 翻转的语义 token,见踩坑 F-004)。
// 数据源 SecurityApi.projects();当前值 / 切换走 useCurrentProject()。
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Check, ChevronDown, FolderKanban, Settings2 } from "lucide-react"
import { SecurityApi } from "@/security/api"
import { useCurrentProject } from "@/security/CurrentProjectProvider"

export function ProjectSelector() {
  const { project, setProject } = useCurrentProject()
  // 项目列表(与 Provider 校验共用同一 queryKey → 命中缓存,不重复请求)
  const { data, isLoading } = useQuery({
    queryKey: ["security", "projects"],
    queryFn: SecurityApi.projects,
    staleTime: 30_000,
  })
  const items = data?.items ?? []
  // 当前项目的展示名:找到用 name,找不到(列表未回来 / 幽灵 key)兜底显示 key
  const current = items.find((p) => p.key === project)
  const label = current?.name ?? project

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors outline-none focus:ring-1 focus:ring-blue-100"
          title="切换当前项目(数据按项目隔离)"
        >
          <FolderKanban className="w-4 h-4 text-blue-600" />
          <span className="max-w-[10rem] truncate">
            {isLoading ? "加载中…" : label}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[12rem] max-h-[60vh] overflow-auto rounded-xl bg-white border border-gray-100 shadow-xl p-1 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            当前项目
          </div>
          {items.length === 0 && !isLoading && (
            <div className="px-2.5 py-2 text-xs text-gray-400">暂无项目</div>
          )}
          {items.map((p) => (
            <DropdownMenu.Item
              key={p.key}
              onSelect={() => setProject(p.key)}
              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm text-gray-700 cursor-pointer outline-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700"
            >
              <span className="flex items-center gap-2 min-w-0">
                {/* 选中项打勾,未选留占位对齐 */}
                {p.key === project ? (
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                {/* enabled=false 项灰显 + 标注,提示其服务不参与扫描 */}
                <span
                  className={`truncate ${p.enabled ? "" : "text-gray-400"}`}
                >
                  {p.name}
                  {!p.enabled && "(停用)"}
                </span>
              </span>
              <span className="text-[10px] text-gray-400 shrink-0">
                {p.service_count} 服务
              </span>
            </DropdownMenu.Item>
          ))}
          {/* 分隔线 + 管理入口:选择器是用户接触项目的天然位置,从这里进管理页 */}
          <DropdownMenu.Separator className="my-1 h-px bg-gray-100" />
          <DropdownMenu.Item asChild>
            <Link
              to="/projects"
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-blue-600 cursor-pointer outline-none data-[highlighted]:bg-blue-50"
            >
              <Settings2 className="w-4 h-4 shrink-0" /> 管理项目 / 服务…
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

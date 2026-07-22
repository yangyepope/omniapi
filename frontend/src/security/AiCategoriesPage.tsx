// /security/ai-rules — AI 扫描规则(Hunt Category)管理页。
// 左:规则列表(按 sort_order),来源/启停/LLM 筛选 + 名称搜索;右:选中规则详情编辑。
// 视觉与交互对齐 扫描配置 / 扫描管理 页(安全区亮色套件、四态、sonner)。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, ScrollText } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Tag } from "@/components/security/badges"
import {
  Card,
  EmptyBlock,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from "@/components/security/ui"
import { AiCategoryCreateDialog } from "./AiCategoryCreateDialog"
import { AiCategoryEditor } from "./AiCategoryEditor"
import { SecurityApi, scannerErrorDetail } from "./api"
import { useAiCategories } from "./hooks"

type SourceFilter = "all" | "builtin" | "custom"
type EnabledFilter = "all" | "on" | "off"

export function AiCategoriesPage() {
  // 列表不带过滤参数(全量拉取),筛选在前端做——量小(~22 条),避免频繁重取
  const listQ = useAiCategories()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [source, setSource] = useState<SourceFilter>("all")
  const [enabled, setEnabled] = useState<EnabledFilter>("all")
  const [onlyLlm, setOnlyLlm] = useState(false)
  const [search, setSearch] = useState("")

  const all = listQ.data?.items ?? []
  const items = useMemo(() => {
    return all
      .filter((c) => (source === "all" ? true : c.source === source))
      .filter((c) =>
        enabled === "all" ? true : enabled === "on" ? c.enabled : !c.enabled,
      )
      .filter((c) => (onlyLlm ? c.is_llm_category : true))
      .filter((c) =>
        search ? c.name.toLowerCase().includes(search.toLowerCase()) : true,
      )
      .sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
      )
  }, [all, source, enabled, onlyLlm, search])

  // 首次加载完成自动选中第一条
  if (!selected && items.length > 0 && !listQ.isLoading) {
    setSelected(items[0].name)
  }

  // 列表行内快速启停(即时 PUT,不进编辑器 dirty)
  const toggle = useMutation({
    mutationFn: (p: { name: string; enabled: boolean }) =>
      SecurityApi.updateAiCategory(p.name, { enabled: p.enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "ai-categories"] })
      toast.success("已更新启停状态")
    },
    onError: (err) => toast.error(`更新失败:${scannerErrorDetail(err)}`),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        title="扫描类别"
        subtitle="按 category 组织的 AI 扫描规则集——编辑/启停/新增下次扫描热加载生效"
        actions={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> 新增自定义
          </button>
        }
      />

      {/* 筛选条 */}
      <Card className="p-3 flex items-center gap-2 flex-wrap">
        <Seg
          value={source}
          onChange={setSource}
          options={[
            ["all", "全部来源"],
            ["builtin", "内置"],
            ["custom", "自定义"],
          ]}
        />
        <Seg
          value={enabled}
          onChange={setEnabled}
          options={[
            ["all", "全部状态"],
            ["on", "已启用"],
            ["off", "已禁用"],
          ]}
        />
        <button
          type="button"
          onClick={() => setOnlyLlm((v) => !v)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
            onlyLlm
              ? "bg-blue-50 text-blue-600 border-blue-200"
              : "bg-white text-gray-500 border-gray-200"
          }`}
        >
          仅 LLM 规则
        </button>
        <input
          className="ml-auto border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 max-w-[220px] focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="搜索规则名…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左:规则列表 */}
        <div className="lg:col-span-1">
          <SectionCard title={`规则 (${items.length})`} bodyClassName="p-0">
            <div className="max-h-[calc(100vh-320px)] overflow-auto">
              {listQ.isLoading && <LoadingBlock />}
              {!listQ.isLoading && all.length === 0 && (
                <EmptyBlock text="未初始化——正常启动会自动 seed 22 条规则" />
              )}
              {!listQ.isLoading && all.length > 0 && items.length === 0 && (
                <EmptyBlock text="无匹配规则" />
              )}
              {items.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelected(c.name)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 transition ${
                    selected === c.name
                      ? "bg-blue-50 border-l-2 border-l-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-mono truncate ${
                        selected === c.name
                          ? "text-blue-600 font-bold"
                          : "text-gray-900"
                      }`}
                    >
                      {c.name}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {c.source === "custom" && <Tag>自定义</Tag>}
                      {c.is_llm_category && <Tag>LLM</Tag>}
                    </div>
                  </div>
                  {/* 行内快速启停 */}
                  <span
                    role="switch"
                    aria-checked={c.enabled}
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle.mutate({ name: c.name, enabled: !c.enabled })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation()
                        toggle.mutate({ name: c.name, enabled: !c.enabled })
                      }
                    }}
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer ${
                      c.enabled
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-gray-100 text-gray-400 border-gray-200"
                    }`}
                  >
                    {c.enabled ? "启用" : "禁用"}
                  </span>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* 右:选中规则编辑(key 切换即重置编辑草稿) */}
        <div className="lg:col-span-2">
          <SectionCard bodyClassName="p-0">
            {selected ? (
              <AiCategoryEditor key={selected} name={selected} />
            ) : (
              <EmptyBlock text="选择左侧一条规则查看/编辑" />
            )}
          </SectionCard>
        </div>
      </div>

      <AiCategoryCreateDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}

// 分段筛选器(单选胶囊组)
function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 text-xs font-semibold ${
            value === v
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

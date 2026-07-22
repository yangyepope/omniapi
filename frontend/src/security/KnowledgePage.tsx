// /security/knowledge — 知识摄取文档管理页。
// 三列:服务选择 → 该服务知识文档列表(可按 sha / 分类筛选)→ 选中文档详情编辑。
// fed_to_ai 关键展示;改分类为 ai_context 即纳入 AI 扫描。视觉对齐扫描管理页。
import { BookText, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import {
  EmptyBlock,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from "@/components/security/ui"
import type { Classification } from "./api"
import { useKnowledgeDocs, useServiceList } from "./hooks"
import { KnowledgeCreateDialog } from "./KnowledgeCreateDialog"
import { KnowledgeDetail } from "./KnowledgeDetail"
import { FedBadge } from "./knowledgeUtils"

export function KnowledgePage() {
  const services = useServiceList()
  const [service, setService] = useState<string | null>(null)

  const list = useMemo(
    () =>
      [...(services.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [services.data],
  )
  if (!service && list.length > 0 && !services.isLoading) {
    setService(list[0].name)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookText}
        title="知识摄取"
        subtitle="扫描时摄取的项目理解文档——只有分类为 ai_context 的才会喂给 AI"
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左:服务选择 */}
        <div className="lg:col-span-1">
          <SectionCard title={`服务 (${list.length})`} bodyClassName="p-0">
            <div className="max-h-[calc(100vh-260px)] overflow-auto">
              {services.isLoading && <LoadingBlock />}
              {list.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setService(s.name)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 transition ${
                    service === s.name
                      ? "bg-blue-50 border-l-2 border-l-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex-1 text-sm truncate ${
                      service === s.name
                        ? "text-blue-600 font-bold"
                        : "text-gray-900"
                    }`}
                  >
                    {s.name}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 ${service === s.name ? "text-blue-600" : "text-gray-300"}`}
                  />
                </button>
              ))}
              {list.length === 0 && !services.isLoading && (
                <EmptyBlock text="无服务" />
              )}
            </div>
          </SectionCard>
        </div>

        {/* 右:知识文档面板 */}
        <div className="lg:col-span-3">
          {service ? (
            <KnowledgePanel service={service} />
          ) : (
            <SectionCard>
              <EmptyBlock text="选择左侧一个服务查看其知识文档" />
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}

// 某服务的知识面板:筛选(sha / 分类)+ 文档列表 + 选中详情。
// 导出:既供本页(顶层知识摄取)右栏使用,也供服务详情「知识」Tab 直接复用。
export function KnowledgePanel({ service }: { service: string }) {
  const [sha, setSha] = useState<string>("all")
  const [cls, setCls] = useState<Classification | "all">("all")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const docsQ = useKnowledgeDocs(service, {
    ...(sha !== "all" ? { sha } : {}),
    ...(cls !== "all" ? { classification: cls } : {}),
  })
  const items = docsQ.data?.items ?? []
  // 从(未按 sha 过滤的)结果里取全部 sha 供下拉——为简单直接用当前结果集去重
  const shaOptions = useMemo(
    () => Array.from(new Set(items.map((d) => d.sha))),
    [items],
  )
  if (!selectedId && items.length > 0) setSelectedId(items[0].id)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* 文档列表 + 筛选 */}
      <div className="xl:col-span-1">
        <SectionCard
          bodyClassName="p-0"
          title={`文档 (${docsQ.data?.total ?? 0})`}
          action={
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              + 新增
            </button>
          }
        >
          <div className="p-2 flex gap-2 border-b border-gray-100">
            <select
              className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={sha}
              onChange={(e) => {
                setSha(e.target.value)
                setSelectedId(null)
              }}
            >
              <option value="all">全部 sha</option>
              {shaOptions.map((s) => (
                <option key={s} value={s}>
                  {s.slice(0, 8)}
                </option>
              ))}
            </select>
            <select
              className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={cls}
              onChange={(e) => {
                setCls(e.target.value as Classification | "all")
                setSelectedId(null)
              }}
            >
              <option value="all">全部分类</option>
              <option value="ai_context">ai_context</option>
              <option value="user_doc">user_doc</option>
              <option value="ops_doc">ops_doc</option>
            </select>
          </div>
          <div className="max-h-[calc(100vh-360px)] overflow-auto">
            {docsQ.isLoading && <LoadingBlock />}
            {!docsQ.isLoading && items.length === 0 && (
              <EmptyBlock text="该服务暂无匹配的知识文档" />
            )}
            {items.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-100 transition ${
                  selectedId === d.id
                    ? "bg-blue-50 border-l-2 border-l-blue-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <div
                  className={`text-xs font-mono truncate ${
                    selectedId === d.id
                      ? "text-blue-600 font-bold"
                      : "text-gray-900"
                  }`}
                >
                  {d.doc_path}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <FedBadge fed={d.fed_to_ai} />
                  <span className="text-[10px] text-gray-400 font-mono">
                    {d.sha.slice(0, 8)}
                  </span>
                  {d.human_edited && (
                    <span className="text-[10px] text-blue-600">已编辑</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* 详情编辑 */}
      <div className="xl:col-span-2">
        <SectionCard bodyClassName="p-0">
          {selectedId ? (
            <KnowledgeDetail
              key={selectedId}
              id={selectedId}
              service={service}
            />
          ) : (
            <EmptyBlock text="选择一条知识文档查看/编辑" />
          )}
        </SectionCard>
      </div>

      <KnowledgeCreateDialog
        service={service}
        defaultSha={sha !== "all" ? sha : undefined}
        open={showCreate}
        onOpenChange={setShowCreate}
      />
    </div>
  )
}

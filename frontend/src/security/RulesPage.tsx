// /security/rules — AI 参考规则库 + 自定义规则 + 方法论 Skills。
// 三 tab:规则库(master_rules/asvs/custom 浏览,服务端分页)、自定义规则(CRUD)、
// 方法论 Skills(浏览)。视觉对齐扫描类别 / 扫描配置页(安全区亮色套件、sonner)。
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Library,
  Plus,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Tag } from "@/components/security/badges"
import {
  Card,
  EmptyBlock,
  ErrorBlock,
  KV,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from "@/components/security/ui"
import { SecurityApi, type SkillItem, scannerErrorDetail } from "./api"
import { CustomRuleCreateDialog } from "./CustomRuleCreateDialog"
import { CustomRuleEditor } from "./CustomRuleEditor"
import { useCustomRules, useRule, useRules, useSkill, useSkills } from "./hooks"
import { fromList, ruleSourceLabel } from "./rulesUtils"

type Tab = "rules" | "custom" | "skills"

const PAGE = 50

export function RulesPage() {
  const [tab, setTab] = useState<Tab>("rules")
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Library}
        title="规则库"
        subtitle="内置参考规则语料(master_rules + ASVS)、方法论 skills 与运营者自定义规则"
        actions={
          tab === "custom" ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> 新增自定义
            </button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-1 border-b border-gray-200">
        <TabButton active={tab === "rules"} onClick={() => setTab("rules")}>
          规则库
        </TabButton>
        <TabButton active={tab === "custom"} onClick={() => setTab("custom")}>
          自定义规则
        </TabButton>
        <TabButton active={tab === "skills"} onClick={() => setTab("skills")}>
          方法论 Skills
        </TabButton>
      </div>

      {tab === "rules" && <RulesBrowseTab />}
      {tab === "custom" && <CustomRulesTab />}
      {tab === "skills" && <SkillsBrowseTab />}

      <CustomRuleCreateDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}

// ── Tab 1:规则库浏览(服务端分页 + 过滤)────────────────────────────
function RulesBrowseTab() {
  const [q, setQ] = useState("")
  const [source, setSource] = useState<
    "all" | "master_rules" | "asvs" | "custom"
  >("all")
  const [cwe, setCwe] = useState("")
  const [owasp, setOwasp] = useState("")
  const [asvs, setAsvs] = useState("")
  const [language, setLanguage] = useState("")
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<{
    source: string
    rule_id: string
  } | null>(null)

  // 任一过滤变化 → 回到第一页
  const reset = () => setOffset(0)

  const listQ = useRules({
    q: q || undefined,
    source: source === "all" ? undefined : source,
    cwe: cwe || undefined,
    owasp: owasp || undefined,
    asvs: asvs || undefined,
    language: language || undefined,
    limit: PAGE,
    offset,
  })

  const total = listQ.data?.total ?? 0
  const items = listQ.data?.items ?? []

  return (
    <>
      <Card className="p-3 flex items-center gap-2 flex-wrap">
        <Seg
          value={source}
          onChange={(v) => {
            setSource(v)
            reset()
          }}
          options={[
            ["all", "全部来源"],
            ["master_rules", "内置"],
            ["asvs", "ASVS"],
            ["custom", "自定义"],
          ]}
        />
        <FilterInput
          value={cwe}
          onChange={(v) => {
            setCwe(v)
            reset()
          }}
          placeholder="CWE-89"
          w="w-28"
        />
        <FilterInput
          value={owasp}
          onChange={(v) => {
            setOwasp(v)
            reset()
          }}
          placeholder="API01:2023"
          w="w-32"
        />
        <FilterInput
          value={asvs}
          onChange={(v) => {
            setAsvs(v)
            reset()
          }}
          placeholder="ASVS"
          w="w-24"
        />
        <FilterInput
          value={language}
          onChange={(v) => {
            setLanguage(v)
            reset()
          }}
          placeholder="语言"
          w="w-24"
        />
        <input
          className="ml-auto border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 max-w-[220px] focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="搜索规则 id / 标题…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            reset()
          }}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-1">
          <SectionCard
            title={`规则 (${total})`}
            action={
              <Pager
                offset={offset}
                count={items.length}
                total={total}
                onPrev={() => setOffset((o) => Math.max(0, o - PAGE))}
                onNext={() => setOffset((o) => o + PAGE)}
              />
            }
            bodyClassName="p-0"
          >
            <div className="max-h-[calc(100vh-360px)] overflow-auto">
              {listQ.isLoading && <LoadingBlock />}
              {listQ.isError && (
                <ErrorBlock text="加载规则失败(scanner 不可达?)" />
              )}
              {!listQ.isLoading && !listQ.isError && items.length === 0 && (
                <EmptyBlock text="无匹配规则" />
              )}
              {items.map((r) => {
                const isSel =
                  selected?.rule_id === r.rule_id &&
                  selected?.source === r.source
                return (
                  <button
                    key={`${r.source}/${r.rule_id}`}
                    type="button"
                    onClick={() =>
                      setSelected({ source: r.source, rule_id: r.rule_id })
                    }
                    className={`w-full text-left flex flex-col gap-1 px-3 py-2.5 border-b border-gray-100 transition ${
                      isSel
                        ? "bg-blue-50 border-l-2 border-l-blue-500"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`text-xs font-mono truncate ${isSel ? "text-blue-600 font-bold" : "text-gray-900"}`}
                    >
                      {r.rule_id}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {r.title}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag>{ruleSourceLabel(r.source)}</Tag>
                      {r.severity && <Tag>{r.severity}</Tag>}
                    </div>
                  </button>
                )
              })}
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <SectionCard bodyClassName="p-0">
            {selected ? (
              <RuleDetailPanel
                source={selected.source}
                ruleId={selected.rule_id}
              />
            ) : (
              <EmptyBlock text="选择左侧一条规则查看详情" />
            )}
          </SectionCard>
        </div>
      </div>
    </>
  )
}

function RuleDetailPanel({
  source,
  ruleId,
}: {
  source: string
  ruleId: string
}) {
  const q = useRule(source, ruleId)
  if (q.isLoading) return <LoadingBlock />
  if (q.isError || !q.data) return <ErrorBlock text="加载规则详情失败" />
  const d = q.data
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="font-mono text-sm font-bold text-gray-900">
          {d.rule_id}
        </div>
        <div className="text-sm text-gray-600 mt-0.5">{d.title}</div>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <Tag>{ruleSourceLabel(d.source)}</Tag>
          {d.severity && <Tag>{d.severity}</Tag>}
          {d.level && <Tag>{d.level}</Tag>}
        </div>
      </div>
      <RefBlock label="描述">
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
          {d.description}
        </p>
      </RefBlock>
      <ul className="text-xs space-y-1 border-t border-gray-100 pt-3">
        <KV k="CWE" v={fromList(d.cwes) || "—"} mono />
        <KV k="OWASP" v={fromList(d.owasp_refs) || "—"} mono />
        <KV k="ASVS" v={fromList(d.asvs_refs) || "—"} mono />
        <KV k="语言" v={fromList(d.languages) || "—"} mono />
        <KV k="许可" v={d.license || "—"} />
        <KV
          k="来源"
          v={
            d.source_url ? (
              <a
                className="text-blue-600 hover:underline break-all"
                href={d.source_url}
                target="_blank"
                rel="noreferrer"
              >
                {d.source_url}
              </a>
            ) : (
              "—"
            )
          }
        />
      </ul>
    </div>
  )
}

// ── Tab 2:自定义规则(CRUD)────────────────────────────────────────
function CustomRulesTab() {
  const listQ = useCustomRules()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)

  const items = listQ.data?.items ?? []
  if (!selected && items.length > 0 && !listQ.isLoading) {
    setSelected(items[0].rule_id)
  }

  const toggle = useMutation({
    mutationFn: (p: { rule_id: string; enabled: boolean }) =>
      SecurityApi.updateCustomRule(p.rule_id, { enabled: p.enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "custom-rules"] })
      qc.invalidateQueries({ queryKey: ["security", "rules"] })
      toast.success("已更新启停状态")
    },
    onError: (err) => toast.error(`更新失败:${scannerErrorDetail(err)}`),
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <div className="lg:col-span-1">
        <SectionCard title={`自定义规则 (${items.length})`} bodyClassName="p-0">
          <div className="max-h-[calc(100vh-320px)] overflow-auto">
            {listQ.isLoading && <LoadingBlock />}
            {listQ.isError && <ErrorBlock text="加载失败(scanner 不可达?)" />}
            {!listQ.isLoading && !listQ.isError && items.length === 0 && (
              <EmptyBlock text="暂无自定义规则——点右上「新增自定义」" />
            )}
            {items.map((r) => (
              <button
                key={r.rule_id}
                type="button"
                onClick={() => setSelected(r.rule_id)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 transition ${
                  selected === r.rule_id
                    ? "bg-blue-50 border-l-2 border-l-blue-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-mono truncate ${selected === r.rule_id ? "text-blue-600 font-bold" : "text-gray-900"}`}
                  >
                    {r.rule_id}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    {r.title}
                  </div>
                </div>
                <span
                  role="switch"
                  aria-checked={r.enabled}
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle.mutate({ rule_id: r.rule_id, enabled: !r.enabled })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation()
                      toggle.mutate({ rule_id: r.rule_id, enabled: !r.enabled })
                    }
                  }}
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer ${
                    r.enabled
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : "bg-gray-100 text-gray-400 border-gray-200"
                  }`}
                >
                  {r.enabled ? "启用" : "禁用"}
                </span>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="lg:col-span-2">
        <SectionCard bodyClassName="p-0">
          {selected ? (
            <CustomRuleEditor key={selected} ruleId={selected} />
          ) : (
            <EmptyBlock text="选择左侧一条规则查看/编辑" />
          )}
        </SectionCard>
      </div>
    </div>
  )
}

// ── Tab 3:方法论 Skills 浏览(服务端分页 + 过滤)───────────────────
function SkillsBrowseTab() {
  const [q, setQ] = useState("")
  const [subdomain, setSubdomain] = useState("")
  const [tag, setTag] = useState("")
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const reset = () => setOffset(0)

  const listQ = useSkills({
    q: q || undefined,
    subdomain: subdomain || undefined,
    tag: tag || undefined,
    limit: PAGE,
    offset,
  })
  const total = listQ.data?.total ?? 0
  const items = listQ.data?.items ?? []

  return (
    <>
      <Card className="p-3 flex items-center gap-2 flex-wrap mt-0">
        <FilterInput
          value={subdomain}
          onChange={(v) => {
            setSubdomain(v)
            reset()
          }}
          placeholder="子域 subdomain"
          w="w-40"
        />
        <FilterInput
          value={tag}
          onChange={(v) => {
            setTag(v)
            reset()
          }}
          placeholder="标签 tag"
          w="w-32"
        />
        <input
          className="ml-auto border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 max-w-[220px] focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="搜索 skill…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            reset()
          }}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-1">
          <SectionCard
            title={`Skills (${total})`}
            action={
              <Pager
                offset={offset}
                count={items.length}
                total={total}
                onPrev={() => setOffset((o) => Math.max(0, o - PAGE))}
                onNext={() => setOffset((o) => o + PAGE)}
              />
            }
            bodyClassName="p-0"
          >
            <div className="max-h-[calc(100vh-360px)] overflow-auto">
              {listQ.isLoading && <LoadingBlock />}
              {listQ.isError && (
                <ErrorBlock text="加载 skills 失败(scanner 不可达?)" />
              )}
              {!listQ.isLoading && !listQ.isError && items.length === 0 && (
                <EmptyBlock text="无匹配 skill" />
              )}
              {items.map((s: SkillItem) => (
                <button
                  key={s.skill_id}
                  type="button"
                  onClick={() => setSelected(s.skill_id)}
                  className={`w-full text-left flex flex-col gap-1 px-3 py-2.5 border-b border-gray-100 transition ${
                    selected === s.skill_id
                      ? "bg-blue-50 border-l-2 border-l-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`text-xs font-semibold truncate ${selected === s.skill_id ? "text-blue-600" : "text-gray-900"}`}
                  >
                    {s.name}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {s.summary}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {s.subdomain && <Tag>{s.subdomain}</Tag>}
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <SectionCard bodyClassName="p-0">
            {selected ? (
              <SkillDetailPanel skillId={selected} />
            ) : (
              <EmptyBlock text="选择左侧一条 skill 查看方法论全文" />
            )}
          </SectionCard>
        </div>
      </div>
    </>
  )
}

function SkillDetailPanel({ skillId }: { skillId: string }) {
  const q = useSkill(skillId)
  if (q.isLoading) return <LoadingBlock />
  if (q.isError || !q.data) return <ErrorBlock text="加载 skill 详情失败" />
  const d = q.data
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-blue-600" /> {d.name}
        </div>
        <div className="text-sm text-gray-600 mt-0.5">{d.summary}</div>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {d.subdomain && <Tag>{d.subdomain}</Tag>}
          {d.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      </div>
      <RefBlock label="方法论全文">
        <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono bg-gray-50 rounded-lg p-3 max-h-[calc(100vh-460px)] overflow-auto">
          {d.body}
        </pre>
      </RefBlock>
      <ul className="text-xs space-y-1 border-t border-gray-100 pt-3">
        <KV k="MITRE ATT&CK" v={fromList(d.mitre_attack) || "—"} mono />
        <KV k="NIST CSF" v={fromList(d.nist_csf) || "—"} mono />
        <KV k="D3FEND" v={fromList(d.d3fend_techniques) || "—"} mono />
        <KV k="ATLAS" v={fromList(d.atlas_techniques) || "—"} mono />
      </ul>
    </div>
  )
}

// ── 小组件 ──────────────────────────────────────────────────────────
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  )
}

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

function FilterInput({
  value,
  onChange,
  placeholder,
  w,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  w: string
}) {
  return (
    <input
      className={`${w} border border-gray-200 rounded-md px-2.5 py-1.5 text-xs font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// 服务端分页器:上一页 / 当前区间 / 下一页
function Pager({
  offset,
  count,
  total,
  onPrev,
  onNext,
}: {
  offset: number
  count: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  const from = total === 0 ? 0 : offset + 1
  const to = offset + count
  const hasPrev = offset > 0
  const hasNext = to < total
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <span className="tabular-nums">
        {from}–{to} / {total}
      </span>
      <button
        type="button"
        disabled={!hasPrev}
        onClick={onPrev}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        disabled={!hasNext}
        onClick={onNext}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function RefBlock({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      {children}
    </div>
  )
}

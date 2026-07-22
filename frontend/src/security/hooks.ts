// react-query hooks for the 大屏. 30s heartbeat refetch.
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { type Classification, SecurityApi } from "./api"
import { useCurrentProject } from "./CurrentProjectProvider"

const REFRESH_MS = 30_000

export const useStats = () => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "stats", project],
    queryFn: () => SecurityApi.stats(project),
    refetchInterval: REFRESH_MS,
  })
}

export const useTrend = (days = 14) => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "trend", days, project],
    queryFn: () => SecurityApi.trend(days, project),
    refetchInterval: REFRESH_MS,
  })
}

export const useCategories = (
  dimension: "owasp" | "cwe" | "engine" | "rule_namespace" = "owasp",
) => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "categories", dimension, project],
    queryFn: () => SecurityApi.categories(dimension, { project }),
    refetchInterval: REFRESH_MS,
  })
}

export const useVerifierStats = () => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "verifier-stats", project],
    queryFn: () => SecurityApi.verifierStats(project),
    refetchInterval: REFRESH_MS,
  })
}

// 服务列表——按当前项目隔离(FEAT-025)。scanner `/services?project=` 现已在
// 服务端按 Service.project 过滤(且 finding 计数按 项目+服务名 双约束),故这里
// 直接把当前项目传下去,不再做客户端交叉过滤。全站服务视图共用本 hook。
export const useServiceList = () => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "services", project],
    queryFn: () => SecurityApi.services(project),
    refetchInterval: REFRESH_MS,
  })
}

export const useScanRuns = (name: string, limit = 3) =>
  useQuery({
    queryKey: ["security", "scan-runs", name, limit],
    queryFn: () => SecurityApi.scanRuns(name, limit),
    refetchInterval: REFRESH_MS,
    enabled: Boolean(name),
  })

// 单次扫描详情 / 实时进度(FEAT-011)。running 时 4s 快轮询看进度推进,
// 结束即停(refetchInterval=false),避免对已完成的 run 空转拉取。
export const useScanRunDetail = (name: string, id: number, live: boolean) =>
  useQuery({
    queryKey: ["security", "scan-run-detail", name, id],
    queryFn: () => SecurityApi.scanRunDetail(name, id),
    enabled: Boolean(name) && Number.isFinite(id) && id > 0,
    refetchInterval: live ? 4000 : false,
  })

// 源码缓存(FEAT-012):某服务已拉取的代码 hash 列表
export const useSourceCache = (name: string) =>
  useQuery({
    queryKey: ["security", "source-cache", name],
    queryFn: () => SecurityApi.sourceCache(name),
    enabled: Boolean(name),
    refetchInterval: REFRESH_MS,
  })

// DAST 历史(FEAT-033~036):某服务的动态扫描 run 列表,新→旧。有 running 时
// 靠 REFRESH_MS 心跳刷新看状态推进;project 用于同名跨项目消歧。
export const useDastRuns = (name: string, project?: string, limit = 20) =>
  useQuery({
    queryKey: ["security", "dast-runs", name, project ?? "", limit],
    queryFn: () => SecurityApi.dastRuns(name, project, limit),
    enabled: Boolean(name),
    refetchInterval: REFRESH_MS,
  })

// 运维:重建+部署 scanner 状态。构建中传 live=true → 2s 快轮询,否则不轮询。
export const useOpsStatus = (live: boolean) =>
  useQuery({
    queryKey: ["security", "ops", "scanner-status"],
    queryFn: SecurityApi.opsStatus,
    refetchInterval: live ? 2000 : false,
  })

// 全局扫描任务总览:跨所有服务的 scan run。status 变化驱动重取(进 query key)。
export const useAllScanRuns = (
  opts: { limit_per_service?: number; status?: string } = {},
) => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: [
      "security",
      "scan-runs",
      "all",
      opts.status ?? "",
      opts.limit_per_service ?? 0,
      project,
    ],
    queryFn: () => SecurityApi.allScanRuns({ ...opts, project }),
    refetchInterval: REFRESH_MS,
  })
}

// 大屏「最新发现」——随当前项目过滤(findings 端点原生支持 project,FEAT-025)。
export const useRecentFindings = (limit = 20) => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "findings", "recent", limit, project],
    queryFn: () => SecurityApi.recentFindings(limit, project),
    refetchInterval: REFRESH_MS,
  })
}

// Findings 处置收件箱(全局可筛选/排序/分页列表)。所有筛选进 opts → queryKey,
// 服务端过滤;project 由当前项目注入,做多项目隔离(与大屏 KPI 同口径)。
// placeholderData 保留上一页数据,翻页/改筛选时不闪回骨架屏(交互更平滑)。
export const useFindingsList = (opts: {
  service?: string
  severity?: string
  status?: string
  engine?: string
  rule_prefix?: string
  limit?: number
  offset?: number
  sort?: string
}) => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "findings", "list", project, opts],
    queryFn: () => SecurityApi.listFindings({ ...opts, project }),
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  })
}

// 回归对比:某次扫描「真实观测到」的全部 finding(不限状态),用于两次扫描做集合 diff。
// 数据源 listFindings?scan_run_id=——按 run 隔离,天然限定在该服务/项目内。
// 不传 status:回归要看「本次是否出现该问题」,与当前 triage 状态无关。
// 单次扫描的 finding 可能超过后端单页上限(500,见 aam-parent 实测 610+),故这里
// 分页拉全量再合并——回归对比必须完整,不能截断成只比前 500(项目规则:不设无谓上限)。
const RUN_PAGE = 500
export const useRunFindings = (service: string | null, runId: number | null) =>
  useQuery({
    queryKey: ["security", "findings", "run", service, runId],
    queryFn: async () => {
      const params = {
        service: service as string,
        scan_run_id: runId as number,
        sort: "-id",
      }
      // 先取第一页拿到 total,再按需并发补齐剩余页
      const first = await SecurityApi.listFindings({
        ...params,
        limit: RUN_PAGE,
        offset: 0,
      })
      const total = first.total
      if (total <= first.items.length) return first
      const offsets: number[] = []
      for (let o = first.items.length; o < total; o += RUN_PAGE) offsets.push(o)
      const rest = await Promise.all(
        offsets.map((offset) =>
          SecurityApi.listFindings({ ...params, limit: RUN_PAGE, offset }),
        ),
      )
      return {
        ...first,
        items: [...first.items, ...rest.flatMap((r) => r.items)],
      }
    },
    enabled:
      Boolean(service) && Number.isFinite(runId) && (runId as number) > 0,
    staleTime: 30_000, // 历史扫描的产出不再变化,无需心跳
  })

// ── 多项目:项目(租户)/ 项目下服务定义(FEAT-024/025)——低频管理数据 ──
// queryKey ["security","projects"] 与 Provider / ProjectSelector 一致 → 共享缓存。
export const useProjects = () =>
  useQuery({
    queryKey: ["security", "projects"],
    queryFn: SecurityApi.projects,
    staleTime: 30_000,
  })

export const useProjectServices = (key: string | null) =>
  useQuery({
    queryKey: ["security", "project-services", key],
    queryFn: () => SecurityApi.projectServices(key as string),
    enabled: Boolean(key),
    staleTime: 30_000,
  })

// 每项目扫描配置覆盖(FEAT-027 M3)——低频管理数据,不做 30s 心跳。
export const useProjectConfig = (key: string | null) =>
  useQuery({
    queryKey: ["security", "project-config", key],
    queryFn: () => SecurityApi.projectConfig(key as string),
    enabled: Boolean(key),
    staleTime: 30_000,
  })

export const useFinding = (id: number) =>
  useQuery({
    queryKey: ["security", "finding", id],
    queryFn: () => SecurityApi.getFinding(id),
    enabled: Number.isFinite(id) && id > 0,
  })

// Findings 标签:全引擎口径(与左侧 KPI「开放」、扫描历史一致)。engine 缺省 =
// 「全部」;传具体引擎(如 ai_sonnet / trivy)= 该引擎结果。默认只看 open(与
// KPI「开放 N」对齐,数字可对得上)。
export const useServiceFindings = (
  service: string,
  opts: { engine?: string; scan_run_id?: number; limit?: number } = {},
) => {
  const { engine, scan_run_id, limit = 500 } = opts
  return useQuery({
    queryKey: [
      "security",
      "findings",
      "service",
      service,
      limit,
      engine ?? "all",
      scan_run_id ?? "all",
    ],
    queryFn: () =>
      SecurityApi.listFindings({
        service,
        limit,
        sort: "-id",
        status: "open",
        ...(engine ? { engine } : {}),
        ...(scan_run_id ? { scan_run_id } : {}),
      }),
    refetchInterval: REFRESH_MS,
    enabled: Boolean(service),
  })
}

// Findings 标签的引擎筛选 chip:各引擎在该服务的命中数(count/open)。
// 数据源 /categories?dimension=engine,open 之和 = 左侧 KPI「开放」,口径一致。
export const useServiceEngineCounts = (service: string) =>
  useQuery({
    queryKey: ["security", "categories", "engine", service],
    queryFn: () => SecurityApi.categories("engine", { service }),
    refetchInterval: REFRESH_MS,
    enabled: Boolean(service),
  })

// Findings 标签「按扫描批次」筛选 pill:最近 limit 次扫描(有产出的 + 已完成的)+ 各自
// 去重产出条数(含零产出显示 0)。engine 透传,使 pill 计数与当前引擎筛选口径一致(切引擎即
// 重取)。limit=20 覆盖较早的产出批次,并与「扫描历史」编号对齐(含刚扫完零产出的最新批次)。
export const useServiceFindingRuns = (
  service: string,
  opts: { engine?: string; limit?: number } = {},
) => {
  const { engine, limit = 20 } = opts
  return useQuery({
    queryKey: ["security", "finding-runs", service, engine ?? "all", limit],
    queryFn: () =>
      SecurityApi.findingRuns(service, {
        status: "open",
        limit,
        ...(engine ? { engine } : {}),
      }),
    refetchInterval: REFRESH_MS,
    enabled: Boolean(service),
  })
}

export const useServiceInterfaces = (service: string, riskLevel?: string) =>
  useQuery({
    queryKey: ["security", "interfaces", "service", service, riskLevel],
    queryFn: () => SecurityApi.serviceInterfaces(service, riskLevel),
    refetchInterval: REFRESH_MS,
    enabled: Boolean(service),
  })

export const useInterface = (id: number) =>
  useQuery({
    queryKey: ["security", "interface", id],
    queryFn: () => SecurityApi.getInterface(id),
    enabled: Number.isFinite(id) && id > 0,
  })

export const useMcpStatus = () =>
  useQuery({
    queryKey: ["security", "mcp-status"],
    queryFn: SecurityApi.mcpStatus,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

// ── 运行时配置(FEAT-008)— 低频数据,不做 30s 心跳 ──────────────
export const useScannerConfig = () =>
  useQuery({
    queryKey: ["security", "config"],
    queryFn: SecurityApi.getConfig,
    staleTime: 30_000,
  })

// ── 扫描引擎目录(DISC-004)— 引擎是全局的(不随项目),低频只读 ──────
export const useEngines = () =>
  useQuery({
    queryKey: ["security", "engines"],
    queryFn: SecurityApi.engines,
    staleTime: 30_000,
  })

// 扫描引擎页的「近 N 天」成本列:按 engine_name 聚合,跨全部项目(引擎全局,
// 不注入 currentProject)。与 useCostStats 区别正在于此——那个按当前项目过滤。
export const useEngineCostStats = (days = 30) =>
  useQuery({
    queryKey: ["security", "cost-stats", "engines-global", days],
    queryFn: () => SecurityApi.costStats(undefined, days, undefined),
    refetchInterval: REFRESH_MS,
  })

// ── 系统画像(系统级视图)——按当前项目隔离,低频只读 ──────────────
export const useSystemProfile = (name: string | null, sha?: string) => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "system-profile", name, sha ?? "latest", project],
    queryFn: () => SecurityApi.systemProfile(name as string, sha, project),
    enabled: Boolean(name),
    // 无画像时后端返回 404 → 别反复重试(视为"尚未生成")
    retry: false,
    staleTime: 30_000,
  })
}

export const useSystemProfileHistory = (name: string | null) => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "system-profile-history", name, project],
    queryFn: () => SecurityApi.systemProfileHistory(name as string, project),
    enabled: Boolean(name),
    staleTime: 30_000,
  })
}

// 项目级系统画像 rollup —— 整个项目(所有服务)聚合,按当前项目取。
export const useProjectSystemProfile = () => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "project-system-profile", project],
    queryFn: () => SecurityApi.projectSystemProfile(project),
    enabled: Boolean(project),
    refetchInterval: REFRESH_MS,
  })
}

// ── 成本统计(FEAT-009)────────────────────────────────────────
export const useCostStats = (service?: string, days?: number) => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "cost-stats", service ?? "", days ?? 0, project],
    queryFn: () => SecurityApi.costStats(service, days, project),
    refetchInterval: REFRESH_MS,
  })
}

// 单次扫描成本明细(FEAT-009 第三级下钻)。service/days 变化进 query key 驱动重取。
export const useCostRuns = (service?: string, days?: number, limit = 50) => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: [
      "security",
      "cost-runs",
      service ?? "",
      days ?? 0,
      limit,
      project,
    ],
    queryFn: () => SecurityApi.costRuns(service, days, limit, project),
    refetchInterval: REFRESH_MS,
  })
}

// ── AI 复核统计(FEAT-005)─────────────────────────────────────
export const useFindingReviewStats = (service?: string) => {
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "finding-review-stats", service ?? "", project],
    queryFn: () => SecurityApi.findingReviewStats(service, project),
    refetchInterval: REFRESH_MS,
  })
}

// ── AI Hunt Category / 知识摄取(FEAT-018)——低频管理数据,不做 30s
// 心跳,只做 staleTime(仿 useScannerConfig)。mutation 内联在页面组件里。

export const useAiCategories = (
  filters: { enabled?: boolean; source?: "builtin" | "custom" } = {},
) =>
  useQuery({
    queryKey: [
      "security",
      "ai-categories",
      filters.enabled ?? "all",
      filters.source ?? "all",
    ],
    queryFn: () => SecurityApi.aiCategories(filters),
    staleTime: 30_000,
  })

export const useAiCategory = (name: string | null) =>
  useQuery({
    queryKey: ["security", "ai-category", name],
    queryFn: () => SecurityApi.aiCategory(name as string),
    enabled: Boolean(name),
    staleTime: 30_000,
  })

export const useKnowledgeDocs = (
  service: string | null,
  filters: { sha?: string; classification?: Classification } = {},
) =>
  useQuery({
    queryKey: [
      "security",
      "knowledge",
      service ?? "",
      filters.sha ?? "all",
      filters.classification ?? "all",
    ],
    queryFn: () => SecurityApi.knowledgeDocs(service as string, filters),
    enabled: Boolean(service),
    staleTime: 30_000,
  })

export const useKnowledgeDoc = (id: number | null) =>
  useQuery({
    queryKey: ["security", "knowledge-doc", id],
    queryFn: () => SecurityApi.knowledgeDoc(id as number),
    enabled: Number.isFinite(id) && (id as number) > 0,
    staleTime: 30_000,
  })

// ── 规则库 / skills / 自定义规则(FEAT-018 phase B)——低频,仅 staleTime。
// 规则库服务端分页,filters 进 queryKey 命中服务端。mutation 内联在组件。

export const useRules = (
  filters: {
    q?: string
    source?: "master_rules" | "asvs" | "custom"
    cwe?: string
    owasp?: string
    asvs?: string
    language?: string
    limit?: number
    offset?: number
  } = {},
) =>
  useQuery({
    queryKey: ["security", "rules", filters],
    queryFn: () => SecurityApi.rules(filters),
    staleTime: 30_000,
  })

export const useRule = (source: string | null, ruleId: string | null) =>
  useQuery({
    queryKey: ["security", "rule", source, ruleId],
    queryFn: () => SecurityApi.rule(source as string, ruleId as string),
    enabled: Boolean(source) && Boolean(ruleId),
    staleTime: 30_000,
  })

export const useSkills = (
  filters: {
    q?: string
    subdomain?: string
    tag?: string
    limit?: number
    offset?: number
  } = {},
) =>
  useQuery({
    queryKey: ["security", "skills", filters],
    queryFn: () => SecurityApi.skills(filters),
    staleTime: 30_000,
  })

export const useSkill = (skillId: string | null) =>
  useQuery({
    queryKey: ["security", "skill", skillId],
    queryFn: () => SecurityApi.skill(skillId as string),
    enabled: Boolean(skillId),
    staleTime: 30_000,
  })

export const useCustomRules = (enabled?: boolean) =>
  useQuery({
    queryKey: ["security", "custom-rules", enabled ?? "all"],
    queryFn: () => SecurityApi.customRules(enabled),
    staleTime: 30_000,
  })

export const useCustomRule = (ruleId: string | null) =>
  useQuery({
    queryKey: ["security", "custom-rule", ruleId],
    queryFn: () => SecurityApi.customRule(ruleId as string),
    enabled: Boolean(ruleId),
    staleTime: 30_000,
  })

// ── 项目理解:服务 profile / ai-context(FEAT-018 phase D)────────────

export const useServiceProfile = (name: string | null) =>
  useQuery({
    queryKey: ["security", "service-profile", name],
    queryFn: () => SecurityApi.getServiceProfile(name as string),
    enabled: Boolean(name),
    staleTime: 30_000,
  })

export const useAiContext = (name: string | null, sha?: string) => {
  // 带上当前项目:服务名在项目内唯一,ai-context 端点原生支持 project(FEAT-025)
  const { project } = useCurrentProject()
  return useQuery({
    queryKey: ["security", "ai-context", name, sha ?? "default", project],
    queryFn: () => SecurityApi.aiContext(name as string, sha, project),
    enabled: Boolean(name),
    staleTime: 30_000,
  })
}

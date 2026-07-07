// Thin axios wrapper for the /api/v1/security/* surface (task #184).
//
// We bypass the openapi-ts codegen here on purpose:
//   - scanner endpoints evolve quickly; regenerating codegen on every
//     iteration is friction
//   - the React 大屏 only needs ~6 GET calls
//
// Auth follows the same pattern as the rest of security-platform: JWT in the
// Authorization header, base URL from VITE_API_URL.
import axios, { type AxiosInstance } from "axios"

const base = import.meta.env.VITE_API_URL || ""

const api: AxiosInstance = axios.create({
  baseURL: `${base}/api/v1`,
})

api.interceptors.request.use((cfg) => {
  const tok = localStorage.getItem("access_token")
  if (tok) cfg.headers.Authorization = `Bearer ${tok}`
  return cfg
})

// ── response types — mirror scanner's pydantic models ──────────────

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"

export type Stats = {
  total_findings: number
  open_findings: number
  by_severity: Record<string, number>
  by_engine: Record<string, number>
  by_status: Record<string, number>
  services_count: number
  last_scan_at: string | null
}

export type TrendPoint = {
  date: string
  new: number
  closed: number
  open_running_total: number
}
export type Trend = { days: number; points: TrendPoint[] }

export type CategoryItem = {
  key: string
  label: string
  count: number
  open: number
  severity_breakdown: Record<string, number>
}
export type CategoryAggregate = {
  dimension: "owasp" | "cwe" | "engine" | "rule_namespace"
  items: CategoryItem[]
}

export type VerifierStats = {
  total_ai_findings: number
  refuted_high: number
  refuted_medium: number
  refuted_low: number
  confirmed: number
  no_verifier: number
  fp_suppression_rate: number
  by_category: Record<string, Record<string, number>>
}

export type ServiceSummary = {
  name: string
  group: string | null
  repo_url: string
  language: string | null
  framework: string | null
  open_findings: number
  closed_findings: number
  last_scan_at: string | null
  last_scan_status: string | null
}

export type Interface = {
  id: number
  service_name: string
  http_method: string
  path: string
  handler: string | null
  file_path: string | null
  line_number: number | null
  description: string | null
  business_summary: string | null
  sensitivity: string | null
  op_type: string | null
  risk_level: "P0" | "P1" | "P2" | null
  source: string
  extracted_at: string
  findings_count: number
  open_findings_count: number
}

export type InterfaceDetail = Interface & {
  findings: Finding[]
}

export type ScanRun = {
  id: number
  service_name: string
  sha: string
  started_at: string
  finished_at: string | null
  // timed_out:scanner 心跳 sweeper 把无心跳的僵尸 running 收敛成此态(FEAT-010)
  status: "running" | "completed" | "failed" | "aborted" | "timed_out"
  engines_completed: string[]
  resume_count: number
  // FEAT-011:正在执行的阶段 + 上次心跳(list 与 detail 都带)
  current_stage?: string | null
  last_heartbeat?: string | null
}

// FEAT-011:单次扫描里某引擎/阶段的明细(scanner scan_engine_runs)
export type EngineRun = {
  engine: string
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number
  elapsed_seconds: number
  findings: number
  model: string | null
  status: string // ok | skipped | error
  finished_at: string
}

// FEAT-011:单次扫描完整详情 — 控制台"当前扫描过程"面板轮询此形状
export type ScanRunDetail = ScanRun & {
  phases_completed: Record<string, string> // phase → ISO 完成时间
  seconds_since_heartbeat: number | null
  findings_count: number
  by_engine: EngineRun[]
}

// FEAT-012:单个服务的源码缓存条目(已拉取的代码 checkout)
export type SourceCacheEntry = {
  sha: string
  ready: boolean
  pulled_at: string | null
  size_bytes: number
  is_last_scanned: boolean
}

export type Finding = {
  id: number
  service_name: string
  engine: string
  rule_id: string
  severity: Severity
  file_path: string
  line_number: number
  message: string
  status: "open" | "closed"
  closed_reason: string | null
  first_seen_at: string
  last_seen_at: string
  cwe_id: string | null
  cve_id: string | null
}
export type FindingsList = {
  total: number
  items: Finding[]
  limit: number
  offset: number
}

export type VerifierVerdict = {
  refuted: boolean
  reason: string
  confidence: "high" | "medium" | "low" | string
}

// /api/admin/findings/{id} returns these extra fields beyond the
// list-view shape above.
export type FindingDetail = Finding & {
  closed_at: string | null
  closed_by: string | null
  closed_note: string | null
  first_seen_sha: string
  last_seen_sha: string
  finding_group_id: number | null
  interface_id: number | null
  raw_output: Record<string, unknown> & {
    category?: string
    interface_handler?: string
    interface_label?: string
    scope_truncated?: boolean
    raw?: Record<string, unknown>
    verifier?: VerifierVerdict
  }
  verifier: VerifierVerdict | null
}

export type TriageAction =
  | "fp"
  | "fixed"
  | "wontfix"
  | "suppressed"
  | "duplicate"
  | "reopen"

export type TriageResponse = {
  ok: boolean
  finding_id: number
  new_status: "open" | "closed"
  new_closed_reason: string | null
}

// ── 运行时配置(scanner FEAT-008)──────────────────────────────────

export type ConfigCategory = "access" | "engines" | "ai" | "resources" | "infra"

export type ConfigItem = {
  key: string
  category: ConfigCategory
  value: unknown // 当前生效值(内部平台,token 明文)
  is_overridden: boolean // 值来自 DB 覆盖而非 env/默认
  requires_restart: boolean // 改后需重启 scanner 才完全生效
  type: string // Settings 字段注解字符串,驱动编辑控件
}

export type ConfigListResponse = { items: ConfigItem[] }

export type ConfigUpdateResponse = {
  updated: string[]
  requires_restart: string[]
}

// ── 成本统计(scanner FEAT-009)────────────────────────────────────

export type EngineCost = {
  engine: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  elapsed_seconds: number
  runs: number
  findings: number
}

// 按服务聚合(三级下钻·第二级)。runs 为该服务去重后的扫描次数,
// last_run_at 为最近一次扫描开始时间。
export type ServiceCost = {
  service: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  elapsed_seconds: number
  runs: number
  findings: number
  last_run_at: string | null
}

export type CostStats = {
  total_input_tokens: number
  total_output_tokens: number
  total_tokens: number
  total_elapsed_seconds: number
  by_engine: EngineCost[]
  by_service: ServiceCost[]
}

// 一次扫描里某引擎/阶段的成本明细(第三级下钻的子项)。
export type EngineRunDetail = {
  engine: string
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number
  elapsed_seconds: number
  findings: number
  model: string | null
  status: string
  finished_at: string
}

// 一次扫描(scan_run)的成本汇总 + 逐引擎明细(第三级下钻)。
export type RunCost = {
  run_id: number
  service: string
  sha: string
  started_at: string
  finished_at: string | null
  status: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  elapsed_seconds: number
  findings: number
  by_engine: EngineRunDetail[]
}

// ── AI 复核统计(scanner FEAT-005)─────────────────────────────────

export type FindingReviewStats = {
  total_reviewed: number
  false_positive: number
  true_positive: number
  needs_review: number
  fp_by_confidence: Record<string, number>
  auto_closed: number
  fp_rate: number
  by_engine: Record<string, { reviewed: number; fp: number; closed: number }>
}

// ── endpoints ──────────────────────────────────────────────────────

// 从 scanner 代理返回的 axios 错误里提取后端 detail(security 目录走裸 axios,
// 不是 codegen ApiError,故不能用 utils.ts 的 handleError)。全目录复用这一个。
export function scannerErrorDetail(err: unknown): string {
  return (
    (err as { response?: { data?: { detail?: string } } })?.response?.data
      ?.detail ?? String(err)
  )
}

export const SecurityApi = {
  stats: () => api.get<Stats>("/security/stats").then((r) => r.data),
  trend: (days = 14) =>
    api
      .get<Trend>("/security/stats/trend", { params: { days } })
      .then((r) => r.data),
  categories: (dimension: CategoryAggregate["dimension"] = "owasp", top = 20) =>
    api
      .get<CategoryAggregate>("/security/categories", {
        params: { dimension, top },
      })
      .then((r) => r.data),
  verifierStats: () =>
    api.get<VerifierStats>("/security/verifier-stats").then((r) => r.data),
  services: () =>
    api.get<ServiceSummary[]>("/security/services").then((r) => r.data),
  scanRuns: (name: string, limit = 3) =>
    api
      .get<ScanRun[]>(
        `/security/services/${encodeURIComponent(name)}/scan-runs`,
        {
          params: { limit },
        },
      )
      .then((r) => r.data),
  // 单次扫描详情 / 实时进度(FEAT-011)
  scanRunDetail: (name: string, id: number) =>
    api
      .get<ScanRunDetail>(
        `/security/services/${encodeURIComponent(name)}/scan-runs/${id}`,
      )
      .then((r) => r.data),
  // 源码缓存(FEAT-012):列出/删除某服务已拉取的代码 hash
  sourceCache: (name: string) =>
    api
      .get<SourceCacheEntry[]>(
        `/security/services/${encodeURIComponent(name)}/source-cache`,
      )
      .then((r) => r.data),
  evictSourceCache: (name: string, sha: string) =>
    api
      .delete(
        `/security/services/${encodeURIComponent(name)}/source-cache/${sha}`,
      )
      .then((r) => r.data),
  // 全局扫描任务总览:后端并发聚合所有服务的 scan-runs(见 backend
  // security.py list_all_scan_runs)。每条 run 已带 service_name。
  allScanRuns: (opts: { limit_per_service?: number; status?: string } = {}) =>
    api
      .get<ScanRun[]>("/security/scan-runs", {
        params: {
          ...(opts.limit_per_service
            ? { limit_per_service: opts.limit_per_service }
            : {}),
          ...(opts.status ? { status: opts.status } : {}),
        },
      })
      .then((r) => r.data),
  serviceInterfaces: (name: string, riskLevel?: string) =>
    api
      .get<Interface[]>(
        `/security/services/${encodeURIComponent(name)}/interfaces`,
        { params: riskLevel ? { risk_level: riskLevel } : {} },
      )
      .then((r) => r.data),
  getInterface: (id: number) =>
    api.get<InterfaceDetail>(`/security/interfaces/${id}`).then((r) => r.data),
  mcpStatus: () =>
    api
      .get<{
        mounted: boolean
        has_token: boolean
        mcp_package_installed: boolean
        endpoint: string | null
        tool_count: number
        tools: { name: string; description: string }[]
        error: string | null
      }>("/security/mcp/status")
      .then((r) => r.data),
  triggerScan: (name: string, ref = "main", sha?: string) =>
    api
      .post<{
        task_id: string
        service: string
        sha: string
        accepted: boolean
      }>(`/security/services/${encodeURIComponent(name)}/scan`, null, {
        params: { ref, ...(sha ? { sha } : {}) },
      })
      .then((r) => r.data),
  recentFindings: (limit = 20) =>
    api
      .get<FindingsList>("/security/findings", {
        params: { limit, sort: "-id" },
      })
      .then((r) => r.data),
  listFindings: (
    opts: {
      service?: string
      severity?: string
      status?: string
      engine?: string
      rule_prefix?: string
      recent_runs?: number
      limit?: number
      offset?: number
      sort?: string
    } = {},
  ) =>
    api
      .get<FindingsList>("/security/findings", { params: opts })
      .then((r) => r.data),
  getFinding: (id: number) =>
    api.get<FindingDetail>(`/security/findings/${id}`).then((r) => r.data),
  triageFinding: (id: number, action: TriageAction, reason?: string) =>
    api
      .post<TriageResponse>(`/security/findings/${id}/triage`, {
        action,
        ...(reason ? { reason } : {}),
      })
      .then((r) => r.data),

  // ── 运行时配置(FEAT-008)──────────────────────────────────────
  getConfig: () =>
    api.get<ConfigListResponse>("/security/config").then((r) => r.data),
  updateConfig: (updates: Record<string, unknown>) =>
    api
      .put<ConfigUpdateResponse>("/security/config", { updates })
      .then((r) => r.data),
  deleteConfig: (key: string) =>
    api.delete<void>(`/security/config/${encodeURIComponent(key)}`),

  // ── 成本统计(FEAT-009)────────────────────────────────────────
  costStats: (service?: string, days?: number) =>
    api
      .get<CostStats>("/security/cost-stats", {
        params: {
          ...(service ? { service } : {}),
          ...(days ? { days } : {}),
        },
      })
      .then((r) => r.data),

  // 单次扫描成本明细(FEAT-009 第三级下钻)。返回最近 limit 次有成本记录的扫描。
  costRuns: (service?: string, days?: number, limit = 50) =>
    api
      .get<RunCost[]>("/security/cost-runs", {
        params: {
          ...(service ? { service } : {}),
          ...(days ? { days } : {}),
          limit,
        },
      })
      .then((r) => r.data),

  // ── AI 复核统计(FEAT-005)─────────────────────────────────────
  findingReviewStats: (service?: string) =>
    api
      .get<FindingReviewStats>("/security/finding-review-stats", {
        params: service ? { service } : {},
      })
      .then((r) => r.data),
}

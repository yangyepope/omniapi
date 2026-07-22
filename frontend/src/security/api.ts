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
  project: string // 多项目归属(scanner FEAT-025)
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
  human_locked: boolean // 人工编辑过画像 → AI 风险分级不再覆盖
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
  // interrupted:进程崩溃/重启时在跑的扫描,启动对账时收敛成此态(FIX-009)
  status:
    | "running"
    | "completed"
    | "failed"
    | "aborted"
    | "timed_out"
    | "interrupted"
  engines_completed: string[]
  resume_count: number
  // FEAT-011:正在执行的阶段 + 上次心跳(list 与 detail 都带)
  current_stage?: string | null
  last_heartbeat?: string | null
  // FEAT:触发来源(scanner scan_runs.trigger_*)。存量任务为 null → 渲染「—」。
  //   trigger_type:push / merge_request = webhook 自动;manual = 控制台手动
  trigger_type?: "push" | "merge_request" | "manual" | null
  trigger_actor?: string | null // 触发人 GitLab 用户名;手动为 admin
  trigger_ref?: string | null // 触发分支 / ref
  trigger_mr_iid?: number | null // MR iid;仅 merge_request 有值
  triggered_at?: string | null // 事件发生时刻(区别于 started_at)
}

// FEAT-011:单次扫描里某引擎/阶段的明细(scanner scan_engine_runs)
export type EngineRun = {
  engine: string
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number
  elapsed_seconds: number
  findings: number // 引擎本次原始产出条数(去重前)
  distinct_findings: number | null // 去重后 distinct finding 数;伪引擎(finding_review 等)为 null
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

// DAST(动态扫描,scanner FEAT-033~036):单次 run 里某引擎的明细
export type DastRunEngine = {
  engine: string
  status: string
  findings: number
  elapsed_seconds?: number | null
  message?: string | null
}

// DAST 单次扫描记录(scanner dast_runs)。skipped:被 scope 授权门挡下,
// skip_reason 说明原因(如目标不在 allowlist),不是静默 no-op。
export type DastRun = {
  id: number
  project: string
  service_name: string
  target_url: string | null
  status: "running" | "completed" | "failed" | "skipped"
  skip_reason: string | null
  engines: DastRunEngine[]
  findings_total: number
  triggered_by: string | null
  started_at: string
  finished_at: string | null
}
export type DastRunList = { total: number; items: DastRun[] }

// 运维:重建+部署 scanner 的状态(后端 ops_runner)
export type OpsStatus = {
  status: "idle" | "running" | "success" | "failed"
  step: "build" | "up" | null
  started_at: string | null
  finished_at: string | null
  returncode: number | null
  log: string[]
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
  // 最后一次观测到该 finding 的扫描 run(后端字段,列表展示暂未用)
  last_seen_scan_run_id: number | null
  cwe_id: string | null
  cve_id: string | null
}
export type FindingsList = {
  total: number
  items: Finding[]
  limit: number
  offset: number
}

// FEAT:Findings 标签「按扫描批次」筛选 pill。一次扫描 + 它真实产出(观测到)
// 的、匹配当前筛选的 finding 条数。数据源 scanner finding_scan_runs 观测表。
export type FindingRun = {
  scan_run_id: number
  started_at: string
  status: string
  count: number
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

// ── 扫描引擎目录(scanner DISC-004,只读,全局)────────────────────────
// 逐一对照 scanner pydantic(admin.py EngineItem),不凭想象加字段(见踩坑 F-005)。
// 引擎是插件式后端代码,前端只做目录展示 + 参数配置(复用 /config)+ 成本观测;
// 不做「新增引擎」——那是后端代码 + 装二进制。列表必须来自本接口,禁止硬编码。
export type EngineItem = {
  name: string // 引擎标识(= findings.engine / cost 聚合键),列表 key,不作主展示
  display: string
  kind: "sast" | "cve" | "secrets" | "dataflow" | "ai"
  enabled: boolean // 是否在活跃引擎集(dual-pass 关时 ai_opus=false)
  binary_present: boolean // 健康:false → 运行时降级 skipped
  optional: boolean // true=缺二进制降级而非报错;仅提示
  config_keys: string[] // 该引擎配置项 key,用于从 /config 归拢参数
}

export type EngineListResponse = { items: EngineItem[] }

// ── 系统画像(系统级视图,scanner FEAT / 系统画像)──────────────────────
// 逐一对照 scanner pydantic(admin.py SystemProfileResponse),不凭想象加字段。
// 四维:framework(派生)/ surface(引用接口 id)/ flow(拓扑+AI 关键流)/
// risks(引用 finding id)+ narrative(AI 叙述)。detail 明细走已有接口/ finding
// 端点按 id 下钻,画像不复制它们。
export type SystemProfileFramework = {
  languages?: { language: string; file_count: number }[]
  primary_language?: string | null
  framework?: string | null
  framework_version?: string | null
  build_tool?: string | null
  key_dependencies?: {
    group: string
    name: string
    version: string | null
    key: boolean
  }[]
  layers?: { name: string; packages: string[]; file_count: number }[]
}

export type SystemProfileSurface = {
  total_endpoints?: number
  by_risk?: Record<string, number>
  by_method?: Record<string, number>
  sensitive_interface_ids?: number[]
  admin_interface_ids?: number[]
  feign_count?: number
  outbound_count?: number
}

export type SystemProfileFlow = {
  outbound?: {
    host: string | null
    path: string | null
    method: string | null
    resolution: string
  }[]
  cross_service?: { outbound_call_id: number; target_interface_id: number }[]
  feign?: {
    interface_fqn: string
    target_service: string | null
    base_url: string | null
  }[]
  key_flows?: { name: string; steps: string[]; narrative: string }[]
}

export type SystemProfileRisks = {
  open_total?: number
  open_by_severity?: Record<string, number>
  top_finding_ids?: number[]
  themes?: string[]
  by_engine?: Record<string, number>
  group_count?: number
}

// 渗透视角:入口点(引用接口 id)/ 信任边界 / 注入点候选(引用 finding id)。
// 只列可从代码确证的项;外部可达性等需主机侧,列在 not_derivable_from_code。
export type SystemProfileRecon = {
  entry_points?: {
    interface_id: number
    method: string
    path: string
    risk: string | null
    sensitivity: string | null
  }[]
  trust_boundaries?: { name: string; kind: "http" | "feign" }[]
  injection_candidates?: {
    cwe: string
    label: string
    finding_ids: number[]
    count: number
  }[]
  not_derivable_from_code?: string[]
}

export type SystemProfile = {
  service_name: string
  project: string
  sha: string
  framework: SystemProfileFramework
  surface: SystemProfileSurface
  flow: SystemProfileFlow
  risks: SystemProfileRisks
  recon: SystemProfileRecon
  narrative: string | null
  generator_version: string
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  generated_at: string
}

export type SystemProfileHistory = {
  items: { sha: string; generator_version: string; generated_at: string }[]
}

// 项目级系统画像 rollup —— 整个项目(所有服务)聚合。
export type ProjectSystemProfile = {
  project: string
  service_count: number
  profiled_count: number
  tech_stack: {
    frameworks: { name: string; services: number }[]
    languages: { name: string; services: number }[]
  }
  surface: {
    total_endpoints: number
    by_risk: Record<string, number>
    sensitive_endpoints: number
  }
  risks: {
    open_total: number
    by_severity: Record<string, number>
    injection_candidates: {
      cwe: string
      label: string
      count: number
      finding_ids: number[]
    }[]
  }
  flow: { cross_service_edges: { from: string; to: string; calls: number }[] }
  recon: {
    entry_points: {
      interface_id: number
      method: string
      path: string
      risk: string | null
      sensitivity: string | null
      service: string
    }[]
    trust_boundaries: { name: string; kind: string }[]
    not_derivable_from_code: string[]
  }
  services: {
    name: string
    framework: string | null
    framework_version: string | null
    language: string | null
    endpoint_count: number
    by_risk: Record<string, number>
    open_findings: number
    has_profile: boolean
  }[]
}

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

// ── AI Hunt Category(AI 扫描规则,scanner FEAT-018)────────────────
// 字段逐一对照 scanner pydantic(admin.py HuntCategoryItem/Detail),不凭想象
// 加字段(见前端踩坑 F-005)。

// 列表项:规则元数据 + 参考规则映射(不含 prompt)
export type HuntCategoryItem = {
  name: string // 唯一 id,如 owasp_api01_bola
  enabled: boolean
  is_llm_category: boolean // true=OWASP LLM 集,仅当被扫代码用到 LLM 时才跑
  prompt_version: string
  source: "builtin" | "custom"
  sort_order: number
  owasp_refs: string[]
  cwes: string[]
  asvs_chapters: string[]
  updated_at: string
  updated_by: string | null
}

// 详情:列表项全部 + 完整 prompt + 选方法论 skill 的打分维度
export type HuntCategoryDetail = HuntCategoryItem & {
  system_prompt: string // 含哨兵 __TECH_STACK__(扫描时按技术栈替换),原样保留
  user_prompt_template: string // 含 {service_context}{file_path}{code}{rules_block} 占位符
  skill_subdomains: string[]
  mitre_attack_techniques: string[]
  nist_csf_subcategories: string[]
  d3fend_techniques: string[]
  skill_keywords: string[]
}

export type HuntCategoryListResp = { total: number; items: HuntCategoryItem[] }

// 新增自定义:name/system_prompt/user_prompt_template 必填,其余可选
export type HuntCategoryCreate = {
  name: string
  system_prompt: string
  user_prompt_template: string
  prompt_version?: string
  enabled?: boolean
  is_llm_category?: boolean
  skill_subdomains?: string[]
  mitre_attack_techniques?: string[]
  nist_csf_subcategories?: string[]
  d3fend_techniques?: string[]
  skill_keywords?: string[]
  owasp_refs?: string[]
  cwes?: string[]
  asvs_chapters?: string[]
}

// 部分更新:上面除 name 外任意字段子集(只传要改的)+ sort_order
export type HuntCategoryUpdate = Partial<Omit<HuntCategoryCreate, "name">> & {
  sort_order?: number
}

// ── 知识摄取文档(项目理解知识,scanner FEAT-018 phase C)──────────
export type Classification = "ai_context" | "user_doc" | "ops_doc"

export type KnowledgeDocItem = {
  id: number
  service_name: string
  sha: string
  doc_path: string
  source: "convention" | "ai_detected" | "manual"
  classification: Classification | null
  classification_reason: string | null
  human_edited: boolean // 人工改过 → 重扫不覆盖
  content_hash: string
  content_length: number
  fed_to_ai: boolean // 派生:是否真正喂给 AI(只有 ai_context 为 true)
  created_at: string
}

export type KnowledgeDocDetail = KnowledgeDocItem & { content: string }

export type KnowledgeDocListResp = { total: number; items: KnowledgeDocItem[] }

export type KnowledgeCreate = {
  sha: string
  doc_path: string
  content: string
  classification?: Classification // 默认 ai_context
}

export type KnowledgeUpdate = {
  content?: string
  classification?: Classification
}

// ── AI 参考规则库 / 方法论 skills(scanner FEAT-018 phase B,只读)────
// 这些才是「规则」(master_rules ~2038 + ASVS 345 + custom);ai/categories
// 是「审计类别」。规则库很大,服务端分页。
export type RuleItem = {
  source: "master_rules" | "asvs" | "custom"
  rule_id: string
  title: string
  severity: string | null
  level: string | null
  cwes: string[]
  owasp_refs: string[]
  asvs_refs: string[]
  languages: string[]
  source_url: string | null
}

export type RuleDetail = RuleItem & { description: string; license: string }

export type RuleListResp = {
  total: number
  limit: number
  offset: number
  items: RuleItem[]
}

export type SkillItem = {
  skill_id: string
  name: string
  summary: string
  subdomain: string
  tags: string[]
  mitre_attack: string[]
  nist_csf: string[]
  d3fend_techniques: string[]
  atlas_techniques: string[]
}

export type SkillDetail = SkillItem & { body: string } // body=方法论全文

export type SkillListResp = {
  total: number
  limit: number
  offset: number
  items: SkillItem[]
}

// ── AI 自定义参考规则(scanner FEAT-018 phase B2,CRUD)──────────────
export type CustomRuleItem = {
  rule_id: string
  enabled: boolean
  title: string
  license: string
  cwes: string[]
  owasp_refs: string[]
  asvs_refs: string[]
  languages: string[]
  severity: string | null
  level: string | null
  source_url: string | null
  updated_at: string
  updated_by: string | null
}

export type CustomRuleDetail = CustomRuleItem & { description: string }

export type CustomRuleListResp = { total: number; items: CustomRuleItem[] }

// 新增:rule_id/title/description 必填,其余可选。updated_by 服务端注入。
export type CustomRuleCreate = {
  rule_id: string
  title: string
  description: string
  license?: string
  enabled?: boolean
  cwes?: string[]
  owasp_refs?: string[]
  asvs_refs?: string[]
  languages?: string[]
  severity?: string | null
  level?: string | null
  source_url?: string | null
}

// 部分更新:上面除 rule_id 外任意字段子集(含启停)
export type CustomRuleUpdate = Partial<Omit<CustomRuleCreate, "rule_id">>

// ── 项目理解:服务 profile / ai-context 预览(scanner phase D)────────
export type ServiceProfile = {
  service_name: string
  business_summary: string | null
  description: string | null
  updated_at: string | null
  updated_by: string | null
}

// PUT /services/{name}/profile 是全量覆盖:两字段一起提交
export type ServiceProfileUpdate = {
  business_summary?: string | null
  description?: string | null
}

export type AiContextPreview = {
  service_name: string
  sha: string | null
  context: string // 大段文本 = AI 扫描实际输入
}

// 接口画像编辑(PUT /interfaces/{id});编辑任一字段自动锁定,
// 传 human_locked=false 交还 AI。
export type InterfaceProfileUpdate = {
  business_summary?: string | null
  sensitivity?: string | null
  op_type?: string | null
  risk_level?: string | null
  description?: string | null
  human_locked?: boolean
}

// PUT /interfaces/{id} 的返回:画像子集(不含 findings / 位置元数据)
export type InterfaceProfile = {
  id: number
  service_name: string
  http_method: string
  path: string
  handler: string | null
  description: string | null
  business_summary: string | null
  sensitivity: string | null
  op_type: string | null
  risk_level: "P0" | "P1" | "P2" | null
  human_locked: boolean
}

// ── 多项目(租户)+ 项目下服务定义(scanner FEAT-024/025)──────────────
// 逐一对照 scanner pydantic(admin.py ProjectItem/ServiceItem),不凭想象加字段
// (见踩坑 F-005)。language 兼容单值字符串或数组。

export type ProjectItem = {
  key: string // 稳定 slug,项目内数据以此隔离,不可变
  name: string
  enabled: boolean // false → 其服务不参与扫描(前端灰显)
  service_count: number
  created_at: string
  created_by: string | null
}

export type ProjectListResp = { total: number; items: ProjectItem[] }

// 建项目:key + name 必填;enabled 默认 true;created_by 后端注入当前用户
export type ProjectCreate = {
  key: string
  name: string
  enabled?: boolean
  created_by?: string
}

// 改项目:仅 name / enabled 可改(key 是隔离键,不可变)
export type ProjectUpdate = {
  name?: string
  enabled?: boolean
}

// 每项目扫描配置(scanner FEAT-027 M3)。仅 3 个键可按项目覆盖:
// AI_ENGINE_VERIFY(bool)/ AI_ENGINE_VERIFY_SEVERITIES(逗号分隔 str)/
// AI_ENGINE_CONCURRENCY(int 1-16)。global_default = 全局默认;value = 本项目生效值;
// is_overridden = 本项目是否已设覆盖(false 即跟随全局)。
export type ProjectConfigItem = {
  key: string
  global_default: unknown
  value: unknown
  is_overridden: boolean
}
export type ProjectConfigListResp = { items: ProjectConfigItem[] }

export type ServiceItem = {
  project: string
  group_name: string
  name: string
  repo_url: string
  ref: string
  path_in_repo: string // monorepo 子路径,单仓单服务为 "."
  language: string | string[] // scanner 侧 object:单值或多值
  framework: string | null
  service_type: string // service | library
  internal_url: string | null
  enabled: boolean
}

export type ServiceListResp = { total: number; items: ServiceItem[] }

// 加服务:name / repo_url 必填,其余走后端默认值
export type ServiceCreate = {
  name: string
  repo_url: string
  group_name?: string
  ref?: string
  path_in_repo?: string
  language?: string | string[]
  framework?: string | null
  service_type?: string
  internal_url?: string | null
  enabled?: boolean
}

// 部分更新:上面除 name 外任意子集(project 不可改)
export type ServiceUpdate = Partial<Omit<ServiceCreate, "name">>

// ── 按 GitLab 组地址导入项目(scanner FEAT-030)────────────────────────
export type GroupRepoStatus =
  | "new"
  | "already-in-this-project"
  | "conflict-other-project"
  | "archived"
  | "empty"

// discover 预览:每个仓库带建议字段 + 状态(是否已注册/冲突/空/归档)
export type DiscoveredRepo = {
  project_id: number
  path: string
  name: string
  repo_url: string
  suggested_name: string
  suggested_group_name: string
  suggested_ref: string
  suggested_language: string | null
  suggested_framework: string | null
  suggested_service_type: string
  status: GroupRepoStatus
  archived: boolean
  empty: boolean
  conflict_project: string | null
  selectable: boolean // false = 冲突 / 已注册,禁选
}

export type DiscoverGroupResp = {
  group_path: string
  total: number
  items: DiscoveredRepo[]
}

// import 入参:勾选的仓库(字段取自 discover 的 suggested_*)
export type GroupImportRepo = {
  project_id: number
  repo_url: string
  name: string
  group_name?: string
  ref?: string
  language?: string | string[]
  framework?: string | null
  service_type?: string
  enabled?: boolean
}

export type GroupImportBody = {
  project_key: string
  project_name?: string
  group_path: string
  repos: GroupImportRepo[]
}

export type WebhookOutcome = "created" | "exists" | "failed" | "skipped"

export type ImportRepoResult = {
  repo_url: string
  name: string
  outcome: "created" | "skipped-conflict" | "skipped-duplicate-name" | "error"
  webhook: WebhookOutcome
  detail: string | null
}

export type ImportGroupResp = {
  project: ProjectItem
  created: number
  skipped: number
  items: ImportRepoResult[]
}

export type SyncRepoResult = {
  repo_url: string
  name: string
  status:
    | "new"
    | "already-registered"
    | "conflict-other-project"
    | "supplemented"
    | "error"
  webhook: WebhookOutcome
  detail: string | null
}

export type SyncGroupResp = {
  project_key: string
  added: number
  skipped: number
  conflicts: number
  items: SyncRepoResult[]
}

// http://host/group/sub/proj.git → group/sub/proj(去 scheme / .git)
function repoUrlToNamespace(repoUrl: string): string | null {
  const afterScheme = repoUrl.split("://").pop() ?? repoUrl
  const slash = afterScheme.indexOf("/")
  if (slash < 0) return null
  let path = afterScheme.slice(slash + 1).replace(/\/+$/, "")
  if (path.endsWith(".git")) path = path.slice(0, -4)
  return path || null
}

// 从项目现有服务的 repo_url 推导 GitLab 组路径(同步弹框预填用)。
// 取各 repo 命名空间的目录部分(去掉仓库名那一段),求公共前缀。
// 全部同属一个组(如 iam/middleground/*)时得到 "iam/middleground";
// 无法推导返回 ""。
export function deriveGroupPath(services: { repo_url: string }[]): string {
  const dirs = services
    .map((s) => repoUrlToNamespace(s.repo_url))
    .filter((x): x is string => !!x)
    .map((ns) => ns.split("/").slice(0, -1))
  if (dirs.length === 0) return ""
  let prefix = dirs[0]
  for (const d of dirs.slice(1)) {
    let i = 0
    while (i < prefix.length && i < d.length && prefix[i] === d[i]) i++
    prefix = prefix.slice(0, i)
  }
  return prefix.join("/")
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
  stats: (project?: string) =>
    api
      .get<Stats>("/security/stats", {
        params: project ? { project } : {},
      })
      .then((r) => r.data),
  trend: (days = 14, project?: string) =>
    api
      .get<Trend>("/security/stats/trend", {
        params: { days, ...(project ? { project } : {}) },
      })
      .then((r) => r.data),
  categories: (
    dimension: CategoryAggregate["dimension"] = "owasp",
    opts: { service?: string; top?: number; project?: string } = {},
  ) =>
    api
      .get<CategoryAggregate>("/security/categories", {
        params: {
          dimension,
          top: opts.top ?? 20,
          ...(opts.service ? { service: opts.service } : {}),
          ...(opts.project ? { project: opts.project } : {}),
        },
      })
      .then((r) => r.data),
  verifierStats: (project?: string) =>
    api
      .get<VerifierStats>("/security/verifier-stats", {
        params: project ? { project } : {},
      })
      .then((r) => r.data),
  services: (project?: string) =>
    api
      .get<ServiceSummary[]>("/security/services", {
        params: project ? { project } : {},
      })
      .then((r) => r.data),
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
  // DAST(动态扫描):列出某服务的 DAST 历史 / 触发一次 DAST。project 非空则
  // 用于同名跨项目消歧(scanner ADR-0019),与 findings 等口径一致。
  dastRuns: (name: string, project?: string, limit = 20) =>
    api
      .get<DastRunList>(
        `/security/services/${encodeURIComponent(name)}/dast-runs`,
        { params: { limit, ...(project ? { project } : {}) } },
      )
      .then((r) => r.data),
  triggerDast: (name: string, project?: string) =>
    api
      .post<{ service: string; project: string; accepted: boolean }>(
        `/security/services/${encodeURIComponent(name)}/dast-scan`,
        null,
        { params: project ? { project } : {} },
      )
      .then((r) => r.data),
  // 运维:重建+部署 scanner(docker.sock 直控,内部工具)
  redeployScanner: () =>
    api
      .post<OpsStatus & { already_running: boolean }>(
        "/security/ops/scanner/redeploy",
      )
      .then((r) => r.data),
  opsStatus: () =>
    api.get<OpsStatus>("/security/ops/scanner/status").then((r) => r.data),
  // 全局扫描任务总览:后端并发聚合所有服务的 scan-runs(见 backend
  // security.py list_all_scan_runs)。每条 run 已带 service_name。
  allScanRuns: (
    opts: {
      limit_per_service?: number
      status?: string
      project?: string
    } = {},
  ) =>
    api
      .get<ScanRun[]>("/security/scan-runs", {
        params: {
          ...(opts.limit_per_service
            ? { limit_per_service: opts.limit_per_service }
            : {}),
          ...(opts.status ? { status: opts.status } : {}),
          ...(opts.project ? { project: opts.project } : {}),
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
  // ref 省略 → scanner 用该服务 manifest 配置的分支(如 sts=dev);仅覆盖时才传。
  triggerScan: (name: string, ref?: string, sha?: string) =>
    api
      .post<{
        task_id: string
        service: string
        sha: string
        accepted: boolean
      }>(`/security/services/${encodeURIComponent(name)}/scan`, null, {
        params: { ...(ref ? { ref } : {}), ...(sha ? { sha } : {}) },
      })
      .then((r) => r.data),
  recentFindings: (limit = 20, project?: string) =>
    api
      .get<FindingsList>("/security/findings", {
        params: { limit, sort: "-id", ...(project ? { project } : {}) },
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
      scan_run_id?: number
      project?: string // 多项目隔离:仅看该项目 findings
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
  // Findings 标签「按扫描批次」pill:最近 limit 次真实产出 finding 的扫描 + 条数。
  // engine/status 等透传,使 pill 计数与当前引擎筛选口径一致。
  findingRuns: (
    name: string,
    opts: {
      engine?: string
      rule_prefix?: string
      severity?: string
      status?: string
      limit?: number
    } = {},
  ) =>
    api
      .get<FindingRun[]>(`/security/services/${name}/finding-runs`, {
        params: opts,
      })
      .then((r) => r.data),
  triageFinding: (id: number, action: TriageAction, reason?: string) =>
    api
      .post<TriageResponse>(`/security/findings/${id}/triage`, {
        action,
        ...(reason ? { reason } : {}),
      })
      .then((r) => r.data),

  // ── 扫描引擎目录(DISC-004,只读,全局)────────────────────────
  engines: () =>
    api.get<EngineListResponse>("/security/engines").then((r) => r.data),

  // ── 系统画像(系统级视图)──────────────────────────────────────
  systemProfile: (name: string, sha?: string, project?: string) =>
    api
      .get<SystemProfile>(
        `/security/services/${encodeURIComponent(name)}/system-profile`,
        {
          params: {
            ...(sha ? { sha } : {}),
            ...(project ? { project } : {}),
          },
        },
      )
      .then((r) => r.data),
  systemProfileHistory: (name: string, project?: string) =>
    api
      .get<SystemProfileHistory>(
        `/security/services/${encodeURIComponent(name)}/system-profile/history`,
        { params: project ? { project } : {} },
      )
      .then((r) => r.data),
  regenerateSystemProfile: (name: string, project?: string) =>
    api
      .post<SystemProfile>(
        `/security/services/${encodeURIComponent(name)}/system-profile/regenerate`,
        null,
        { params: project ? { project } : {} },
      )
      .then((r) => r.data),
  // 项目级 rollup(整个项目所有服务聚合)
  projectSystemProfile: (key: string) =>
    api
      .get<ProjectSystemProfile>(
        `/security/projects/${encodeURIComponent(key)}/system-profile`,
      )
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
  costStats: (service?: string, days?: number, project?: string) =>
    api
      .get<CostStats>("/security/cost-stats", {
        params: {
          ...(service ? { service } : {}),
          ...(days ? { days } : {}),
          ...(project ? { project } : {}),
        },
      })
      .then((r) => r.data),

  // 单次扫描成本明细(FEAT-009 第三级下钻)。返回最近 limit 次有成本记录的扫描。
  costRuns: (service?: string, days?: number, limit = 50, project?: string) =>
    api
      .get<RunCost[]>("/security/cost-runs", {
        params: {
          ...(service ? { service } : {}),
          ...(days ? { days } : {}),
          limit,
          ...(project ? { project } : {}),
        },
      })
      .then((r) => r.data),

  // ── AI 复核统计(FEAT-005)─────────────────────────────────────
  findingReviewStats: (service?: string, project?: string) =>
    api
      .get<FindingReviewStats>("/security/finding-review-stats", {
        params: {
          ...(service ? { service } : {}),
          ...(project ? { project } : {}),
        },
      })
      .then((r) => r.data),

  // ── AI Hunt Category(AI 扫描规则,FEAT-018)──────────────────────
  aiCategories: (
    opts: { enabled?: boolean; source?: "builtin" | "custom" } = {},
  ) =>
    api
      .get<HuntCategoryListResp>("/security/ai/categories", {
        params: {
          ...(opts.enabled !== undefined ? { enabled: opts.enabled } : {}),
          ...(opts.source ? { source: opts.source } : {}),
        },
      })
      .then((r) => r.data),
  aiCategory: (name: string) =>
    api
      .get<HuntCategoryDetail>(
        `/security/ai/categories/${encodeURIComponent(name)}`,
      )
      .then((r) => r.data),
  createAiCategory: (body: HuntCategoryCreate) =>
    api
      .post<HuntCategoryDetail>("/security/ai/categories", body)
      .then((r) => r.data),
  updateAiCategory: (name: string, body: HuntCategoryUpdate) =>
    api
      .put<HuntCategoryDetail>(
        `/security/ai/categories/${encodeURIComponent(name)}`,
        body,
      )
      .then((r) => r.data),
  deleteAiCategory: (name: string) =>
    api.delete<void>(`/security/ai/categories/${encodeURIComponent(name)}`),

  // ── 知识摄取文档(FEAT-018 phase C)──────────────────────────────
  knowledgeDocs: (
    service: string,
    opts: { sha?: string; classification?: Classification } = {},
  ) =>
    api
      .get<KnowledgeDocListResp>(
        `/security/services/${encodeURIComponent(service)}/knowledge`,
        {
          params: {
            ...(opts.sha ? { sha: opts.sha } : {}),
            ...(opts.classification
              ? { classification: opts.classification }
              : {}),
          },
        },
      )
      .then((r) => r.data),
  knowledgeDoc: (id: number) =>
    api
      .get<KnowledgeDocDetail>(`/security/knowledge/${id}`)
      .then((r) => r.data),
  createKnowledgeDoc: (service: string, body: KnowledgeCreate) =>
    api
      .post<KnowledgeDocDetail>(
        `/security/services/${encodeURIComponent(service)}/knowledge`,
        body,
      )
      .then((r) => r.data),
  updateKnowledgeDoc: (id: number, body: KnowledgeUpdate) =>
    api
      .put<KnowledgeDocDetail>(`/security/knowledge/${id}`, body)
      .then((r) => r.data),
  deleteKnowledgeDoc: (id: number) =>
    api.delete<void>(`/security/knowledge/${id}`),

  // ── AI 参考规则库 / 方法论 skills(FEAT-018 phase B,只读)──────────
  rules: (
    opts: {
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
    api
      .get<RuleListResp>("/security/ai/rules", { params: opts })
      .then((r) => r.data),
  // source/rule_id 直接拼进路径;rule_id 可含斜杠(scanner 侧 path 参数)。
  rule: (source: string, ruleId: string) =>
    api
      .get<RuleDetail>(`/security/ai/rules/${source}/${ruleId}`)
      .then((r) => r.data),
  skills: (
    opts: {
      q?: string
      subdomain?: string
      tag?: string
      limit?: number
      offset?: number
    } = {},
  ) =>
    api
      .get<SkillListResp>("/security/ai/skills", { params: opts })
      .then((r) => r.data),
  skill: (skillId: string) =>
    api
      .get<SkillDetail>(`/security/ai/skills/${encodeURIComponent(skillId)}`)
      .then((r) => r.data),

  // ── AI 自定义参考规则(FEAT-018 phase B2,CRUD)────────────────────
  customRules: (enabled?: boolean) =>
    api
      .get<CustomRuleListResp>("/security/ai/custom-rules", {
        params: enabled !== undefined ? { enabled } : {},
      })
      .then((r) => r.data),
  customRule: (ruleId: string) =>
    api
      .get<CustomRuleDetail>(
        `/security/ai/custom-rules/${encodeURIComponent(ruleId)}`,
      )
      .then((r) => r.data),
  createCustomRule: (body: CustomRuleCreate) =>
    api
      .post<CustomRuleDetail>("/security/ai/custom-rules", body)
      .then((r) => r.data),
  updateCustomRule: (ruleId: string, body: CustomRuleUpdate) =>
    api
      .put<CustomRuleDetail>(
        `/security/ai/custom-rules/${encodeURIComponent(ruleId)}`,
        body,
      )
      .then((r) => r.data),
  deleteCustomRule: (ruleId: string) =>
    api.delete<void>(`/security/ai/custom-rules/${encodeURIComponent(ruleId)}`),

  // ── 项目理解:接口画像 / 服务 profile / ai-context(phase D)────────
  updateInterface: (id: number, body: InterfaceProfileUpdate) =>
    api
      .put<InterfaceProfile>(`/security/interfaces/${id}`, body)
      .then((r) => r.data),
  getServiceProfile: (name: string) =>
    api
      .get<ServiceProfile>(
        `/security/services/${encodeURIComponent(name)}/profile`,
      )
      .then((r) => r.data),
  updateServiceProfile: (name: string, body: ServiceProfileUpdate) =>
    api
      .put<ServiceProfile>(
        `/security/services/${encodeURIComponent(name)}/profile`,
        body,
      )
      .then((r) => r.data),
  deleteServiceProfile: (name: string) =>
    api.delete<void>(`/security/services/${encodeURIComponent(name)}/profile`),
  aiContext: (name: string, sha?: string, project?: string) =>
    api
      .get<AiContextPreview>(
        `/security/services/${encodeURIComponent(name)}/ai-context`,
        {
          params: { ...(sha ? { sha } : {}), ...(project ? { project } : {}) },
        },
      )
      .then((r) => r.data),

  // ── 多项目:项目(租户)CRUD(scanner FEAT-024)────────────────────
  projects: () =>
    api.get<ProjectListResp>("/security/projects").then((r) => r.data),
  createProject: (body: ProjectCreate) =>
    api.post<ProjectItem>("/security/projects", body).then((r) => r.data),
  updateProject: (key: string, body: ProjectUpdate) =>
    api
      .put<ProjectItem>(`/security/projects/${encodeURIComponent(key)}`, body)
      .then((r) => r.data),
  deleteProject: (key: string) =>
    api.delete<void>(`/security/projects/${encodeURIComponent(key)}`),

  // ── 多项目:项目下服务定义 CRUD ────────────────────────────────────
  projectServices: (key: string) =>
    api
      .get<ServiceListResp>(
        `/security/projects/${encodeURIComponent(key)}/services`,
      )
      .then((r) => r.data),
  createProjectService: (key: string, body: ServiceCreate) =>
    api
      .post<ServiceItem>(
        `/security/projects/${encodeURIComponent(key)}/services`,
        body,
      )
      .then((r) => r.data),
  updateProjectService: (key: string, name: string, body: ServiceUpdate) =>
    api
      .put<ServiceItem>(
        `/security/projects/${encodeURIComponent(key)}/services/${encodeURIComponent(name)}`,
        body,
      )
      .then((r) => r.data),
  deleteProjectService: (key: string, name: string) =>
    api.delete<void>(
      `/security/projects/${encodeURIComponent(key)}/services/${encodeURIComponent(name)}`,
    ),

  // ── 按 GitLab 组地址导入项目(scanner FEAT-030)────────────────────
  discoverGroup: (body: { group_path: string; project_key?: string }) =>
    api
      .post<DiscoverGroupResp>("/security/projects/discover-group", body)
      .then((r) => r.data),
  importProjectFromGroup: (body: GroupImportBody) =>
    api
      .post<ImportGroupResp>("/security/projects/import-group", body)
      .then((r) => r.data),
  syncProjectGroup: (key: string, body: { group_path: string }) =>
    api
      .post<SyncGroupResp>(
        `/security/projects/${encodeURIComponent(key)}/sync-group`,
        body,
      )
      .then((r) => r.data),

  // ── 多项目:每项目扫描配置覆盖(scanner FEAT-027 M3)────────────────
  projectConfig: (key: string) =>
    api
      .get<ProjectConfigListResp>(
        `/security/projects/${encodeURIComponent(key)}/config`,
      )
      .then((r) => r.data),
  // 设置覆盖:updates 只含要覆盖的键;非白名单键 / 越界值 → 后端 400。
  updateProjectConfig: (key: string, updates: Record<string, unknown>) =>
    api
      .put<ProjectConfigListResp>(
        `/security/projects/${encodeURIComponent(key)}/config`,
        { updates },
      )
      .then((r) => r.data),
  // 删单个覆盖:该键回退全局默认。
  deleteProjectConfigKey: (key: string, configKey: string) =>
    api.delete<void>(
      `/security/projects/${encodeURIComponent(key)}/config/${encodeURIComponent(configKey)}`,
    ),
}

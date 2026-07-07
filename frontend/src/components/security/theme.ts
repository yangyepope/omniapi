// 安全区(AI 安全 / gitlab-scan)统一视觉配置。
//
// ⚠ 重要:本项目 main.tsx 设了 ThemeProvider defaultTheme="dark",<html> 常带 .dark,
// 因此语义 token(bg-card / bg-muted / text-foreground / border / bg-primary)会解析成
// **深色**。而全站(ServiceCard、服务页、侧边栏)一律用**字面亮色调色板**(bg-white /
// border-gray-100 / text-gray-900 / text-blue-600)强制亮色。为与全站一致,安全区也全部
// 用字面亮色类,不用会随主题翻转的语义 token。此处集中定义徽章 chip 类与图表色。

// ── 严重度 ──────────────────────────────────────────────────────────
// chip:徽章的字面类;hex:图表/左边框等无法用类的场景。
export const SEVERITY_META: Record<
  string,
  { label: string; chip: string; hex: string }
> = {
  CRITICAL: {
    label: "严重",
    chip: "bg-red-50 text-red-600 border-red-100",
    hex: "#dc2626",
  },
  HIGH: {
    label: "高危",
    chip: "bg-orange-50 text-orange-600 border-orange-100",
    hex: "#ea580c",
  },
  MEDIUM: {
    label: "中危",
    chip: "bg-amber-50 text-amber-600 border-amber-100",
    hex: "#d97706",
  },
  LOW: {
    label: "低危",
    chip: "bg-blue-50 text-blue-600 border-blue-100",
    hex: "#2563eb",
  },
  INFO: {
    label: "提示",
    chip: "bg-gray-100 text-gray-500 border-gray-200",
    hex: "#64748b",
  },
}
export const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]

// ── 扫描任务状态 ────────────────────────────────────────────────────
export const SCAN_STATUS_META: Record<
  string,
  { label: string; chip: string; hex: string }
> = {
  completed: {
    label: "已完成",
    chip: "bg-green-50 text-green-600 border-green-100",
    hex: "#16a34a",
  },
  running: {
    label: "运行中",
    chip: "bg-blue-50 text-blue-600 border-blue-100",
    hex: "#2563eb",
  },
  failed: {
    label: "失败",
    chip: "bg-red-50 text-red-600 border-red-100",
    hex: "#dc2626",
  },
  aborted: {
    label: "已中止",
    chip: "bg-gray-100 text-gray-500 border-gray-200",
    hex: "#94a3b8",
  },
  // 心跳超时:scanner 后台 sweeper 判定 running 无心跳后置为 timed_out(与主动
  // 失败 failed / 人工中止 aborted 区分),用琥珀色表示"异常中断、非硬失败"
  timed_out: {
    label: "已超时",
    chip: "bg-amber-50 text-amber-600 border-amber-100",
    hex: "#d97706",
  },
}

// ── 扫描阶段(FEAT-011)──────────────────────────────────────────────
// scanner _scan_body 在每个阶段边界写 scan_runs.current_stage;引擎阶段写
// "engine:<引擎名>"。STAGE_ORDER 是进度条固定顺序(引擎阶段合并成一个
// "engines" 槽,当前具体引擎名由 current_stage 动态显示)。
export const STAGE_ORDER = [
  "source_fetch",
  "extract_interfaces",
  "upsert_interfaces",
  "dependency_analysis",
  "artifact_discovery",
  "knowledge",
  "risk_classification",
  "engines",
  "corroboration",
  "finding_review",
] as const

export const STAGE_META: Record<string, string> = {
  source_fetch: "拉取源码",
  extract_interfaces: "提取接口",
  upsert_interfaces: "写入接口",
  dependency_analysis: "依赖分析",
  artifact_discovery: "制品发现",
  knowledge: "知识摄取",
  risk_classification: "接口风险分级",
  engines: "引擎扫描",
  corroboration: "跨引擎互证",
  finding_review: "AI 复核",
}

// scan_runs.phases_completed 的键名 → STAGE_ORDER 槽名(scanner 侧历史命名
// 与阶段 id 不完全一致:风险分级阶段的 phase 键是 interface_risk_classification)
export const PHASE_KEY_FOR_STAGE: Record<string, string> = {
  knowledge: "knowledge",
  risk_classification: "interface_risk_classification",
}

/** current_stage 值 → 中文标签。`engine:Foo` → "执行引擎 Foo"。 */
export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return "—"
  if (stage.startsWith("engine:")) return `执行引擎 ${stage.slice(7)}`
  return STAGE_META[stage] ?? stage
}

/** current_stage 归一到 STAGE_ORDER 的槽名(engine:* → "engines")。 */
export function stageSlot(stage: string | null | undefined): string | null {
  if (!stage) return null
  if (stage.startsWith("engine:")) return "engines"
  return stage
}

// ── 低价值接口识别(FEAT:前端隐藏用)────────────────────────────────
// 错误页(/404、/500…、/error)与运维/基础设施(actuator/health/metrics…)
// 端点是真实映射但非业务攻击面。按**路径**(稳定、不依赖分级结果的新鲜度)
// 识别,镜像 scanner 侧 RuleBasedRiskPrefilter 的正则;仅用于前端默认隐藏,
// 绝不影响其名下 finding 的展示(findings 只按裁决过滤)。
const _LOW_VALUE_PATH_RE =
  /^\/(?:[45]\d{2}|error|actuator|health|healthz|readyz|livez|metrics|prometheus|info)\b/i

export function isLowValueInterface(iface: {
  path?: string | null
  handler?: string | null
}): boolean {
  const path = iface.path ?? ""
  const handler = iface.handler ?? ""
  if (_LOW_VALUE_PATH_RE.test(path)) return true
  // 类名以 Exception/Error + Controller/Handler/Advice 结尾的错误处理器
  return /(?:exception|error)\w*(?:controller|handler|advice)\b/i.test(handler)
}

// ── 接口风险等级 ────────────────────────────────────────────────────
export const RISK_META: Record<string, { label: string; chip: string }> = {
  P0: { label: "P0", chip: "bg-red-50 text-red-600 border-red-100" },
  P1: { label: "P1", chip: "bg-orange-50 text-orange-600 border-orange-100" },
  P2: { label: "P2", chip: "bg-amber-50 text-amber-600 border-amber-100" },
}

// ── HTTP 方法 → chip ────────────────────────────────────────────────
export const METHOD_CHIP: Record<string, string> = {
  GET: "bg-green-50 text-green-700 border-green-100",
  POST: "bg-blue-50 text-blue-700 border-blue-100",
  PUT: "bg-amber-50 text-amber-700 border-amber-100",
  DELETE: "bg-red-50 text-red-700 border-red-100",
  PATCH: "bg-violet-50 text-violet-700 border-violet-100",
}

// ── recharts 亮色主题 ───────────────────────────────────────────────
// 品牌蓝 blue-600,浅灰网格,白底 tooltip;与全站蓝色点缀一致。
export const CHART = {
  grid: "#eef2f7",
  axis: "#94a3b8",
  brand: "#2563eb",
  brandSoft: "#60a5fa",
  accent: "#7c3aed",
  positive: "#16a34a",
  warn: "#ea580c",
  tooltip: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
    fontSize: 12,
    color: "#0f172a",
  },
  legend: { color: "#475569", fontSize: 12 },
} as const

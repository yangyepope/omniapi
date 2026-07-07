// react-query hooks for the 大屏. 30s heartbeat refetch.
import { useQuery } from "@tanstack/react-query"
import { SecurityApi } from "./api"

const REFRESH_MS = 30_000

// 服务详情页 Findings 标签默认只看最近 N 次扫描的结果(用户诉求:不要全量历史堆积,
// 只关心近期扫描)。放常量而非散落魔法数,便于统一调整。
const RECENT_SCAN_RUNS = 3

export const useStats = () =>
  useQuery({
    queryKey: ["security", "stats"],
    queryFn: SecurityApi.stats,
    refetchInterval: REFRESH_MS,
  })

export const useTrend = (days = 14) =>
  useQuery({
    queryKey: ["security", "trend", days],
    queryFn: () => SecurityApi.trend(days),
    refetchInterval: REFRESH_MS,
  })

export const useCategories = (
  dimension: "owasp" | "cwe" | "engine" | "rule_namespace" = "owasp",
) =>
  useQuery({
    queryKey: ["security", "categories", dimension],
    queryFn: () => SecurityApi.categories(dimension),
    refetchInterval: REFRESH_MS,
  })

export const useVerifierStats = () =>
  useQuery({
    queryKey: ["security", "verifier-stats"],
    queryFn: SecurityApi.verifierStats,
    refetchInterval: REFRESH_MS,
  })

export const useServiceList = () =>
  useQuery({
    queryKey: ["security", "services"],
    queryFn: SecurityApi.services,
    refetchInterval: REFRESH_MS,
  })

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

// 全局扫描任务总览:跨所有服务的 scan run。status 变化驱动重取(进 query key)。
export const useAllScanRuns = (
  opts: { limit_per_service?: number; status?: string } = {},
) =>
  useQuery({
    queryKey: [
      "security",
      "scan-runs",
      "all",
      opts.status ?? "",
      opts.limit_per_service ?? 0,
    ],
    queryFn: () => SecurityApi.allScanRuns(opts),
    refetchInterval: REFRESH_MS,
  })

export const useRecentFindings = (limit = 20) =>
  useQuery({
    queryKey: ["security", "findings", "recent", limit],
    queryFn: () => SecurityApi.recentFindings(limit),
    refetchInterval: REFRESH_MS,
  })

export const useFinding = (id: number) =>
  useQuery({
    queryKey: ["security", "finding", id],
    queryFn: () => SecurityApi.getFinding(id),
    enabled: Number.isFinite(id) && id > 0,
  })

export const useServiceFindings = (service: string, limit = 100) =>
  useQuery({
    queryKey: [
      "security",
      "findings",
      "service",
      service,
      limit,
      RECENT_SCAN_RUNS,
    ],
    queryFn: () =>
      SecurityApi.listFindings({
        service,
        limit,
        sort: "-id",
        recent_runs: RECENT_SCAN_RUNS,
      }),
    refetchInterval: REFRESH_MS,
    enabled: Boolean(service),
  })

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

// ── 成本统计(FEAT-009)────────────────────────────────────────
export const useCostStats = (service?: string, days?: number) =>
  useQuery({
    queryKey: ["security", "cost-stats", service ?? "", days ?? 0],
    queryFn: () => SecurityApi.costStats(service, days),
    refetchInterval: REFRESH_MS,
  })

// 单次扫描成本明细(FEAT-009 第三级下钻)。service/days 变化进 query key 驱动重取。
export const useCostRuns = (service?: string, days?: number, limit = 50) =>
  useQuery({
    queryKey: ["security", "cost-runs", service ?? "", days ?? 0, limit],
    queryFn: () => SecurityApi.costRuns(service, days, limit),
    refetchInterval: REFRESH_MS,
  })

// ── AI 复核统计(FEAT-005)─────────────────────────────────────
export const useFindingReviewStats = (service?: string) =>
  useQuery({
    queryKey: ["security", "finding-review-stats", service ?? ""],
    queryFn: () => SecurityApi.findingReviewStats(service),
    refetchInterval: REFRESH_MS,
  })

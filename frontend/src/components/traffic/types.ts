/**
 * traffic 领域共享类型定义
 *
 * [Why]：VariantPublic / VariantsPublic 在 index.tsx（流量详情页）和
 * new-variant.tsx（新建变体页）中重复定义，统一到此文件后由两个路由共享，
 * 避免类型漂移。KVPair 是 HeadersEditor 的内部数据结构，同样集中管理。
 *
 * 注意：SDK 自动生成的 @/client/types.gen 暂未包含 Variant 相关类型，
 * 待后端 openapi.json 同步后可删除此处的手动补全。
 */

// ─── 变体（Variant）相关类型 ───────────────────────────────────────────────

/** 单条变体的完整公开字段 */
export type VariantPublic = {
  id: string
  root_flow_id: string
  name: string
  description?: string | null
  method: string
  url: string
  headers?: Record<string, unknown> | null
  body_str?: string | null
  last_response_code?: number | null
  last_response_body?: string | null
  last_latency_ms?: number | null
  last_replay_at?: string | null
  created_at: string
}

/** 变体列表响应结构（与后端 VariantsPublic 对应） */
export type VariantsPublic = {
  data: VariantPublic[]
  count: number
}

// ─── HeadersEditor 内部数据结构 ───────────────────────────────────────────

/** KV 编辑器中的单行键值对 */
export type KVPair = {
  key: string
  value: string
}

/**
 * 流量详情页 (Traffic Record Detail)
 *
 * 路由：/services/:serviceId/:endpointId/:trafficId
 * 设计稿来源：Stitch 项目 553729816665366717 「流量详情-逻辑优化版」
 *
 * 页面结构：
 *   - 顶部：面包屑 + 操作按钮（导出 / 删除 / 执行重放）
 *   - 标签页：请求信息 | 变体管理 | 重放历史
 *   - 请求信息 Tab：左侧基本指标 + Headers，右侧 Request Body 查看器
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  GitBranch,
  History,
  Info,
  Maximize2,
  Play,
  Trash2,
  X,
} from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"

import { TrafficManagerService } from "@/client"
import type { TrafficRecordPublic } from "@/client/types.gen"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────
// 路由注册
// ─────────────────────────────────────────────
export const Route = createFileRoute(
  "/_layout/services/$serviceId/$endpointId/$trafficId",
)({
  component: TrafficDetailPage,
})

// ─────────────────────────────────────────────
// 辅助：Method 徽章颜色（与列表页保持一致）
// ─────────────────────────────────────────────
const METHOD_STYLES: Record<string, string> = {
  GET:    "bg-blue-50 text-blue-600 border-blue-200",
  POST:   "bg-red-50 text-red-500 border-red-200",
  PUT:    "bg-green-50 text-green-600 border-green-200",
  DELETE: "bg-orange-50 text-orange-600 border-orange-200",
  PATCH:  "bg-purple-50 text-purple-600 border-purple-200",
}

// ─────────────────────────────────────────────
// 辅助：格式化绝对时间
// ─────────────────────────────────────────────
const formatAbsoluteTime = (value?: string | null): string => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  const s = String(date.getSeconds()).padStart(2, "0")
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

// ─────────────────────────────────────────────
// 工具函数：execCommand 降级复制
// 原因：navigator.clipboard 需要 HTTPS/localhost，HTTP 内网环境会静默失败
// ─────────────────────────────────────────────
function copyViaExecCommand(text: string): void {
  const el = document.createElement("textarea")
  el.value = text
  el.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;"
  document.body.appendChild(el)
  el.focus()
  el.select()
  try {
    // execCommand 已被标记 deprecated，但作为 HTTP 内网环境的唯一降级手段，各主流浏览器仍完整支持
    // 通过 unknown 转型绕过 TS 弃用提示，避免噪音告警
    ;(document as unknown as { execCommand: (cmd: string) => boolean }).execCommand("copy")
  } finally { document.body.removeChild(el) }
}

function copyText(text: string, onSuccess: () => void) {
  if (navigator?.clipboard) {
    // 优先 Clipboard API，失败时自动降级
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      copyViaExecCommand(text)
      onSuccess()
    })
  } else {
    copyViaExecCommand(text)
    onSuccess()
  }
}

// ─────────────────────────────────────────────
// 子组件：代码块（可复用于内联和全屏两种场景）
// ─────────────────────────────────────────────
function CodeBlock({ content, maxHeight = "420px" }: { content: string; maxHeight?: string }) {
  return (
    <div className="bg-[#1a1d23] overflow-x-auto overflow-y-auto" style={{ maxHeight }}>
      <pre className="p-6 text-[12px] font-mono text-[#9cdcfe] leading-relaxed whitespace-pre">
        {content}
      </pre>
    </div>
  )
}

// ─────────────────────────────────────────────
// 子组件：Request Body 查看器（内联 + 全屏放大）
// ─────────────────────────────────────────────
function BodyViewer({ body }: { body: string | null | undefined }) {
  const [copied, setCopied] = useState(false)
  // 全屏弹层开关
  const [fullscreen, setFullscreen] = useState(false)

  // 尝试格式化为缩进 JSON，失败则原文展示
  const formatted = (() => {
    if (!body) return null
    try {
      return JSON.stringify(JSON.parse(body), null, 2)
    } catch {
      return body
    }
  })()

  // 复制：优先 Clipboard API，降级到 execCommand（兼容 HTTP 内网）
  const handleCopy = () => {
    if (!formatted) return
    copyText(formatted, () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (!formatted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center">
          <span className="text-2xl text-on-surface-variant/30 font-mono">{"{}"}</span>
        </div>
        <p className="text-sm font-bold text-on-surface-variant">无请求内容</p>
        <p className="text-[11px] text-on-surface-variant/50 max-w-[200px]">
          原始请求捕获时不包含请求体，执行重放后将在此展示回放数据。
        </p>
      </div>
    )
  }

  return (
    <>
      {/* ── 内联视图 ── */}
      <div className="relative">
        {/* 工具栏：JSON 标记 + 复制 + 全屏 */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-container-low/50 border-b border-outline-variant/5">
          <Badge variant="neutral" className="text-[9px] font-black uppercase">JSON</Badge>
          <div className="flex items-center gap-3">
            {/* 复制按钮 */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant hover:text-primary-fixed transition-colors duration-200 cursor-pointer"
            >
              {copied
                ? <Check className="w-3 h-3 text-secondary-fixed" />
                : <Copy className="w-3 h-3" />}
              {copied ? "已复制" : "复制"}
            </button>
            {/* 全屏放大按钮 — 点击后在弹层中展示完整内容 */}
            <button
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant hover:text-primary-fixed transition-colors duration-200 cursor-pointer"
              title="全屏查看"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <CodeBlock content={formatted} maxHeight="420px" />
      </div>

      {/* ── 全屏弹层 ── */}
      <AnimatePresence>
        {fullscreen && (
          // 遮罩层：覆盖全屏，点击背景可关闭
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setFullscreen(false)}
          >
            {/* 弹层内容区：阻止点击冒泡到遮罩 */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-5xl max-h-[90vh] bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 弹层头部 */}
              <div className="flex items-center justify-between px-5 py-3 bg-surface-container-low/50 border-b border-outline-variant/5 shrink-0">
                <div className="flex items-center gap-3">
                  <Badge variant="neutral" className="text-[9px] font-black uppercase">JSON</Badge>
                  <span className="text-xs font-bold text-on-surface-variant">Request Body</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* 全屏模式的复制按钮 */}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant hover:text-primary-fixed transition-colors duration-200 cursor-pointer"
                  >
                    {copied
                      ? <Check className="w-3 h-3 text-secondary-fixed" />
                      : <Copy className="w-3 h-3" />}
                    {copied ? "已复制" : "复制"}
                  </button>
                  {/* 关闭按钮 */}
                  <button
                    onClick={() => setFullscreen(false)}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* 全屏代码区：铺满弹层剩余高度 */}
              <div className="flex-1 overflow-auto bg-[#1a1d23]">
                <pre className="p-6 text-[13px] font-mono text-[#9cdcfe] leading-relaxed whitespace-pre">
                  {formatted}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─────────────────────────────────────────────
// 子组件：基本指标信息行
// ─────────────────────────────────────────────
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-outline-variant/5 last:border-0">
      {/* 左侧标签固定宽度，右对齐 */}
      <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest min-w-[72px] pt-0.5">
        {label}
      </span>
      <div className="flex-1 text-xs font-medium text-on-surface">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 主页面组件
// ─────────────────────────────────────────────
function TrafficDetailPage() {
  const { serviceId, endpointId, trafficId } = Route.useParams()

  // 当前激活的标签页："info" | "variants" | "history"
  const [activeTab, setActiveTab] = useState<"info" | "variants" | "history">("info")

  // 通过 getEndpointTraffic 拉取该接口全部流量记录，再从中找到目标条目
  // 原因：后端暂无单条流量详情接口，复用列表查询结果即可
  const trafficQuery = useQuery({
    queryKey: ["traffic-manager", "endpoint-traffic", endpointId],
    queryFn: () =>
      TrafficManagerService.getEndpointTraffic({
        endpointId,
        skip: 0,
        limit: 100,
      }),
  })

  // 从列表中定位当前 trafficId 对应的记录
  // trafficQuery.data 类型为 TrafficRecordsPublic，其 .data 字段即记录数组
  const records: TrafficRecordPublic[] = trafficQuery.data?.data ?? []
  const record = records.find((r) => r.id === trafficId)

  // 加载中态
  if (trafficQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-fixed/30 border-t-primary-fixed rounded-full animate-spin" />
          <p className="text-xs font-bold text-on-surface-variant/50">加载流量记录中...</p>
        </div>
      </div>
    )
  }

  // 未找到记录时的 404 提示
  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm font-bold text-on-surface-variant">未找到该流量记录</p>
        <Link
          to="/services/$serviceId/$endpointId"
          params={{ serviceId, endpointId }}
          className="text-xs font-bold text-primary-fixed hover:underline"
        >
          ← 返回接口详情
        </Link>
      </div>
    )
  }

  // 解构常用字段（字段名以 TrafficRecordPublic 类型为准）
  const { method, real_uri, headers, body, source_ip, created_at } = record

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── 页头区域 ─────────────────────────────── */}
      <div className="space-y-4">
        {/* 标题行：流量详情 + VERIFIED 状态徽章 + 操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 返回箭头 */}
            <Link
              to="/services/$serviceId/$endpointId"
              params={{ serviceId, endpointId }}
              className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-primary-fixed transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-black text-on-surface tracking-tight">流量详情</h1>
            {/* VERIFIED 状态徽章 — 与 Stitch 设计稿对应 */}
            <span className="px-2 py-0.5 rounded-md bg-secondary-fixed/20 text-secondary-fixed border border-secondary-fixed/20 text-[9px] font-black uppercase tracking-widest">
              VERIFIED
            </span>
          </div>

          {/* 操作按钮组（对应设计稿右上角：导出 / 删除 / 执行重放） */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant/20 text-on-surface-variant text-xs font-bold hover:bg-surface-container-low transition-all duration-200 cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              导出
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-all duration-200 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
              删除
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-fixed text-on-primary text-xs font-bold shadow-lg shadow-primary-fixed/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <Play className="w-3.5 h-3.5" />
              执行重放
            </button>
          </div>
        </div>

        {/* 标签页切换：请求信息 / 变体管理 / 重放历史 */}
        <div className="flex items-center gap-1 border-b border-outline-variant/10">
          {(
            [
              { key: "info",     label: "请求信息", icon: Info },
              { key: "variants", label: "变体管理", icon: GitBranch },
              { key: "history",  label: "重放历史", icon: History },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                // 基础：紧凑 padding、小字体、无边框底色
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer",
                // 活跃状态：蓝色底边 + 文字高亮
                activeTab === key
                  ? "text-primary-fixed border-b-2 border-primary-fixed -mb-px"
                  : "text-on-surface-variant/60 hover:text-on-surface-variant border-b-2 border-transparent -mb-px"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 请求信息 Tab 内容 ─────────────────────── */}
      {activeTab === "info" && (
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧：基本指标 + HTTP Headers（对应 Stitch 设计稿左栏 30%） */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* 基本指标卡片 */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-surface-container-low/40 border-b border-outline-variant/5 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-primary-fixed" />
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  基本指标
                </span>
              </div>
              <div className="px-4 py-2">
                <MetaRow label="捕获时间">
                  <span className="font-mono text-[11px]">{formatAbsoluteTime(created_at)}</span>
                </MetaRow>
                <MetaRow label="接口动作">
                  <span
                    className={cn(
                      "inline-block font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded border",
                      METHOD_STYLES[method?.toUpperCase()] ??
                        "bg-surface-container-high text-on-surface-variant border-outline-variant/20",
                    )}
                  >
                    {method}
                  </span>
                </MetaRow>
                <MetaRow label="原始路径">
                  {/* real_uri 优先；若为空则兜底读 headers 中的 x-original-uri */}
                  <span className="font-mono text-[11px] text-primary-fixed break-all">
                    {real_uri || String(headers?.["x-original-uri"] ?? "—")}
                  </span>
                </MetaRow>
                <MetaRow label="客户端 IP">
                  <div className="flex items-center gap-1.5">
                    {/* 绿色在线指示点 */}
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed" />
                    <span className="font-mono text-[11px]">{source_ip || "Internal"}</span>
                  </div>
                </MetaRow>
              </div>
            </div>

            {/* HTTP Headers 卡片 */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-surface-container-low/40 border-b border-outline-variant/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    HTTP Headers
                  </span>
                </div>
                {/* Header 数量徽章 */}
                <Badge variant="neutral" className="text-[9px] font-black">
                  {Object.keys(headers ?? {}).length} items
                </Badge>
              </div>
              <div className="divide-y divide-outline-variant/5">
                {Object.keys(headers ?? {}).length === 0 ? (
                  <p className="px-4 py-6 text-[10px] text-on-surface-variant/40 font-medium text-center">
                    暂无 Headers 数据
                  </p>
                ) : (
                  Object.entries(headers ?? {}).map(([key, value]) => (
                    <div key={key} className="px-4 py-2.5 flex items-start gap-3">
                      {/* Header 键名：蓝色 */}
                      <span className="text-[10px] font-bold text-primary-fixed/80 min-w-[100px] shrink-0 truncate">
                        {key}
                      </span>
                      {/* Header 值：灰色，超长截断 */}
                      <span className="text-[10px] text-on-surface-variant/70 break-all line-clamp-2 font-mono">
                        {String(value)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 右侧：Request Body 查看器（对应设计稿右栏 70%） */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
              {/* 卡片头：标题 + 内容类型标记 */}
              <div className="px-6 py-4 border-b border-outline-variant/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded border",
                      METHOD_STYLES[method?.toUpperCase()] ??
                        "bg-surface-container-high text-on-surface-variant border-outline-variant/20",
                    )}
                  >
                    {method}
                  </span>
                  <h3 className="text-sm font-black text-on-surface">Request Body</h3>
                </div>
                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                  application/json
                </span>
              </div>
              {/* Body 内容区 */}
              <BodyViewer body={body} />
            </div>
          </div>
        </div>
      )}

      {/* ── 变体管理 Tab 占位 ─────────────────────── */}
      {activeTab === "variants" && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3 text-on-surface-variant/40">
          <GitBranch className="w-8 h-8 opacity-30" />
          <p className="text-sm font-bold">变体管理功能开发中</p>
        </div>
      )}

      {/* ── 重放历史 Tab 占位 ─────────────────────── */}
      {activeTab === "history" && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3 text-on-surface-variant/40">
          <History className="w-8 h-8 opacity-30" />
          <p className="text-sm font-bold">暂无重放历史记录</p>
        </div>
      )}
    </motion.div>
  )
}

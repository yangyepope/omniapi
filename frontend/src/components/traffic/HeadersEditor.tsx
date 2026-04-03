/**
 * HeadersEditor — HTTP Headers 可编辑 KV 列表
 *
 * [Why]：将 JSON textarea 拆分为逐行 KV 编辑器，降低用户编辑门槛；
 * 同时保留"JSON 模式"切换，方便批量粘贴。
 * 从 new-variant.tsx 提取为独立组件，后续可复用于其他需要编辑 Headers 的场景。
 *
 * Props：
 *   - headers: Record<string, string>  当前 headers 的 key-value 映射
 *   - onChange: (h: Record<string, string>) => void  任意编辑后的回调
 */

import { useState, useCallback } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { KVPair } from "./types"

interface HeadersEditorProps {
  headers: Record<string, string>
  onChange: (h: Record<string, string>) => void
}

export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
  // 将 Record 转为 KV 数组，便于逐行渲染和编辑
  const [pairs, setPairs] = useState<KVPair[]>(() =>
    Object.entries(headers).map(([key, value]) => ({ key, value: String(value) }))
  )
  // 模式切换：kv（逐行）/ json（原始 textarea）
  const [mode, setMode] = useState<"kv" | "json">("kv")
  // json 模式下的原始文本缓存（与 pairs 保持双向同步）
  const [jsonText, setJsonText] = useState(() => JSON.stringify(headers, null, 2))
  // json 文本无法解析时的错误标记
  const [jsonError, setJsonError] = useState(false)

  // 将 KV 数组同步回父组件
  // [Why]：所有写操作统一经过此函数，保证 pairs、jsonText、onChange 三者始终一致
  const syncFromPairs = useCallback(
    (newPairs: KVPair[]) => {
      setPairs(newPairs)
      // 过滤掉 key 为空的行，构建干净的 Record
      const record: Record<string, string> = {}
      for (const { key, value } of newPairs) {
        if (key.trim()) record[key.trim()] = value
      }
      onChange(record)
      // 同步更新 JSON 文本缓存，使切换模式时内容一致
      setJsonText(JSON.stringify(record, null, 2))
    },
    [onChange],
  )

  // 切换到 JSON 模式：将当前 KV 序列化为 JSON 文本
  const switchToJson = () => {
    const record: Record<string, string> = {}
    for (const { key, value } of pairs) {
      if (key.trim()) record[key.trim()] = value
    }
    setJsonText(JSON.stringify(record, null, 2))
    setJsonError(false)
    setMode("json")
  }

  // 切换回 KV 模式：解析当前 JSON 文本，失败则标记错误
  const switchToKv = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const newPairs = Object.entries(parsed).map(([k, v]) => ({
        key: k,
        value: String(v),
      }))
      setPairs(newPairs)
      onChange(parsed)
      setJsonError(false)
      setMode("kv")
    } catch {
      // JSON 格式错误：不切换模式，在按钮上显示错误提示
      setJsonError(true)
    }
  }

  // 更新单行的 key 或 value
  const updatePair = (idx: number, field: "key" | "value", val: string) => {
    const newPairs = pairs.map((p, i) => (i === idx ? { ...p, [field]: val } : p))
    syncFromPairs(newPairs)
  }

  // 删除指定行
  const removePair = (idx: number) => {
    syncFromPairs(pairs.filter((_, i) => i !== idx))
  }

  // 在末尾追加一个空行
  const addPair = () => {
    syncFromPairs([...pairs, { key: "", value: "" }])
  }

  return (
    <div className="space-y-2">
      {/* 标题行：显示条目数量 + 模式切换按钮 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">
          HTTP HEADERS
          <span className="ml-2 text-primary-fixed">{pairs.length} Items</span>
        </span>
        <button
          onClick={mode === "kv" ? switchToJson : switchToKv}
          className={cn(
            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border transition-colors",
            jsonError
              ? "border-red-400 text-red-500"
              : "border-outline-variant/20 text-on-surface-variant/50 hover:border-primary-fixed/40 hover:text-primary-fixed",
          )}
        >
          {mode === "kv" ? "JSON 模式" : jsonError ? "格式错误 ✕" : "KV 模式"}
        </button>
      </div>

      {mode === "kv" ? (
        // ── KV 逐行编辑器 ──────────────────────────────────────────────
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
          <div className="divide-y divide-outline-variant/5">
            {pairs.map((pair, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={idx} className="flex items-center gap-0 group">
                {/* Key 列：蓝色等宽字体，视觉上与 value 区分 */}
                <input
                  value={pair.key}
                  onChange={(e) => updatePair(idx, "key", e.target.value)}
                  placeholder="Header-Key"
                  className="w-[38%] px-4 py-2.5 text-[11px] font-mono text-blue-500 bg-transparent focus:outline-none focus:bg-primary-fixed/5 transition-colors"
                />
                {/* 分隔符 */}
                <span className="text-on-surface-variant/20 text-[11px] shrink-0">:</span>
                {/* Value 列 */}
                <input
                  value={pair.value}
                  onChange={(e) => updatePair(idx, "value", e.target.value)}
                  placeholder="value"
                  className="flex-1 px-3 py-2.5 text-[11px] font-mono text-on-surface-variant bg-transparent focus:outline-none focus:bg-primary-fixed/5 transition-colors"
                />
                {/* 删除按钮：hover 时才显示，减少视觉干扰 */}
                <button
                  onClick={() => removePair(idx)}
                  className="px-3 opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant/30 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          {/* 底部：添加新行按钮 */}
          <button
            onClick={addPair}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold text-on-surface-variant/40 hover:text-primary-fixed hover:bg-primary-fixed/5 transition-colors border-t border-outline-variant/5"
          >
            <Plus className="w-3 h-3" />
            添加 Header
          </button>
        </div>
      ) : (
        // ── JSON 原始编辑器 ─────────────────────────────────────────────
        // [Why]：JSON 模式下用 textarea 展示原始文本，便于批量粘贴或复制整个 headers 对象
        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value)
            setJsonError(false)
            try {
              // 实时解析：成功则立即同步给父组件，失败则等用户主动切换 KV 时再报错
              const parsed = JSON.parse(e.target.value)
              onChange(parsed)
            } catch {
              /* 解析失败时暂不同步，避免频繁触发父组件更新 */
            }
          }}
          rows={8}
          className={cn(
            "w-full px-4 py-3 rounded-2xl bg-[#1a1d23] border text-[11px] font-mono text-[#9cdcfe] focus:outline-none resize-none",
            jsonError
              ? "border-red-500/50"
              : "border-outline-variant/10 focus:border-primary-fixed",
          )}
        />
      )}
    </div>
  )
}

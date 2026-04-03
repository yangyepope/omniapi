/**
 * BodyEditor — Request Body 可编辑代码区
 *
 * 功能：
 *   - 深色背景 textarea 编辑区（蓝色等宽字体，与 VSCode JSON 风格一致）
 *   - 格式化按钮：尝试解析 JSON 并重新序列化，失败则保持原文
 *   - 复制按钮：兼容 HTTP 内网环境（降级 execCommand）
 *   - 全屏弹层：AnimatePresence 动画，点击遮罩或关闭按钮退出
 *
 * [Why]：从 new-variant.tsx 提取为独立组件，行数约 120 行，是一个完整的交互单元。
 * 全屏弹层与内联编辑区共享同一 body 状态，保持数据一致。
 */

import { useState } from "react"
import { Check, Copy, Maximize2, X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { Badge } from "@/components/ui/badge"
import { copyText } from "./copy-utils"

interface BodyEditorProps {
  /** 当前 body 文本内容（父组件控制） */
  body: string
  /** 任意编辑后的回调，返回新的 body 字符串 */
  onChange: (v: string) => void
}

export function BodyEditor({ body, onChange }: BodyEditorProps) {
  // 复制成功状态，用于短暂显示"已复制"反馈
  const [copied, setCopied] = useState(false)
  // 全屏弹层开关
  const [fullscreen, setFullscreen] = useState(false)

  // 尝试格式化为 JSON；若解析失败则保持原文不变
  // [Why]：用户可能粘贴非 JSON 内容，格式化失败时静默忽略比弹错误更友好
  const formatJson = () => {
    try {
      onChange(JSON.stringify(JSON.parse(body), null, 2))
    } catch {
      /* 非 JSON 内容，保持原文 */
    }
  }

  // 复制当前 body 内容（兼容 HTTP 内网）
  const handleCopy = () => {
    if (!body) return
    copyText(body, () => {
      setCopied(true)
      // 1.5 秒后恢复"复制"状态
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <>
      {/* ── 内联编辑区 ─────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
        {/* 工具栏：标签 + 格式化 / 复制 / 全屏操作 */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-container-low/50 border-b border-outline-variant/5">
          <div className="flex items-center gap-2">
            <Badge variant="neutral" className="text-[9px] font-black uppercase">
              JSON
            </Badge>
            <span className="text-[9px] text-on-surface-variant/30 font-mono">REQUEST BODY</span>
          </div>
          <div className="flex items-center gap-3">
            {/* 格式化：只对 JSON 有效，其他格式静默忽略 */}
            <button
              onClick={formatJson}
              className="text-[10px] font-bold text-on-surface-variant/50 hover:text-primary-fixed transition-colors"
            >
              格式化
            </button>
            {/* 复制：成功后短暂显示对勾图标 */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant/50 hover:text-primary-fixed transition-colors"
            >
              {copied ? (
                <Check className="w-3 h-3 text-secondary-fixed" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? "已复制" : "复制"}
            </button>
            {/* 全屏：展开为覆盖全屏的大编辑区 */}
            <button
              onClick={() => setFullscreen(true)}
              className="text-on-surface-variant/50 hover:text-primary-fixed transition-colors"
              title="全屏编辑"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        {/* 编辑区：深色背景，蓝色 JSON 字体，固定 20 行高度 */}
        <textarea
          value={body}
          onChange={(e) => onChange(e.target.value)}
          rows={20}
          placeholder="请求体内容（JSON 或其他格式）"
          className="w-full px-6 py-4 bg-[#1a1d23] text-[12px] font-mono text-[#9cdcfe] leading-relaxed resize-none focus:outline-none"
        />
      </div>

      {/* ── 全屏弹层 ────────────────────────────────────────────────── */}
      {/* [Why]：AnimatePresence 保证退出动画在组件卸载前播放完毕 */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl max-h-[90vh] bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-2xl overflow-hidden flex flex-col"
              // 阻止点击内容区时关闭弹层
              onClick={(e) => e.stopPropagation()}
            >
              {/* 全屏弹层顶栏 */}
              <div className="flex items-center justify-between px-5 py-3 bg-surface-container-low/50 border-b border-outline-variant/5 shrink-0">
                <div className="flex items-center gap-3">
                  <Badge variant="neutral" className="text-[9px] font-black uppercase">
                    JSON
                  </Badge>
                  <span className="text-xs font-bold text-on-surface-variant">Request Body</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant hover:text-primary-fixed transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-secondary-fixed" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copied ? "已复制" : "复制"}
                  </button>
                  <button
                    onClick={() => setFullscreen(false)}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* 全屏可编辑区：flex-1 撑满剩余高度 */}
              <textarea
                value={body}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 p-6 bg-[#1a1d23] text-[13px] font-mono text-[#9cdcfe] leading-relaxed resize-none focus:outline-none"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

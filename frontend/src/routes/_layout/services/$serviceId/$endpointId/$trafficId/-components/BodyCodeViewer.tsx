import { Check, Copy, Maximize2, X } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Badge } from "@/components/ui/badge"

interface BodyCodeViewerProps {
  body: string | null | undefined
  title?: string
  contentType?: string
  maxHeight?: string
}

export function BodyCodeViewer({ 
  body, 
  title = "Request Body", 
  contentType = "application/json",
  maxHeight = "420px" 
}: BodyCodeViewerProps) {
  const [copied, setCopied] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const formatted = (() => {
    if (!body) return null
    try {
      return JSON.stringify(JSON.parse(body), null, 2)
    } catch {
      return body
    }
  })()

  const handleCopy = () => {
    if (!formatted) return
    navigator.clipboard.writeText(formatted).then(() => {
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
      </div>
    )
  }

  return (
    <>
      <div className="relative group/viewer">
        <div className="flex items-center justify-between px-4 py-2 bg-surface-container-low/50 border-b border-outline-variant/5">
          <div className="flex items-center gap-2">
            <Badge variant="neutral" className="text-[9px] font-black uppercase">{contentType.split("/").pop()}</Badge>
            <span className="text-[10px] font-bold text-on-surface-variant/60">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant hover:text-primary-fixed transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-secondary-fixed" /> : <Copy className="w-3 h-3" />}
              {copied ? "已复制" : "复制"}
            </button>
            <button
              onClick={() => setFullscreen(true)}
              className="p-1 rounded-lg text-on-surface-variant hover:text-primary-fixed hover:bg-primary-fixed/5 transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="bg-[#1a1d23] overflow-auto" style={{ maxHeight }}>
          <pre className="p-6 text-[12px] font-mono text-[#9cdcfe] leading-relaxed whitespace-pre">
            {formatted}
          </pre>
        </div>
      </div>

      {/* 全屏弹层 */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl max-h-[90vh] bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-surface-container-low/50 border-b border-outline-variant/5">
                <div className="flex items-center gap-3">
                  <Badge variant="neutral" className="text-[9px] font-black uppercase">{contentType}</Badge>
                  <span className="font-bold text-sm text-on-surface">{title}</span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={handleCopy} className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary-fixed">
                     {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                     {copied ? "COPY SUCCESS" : "COPY CODE"}
                  </button>
                  <button onClick={() => setFullscreen(false)} className="p-2 rounded-xl hover:bg-surface-container-high transition-all">
                    <X className="w-5 h-5 text-on-surface-variant" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-[#1a1d23]">
                <pre className="p-10 text-[13px] font-mono text-[#9cdcfe] leading-relaxed">
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

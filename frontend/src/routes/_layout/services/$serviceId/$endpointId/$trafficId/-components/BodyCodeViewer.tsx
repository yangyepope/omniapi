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
  title = "请求体", 
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
      <div className="relative group/viewer rounded-2xl overflow-hidden border border-outline-variant/5 shadow-inner">
        <div className="flex items-center justify-between px-6 py-2.5 bg-surface-container-low/40 backdrop-blur-md border-b border-outline-variant/10">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-primary-fixed/20 animate-pulse" />
            <Badge variant="neutral" className="text-[10px] font-black uppercase bg-primary-fixed/5 text-primary-fixed/60 border-primary-fixed/10">{contentType.split("/").pop()}</Badge>
            <span className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">{title}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 text-[10px] font-black text-on-surface-variant/40 hover:text-primary-fixed transition-all group/copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-secondary-fixed" /> : <Copy className="w-3.5 h-3.5 group-hover/copy:scale-110 transition-transform" />}
              {copied ? "COPIED" : "COPY"}
            </button>
            <button
              onClick={() => setFullscreen(true)}
              className="p-1.5 rounded-lg text-on-surface-variant/30 hover:text-primary-fixed hover:bg-primary-fixed/5 transition-all"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="bg-[#0b0e14] overflow-auto shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] custom-scrollbar" style={{ maxHeight }}>
          <pre className="p-8 text-[13px] font-mono text-blue-300/90 leading-[1.8] whitespace-pre-wrap break-all">
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

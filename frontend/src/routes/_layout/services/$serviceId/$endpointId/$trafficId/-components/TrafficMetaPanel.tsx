import { useState } from "react"
import { Info, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TrafficMetaPanelProps {
  record: {
    method: string
    real_uri?: string
    original_path?: string
    headers?: Record<string, any> | null
    source_ip?: string | null
    created_at?: string | null
  }
}

const METHOD_STYLES: Record<string, string> = {
  GET:    "bg-blue-50 text-blue-600 border-blue-200",
  POST:   "bg-red-50 text-red-500 border-red-200",
  PUT:    "bg-green-50 text-green-600 border-green-200",
  DELETE: "bg-orange-50 text-orange-600 border-orange-200",
  PATCH:  "bg-purple-50 text-purple-600 border-purple-200",
}

const formatAbsoluteTime = (value?: string | null): string => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-outline-variant/5 last:border-0">
      <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest min-w-[80px] pt-0.5">
        {label}
      </span>
      <div className="flex-1 text-[11px] font-bold text-on-surface leading-tight break-all">
        {children}
      </div>
    </div>
  )
}

export function TrafficMetaPanel({ record }: TrafficMetaPanelProps) {
  const { method, real_uri, original_path, headers, source_ip, created_at } = record
  const [copiedHeaders, setCopiedHeaders] = useState(false)
  const [copiedUri, setCopiedUri] = useState(false)
  const [copiedIp, setCopiedIp] = useState(false)

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-9999px"
      textArea.style.top = "0"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand("copy")
      } catch (err) {
        console.error("Fallback copy failed", err)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleCopyHeaders = () => {
    if (!headers) return
    copyToClipboard(JSON.stringify(headers, null, 2))
    setCopiedHeaders(true)
    setTimeout(() => setCopiedHeaders(false), 2000)
  }

  const handleCopyText = (text: string, setter: (v: boolean) => void) => {
    copyToClipboard(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div className="space-y-6">
      <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant/5 bg-surface-container-low/30 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-primary-fixed" />
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">基本指标 (Metrics)</span>
        </div>
        <div className="p-5 pt-2">
          <MetaRow label="捕获时间">{formatAbsoluteTime(created_at)}</MetaRow>
          <MetaRow label="接口动作">
            <span className={cn(
               "px-2 py-0.5 rounded border font-mono text-[10px] font-black uppercase",
               METHOD_STYLES[method?.toUpperCase()] || "bg-surface-container-high text-on-surface-variant border-outline-variant/20"
            )}>
              {method}
            </span>
          </MetaRow>
          <MetaRow label="原始路径">
            <div className="flex items-center gap-2 group/uri cursor-pointer" onClick={() => (original_path || real_uri) && handleCopyText(original_path || real_uri || "", setCopiedUri)}>
              <span className="text-primary-fixed font-mono">{original_path || real_uri || "—"}</span>
              {(original_path || real_uri) && (
                <div className="bg-surface-container-high/50 p-1 rounded-md opacity-0 group-hover/uri:opacity-100 transition-all">
                  {copiedUri ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-2.5 h-2.5 text-on-surface-variant/40" />}
                </div>
              )}
            </div>
          </MetaRow>
          <MetaRow label="来源地址">
            <div className="flex items-center gap-2 group/ip cursor-pointer" onClick={() => source_ip && handleCopyText(source_ip, setCopiedIp)}>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed/60" />
                <span className="font-mono text-on-surface-variant/80">{source_ip || "Internal Ingress"}</span>
              </div>
              {source_ip && (
                <div className="bg-surface-container-high/50 p-1 rounded-md opacity-0 group-hover/ip:opacity-100 transition-all">
                  {copiedIp ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-2.5 h-2.5 text-on-surface-variant/40" />}
                </div>
              )}
            </div>
          </MetaRow>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant/5 bg-surface-container-low/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">HTTP Headers</span>
             <button 
                onClick={handleCopyHeaders}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container-high/50 hover:bg-primary-fixed/10 text-on-surface-variant/60 hover:text-primary-fixed transition-all group"
             >
                {copiedHeaders ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 group-hover:scale-110" />}
                <span className="text-[9px] font-black uppercase tracking-tighter">{copiedHeaders ? "Copied" : "Copy JSON"}</span>
             </button>
          </div>
          <Badge variant="neutral" className="text-[9px] font-black">
            {Object.keys(headers || {}).filter(k => k.toLowerCase() !== "x-original-uri").length} KEYS
          </Badge>
        </div>
        <div className="divide-y divide-outline-variant/5">
          {Object.entries(headers || {}).filter(([k]) => k.toLowerCase() !== "x-original-uri").length === 0 ? (
             <div className="p-8 text-center text-[10px] text-on-surface-variant/30 font-bold italic">No headers captured</div>
          ) : (
            Object.entries(headers || {}).filter(([k]) => k.toLowerCase() !== "x-original-uri").map(([k, v]) => (
              <div key={k} className="px-5 py-3 flex items-start gap-4 hover:bg-surface-container-low/20 transition-colors">
                <span className="text-[10px] font-bold text-primary-fixed/80 w-28 shrink-0 truncate">{k}</span>
                <span className="text-[10px] text-on-surface-variant/70 font-mono break-all">{String(v)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

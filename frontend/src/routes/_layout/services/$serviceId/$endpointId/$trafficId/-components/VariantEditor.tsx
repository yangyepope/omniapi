import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { GitBranch, Save, Sparkles, Plus, X, Copy, Maximize2, Check } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { OpenAPI } from "@/client/core/OpenAPI"
import { request as __request } from "@/client/core/request"
import { cn } from "@/lib/utils"

interface VariantEditorProps {
  trafficId: string
  initialData: {
    method: string
    url: string
    headers: Record<string, any>
    body: string
  }
  onSuccess?: () => void
}

export function VariantEditor({ trafficId, initialData, onSuccess }: VariantEditorProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(`变体 - ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`)
  const [method, setMethod] = useState(initialData.method)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [bodyCopied, setBodyCopied] = useState(false)
  const [headersCopied, setHeadersCopied] = useState(false)
  
  const [kvHeaders, setKvHeaders] = useState(() => {
    try {
      return Object.entries(initialData.headers || {}).map(([k, v]) => ({
        id: `h-${Math.random().toString(36).substr(2, 9)}`,
        key: k,
        value: String(v)
      }))
    } catch (e) {
      return []
    }
  })
  
  const [body, setBody] = useState(initialData.body || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addHeader = () => {
    setKvHeaders(prev => [...prev, { id: `h-${Math.random().toString(36).substr(2, 9)}`, key: "", value: "" }])
  }

  const removeHeader = (id: string) => {
    setKvHeaders(prev => prev.filter(h => h.id !== id))
  }

  const updateHeader = (id: string, field: "key" | "value", value: string) => {
    setKvHeaders(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h))
  }

  const beautifyJson = () => {
    try {
      if (body) setBody(JSON.stringify(JSON.parse(body), null, 2))
    } catch (e) {
      alert("Body JSON 格式有误，无法美化")
    }
  }

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

  const handleCopyBody = () => {
    copyToClipboard(body)
    setBodyCopied(true)
    setTimeout(() => setBodyCopied(false), 2000)
  }

  const handleCopyHeaders = () => {
    const obj = kvHeaders.reduce((acc, h) => {
      if (h.key.trim()) acc[h.key.trim()] = h.value
      return acc
    }, {} as Record<string, any>)
    copyToClipboard(JSON.stringify(obj, null, 2))
    setHeadersCopied(true)
    setTimeout(() => setHeadersCopied(false), 2000)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const parsedHeaders = kvHeaders.reduce((acc, h) => {
        if (h.key.trim()) acc[h.key.trim()] = h.value
        return acc
      }, {} as Record<string, any>)
      
      const payload = {
        root_flow_id: trafficId,
        name,
        method,
        url: initialData.url,
        headers: parsedHeaders,
        body_str: body,
      }

      await __request(OpenAPI, {
        method: "POST",
        url: "/api/v1/variants/",
        body: payload,
      })
      
      queryClient.invalidateQueries({ queryKey: ["variants", trafficId] })
      onSuccess?.()
    } catch (e: any) {
      // 物理透传：提取后端 Pydantic 详细报错
      const detail = e.body?.detail
      let errorMsg = "保存变体失败"
      
      if (Array.isArray(detail)) {
        errorMsg += "\n细节: " + detail.map((d: any) => d.msg).join(", ")
      } else if (typeof detail === "string") {
        errorMsg += "\n细节: " + detail
      } else {
        errorMsg += "\n请检查网络连接或 JSON 格式是否正确。"
      }
      
      alert(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12 space-y-6">
        <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-10 space-y-8">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary-fixed/10 text-primary-fixed">
                <GitBranch className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-on-surface">构造测试变体</h3>
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-0.5">Payload Constructor & Replay Editor</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                 onClick={beautifyJson}
                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high transition-all text-xs font-black uppercase tracking-tight"
              >
                 <Sparkles className="w-3.5 h-3.5" /> 格式化请求体
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest ml-1">变体标识名称 (Name)</label>
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="例如: SQLi 注入测试"
                    className="w-full h-12 px-5 rounded-2xl bg-surface-container-low border border-outline-variant/10 focus:border-primary-fixed/50 outline-none font-bold text-sm transition-all" 
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest ml-1">执行方法 (Action)</label>
                  <div className="flex items-center bg-surface-container-low rounded-2xl p-1 border border-outline-variant/10 h-12">
                     {["GET", "POST", "PUT", "DELETE", "PATCH"].map(m => (
                        <button 
                          key={m} 
                          onClick={() => setMethod(m)}
                          className={cn(
                            "flex-1 h-full rounded-xl text-[10px] font-black transition-all",
                            method === m ? "bg-surface-container-lowest text-primary-fixed shadow-sm" : "text-on-surface-variant/40 hover:text-on-surface-variant"
                          )}
                        >{m}</button>
                     ))}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
               {/* 📂 HTTP HEADERS EDITABLE LIST - 平铺但限制最大高度以防撑爆页面 */}
               <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest flex items-center gap-2">
                       请求头 (HTTP HEADERS)
                       <span className="px-1.5 py-0.5 rounded-md bg-surface-container-high text-[9px] text-primary-fixed font-black">{kvHeaders.length} KEYS</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={handleCopyHeaders}
                        className="text-[10px] font-black uppercase text-on-surface-variant/40 hover:text-primary-fixed flex items-center gap-1 transition-colors"
                      >
                        {headersCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {headersCopied ? "JSON COPIED" : "COPY AS JSON"}
                      </button>
                      <button 
                        onClick={addHeader}
                        className="text-[10px] font-black uppercase text-primary-fixed hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> ADD KEY
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col rounded-3xl bg-surface-container-low/30 border border-outline-variant/10 overflow-hidden divide-y divide-outline-variant/5">
                     <div className="bg-surface-container-high/50 h-10 flex items-center px-6 border-b border-outline-variant/10">
                        <span className="w-1/3 text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest">Header Name</span>
                        <span className="flex-1 text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest ml-4">Value</span>
                     </div>
                     
                     <div className="p-2 space-y-1">
                        <AnimatePresence initial={false}>
                          {kvHeaders.map((h) => (
                             <motion.div 
                               key={h.id}
                               initial={{ opacity: 0, height: 0 }}
                               animate={{ opacity: 1, height: "auto" }}
                               exit={{ opacity: 0, height: 0 }}
                               className="group flex items-center gap-2 px-4 py-2 hover:bg-surface-container-low transition-colors rounded-xl"
                             >
                                <input 
                                  value={h.key}
                                  onChange={e => updateHeader(h.id, "key", e.target.value)}
                                  placeholder="Key"
                                  className="w-1/3 bg-transparent border-none text-blue-600 font-black text-xs placeholder:text-blue-600/20 outline-none"
                                />
                                <div className="w-[1px] h-4 bg-outline-variant/10 shrink-0 mx-2" />
                                <input 
                                  value={h.value}
                                  onChange={e => updateHeader(h.id, "value", e.target.value)}
                                  placeholder="Value"
                                  className="flex-1 bg-transparent border-none text-on-surface-variant font-bold text-xs placeholder:text-on-surface-variant/20 outline-none"
                                />
                                <button 
                                  onClick={() => removeHeader(h.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-on-surface-variant/30 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                   <X className="w-3.5 h-3.5" />
                                </button>
                             </motion.div>
                          ))}
                        </AnimatePresence>
                     </div>
                  </div>
               </div>

               {/* 📝 REQUEST BODY */}
               <div className="space-y-3 flex flex-col self-stretch">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest flex items-center justify-between">
                       请求体 (Request Body)
                    </label>
                    <div className="flex items-center gap-4">
                       <button 
                        onClick={handleCopyBody}
                        className="text-[10px] font-black uppercase text-on-surface-variant/40 hover:text-primary-fixed flex items-center gap-1 transition-colors"
                       >
                         {bodyCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                         {bodyCopied ? "COPIED" : "COPY"}
                       </button>
                       <button 
                        onClick={() => setIsFullScreen(true)}
                        className="text-[10px] font-black uppercase text-on-surface-variant/40 hover:text-primary-fixed flex items-center gap-1 transition-colors"
                       >
                         <Maximize2 className="w-3 h-3" /> FULLSCREEN
                       </button>
                    </div>
                  </div>
                  <textarea 
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder='{ "payload": "..." }'
                    className="w-full h-[400px] p-6 rounded-[2rem] bg-[#1a1d23] text-orange-200 font-mono text-[11px] leading-relaxed border border-white/5 focus:border-orange-500/50 outline-none transition-all resize-none shadow-inner"
                  />
               </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-outline-variant/5">
             <button 
               disabled={isSubmitting}
               onClick={handleSubmit}
               className="flex items-center gap-3 px-10 py-4 rounded-[1.5rem] bg-primary-fixed text-on-primary font-black shadow-2xl shadow-primary-fixed/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
             >
                <Save className="w-5 h-5" />
                {isSubmitting ? "正在持久化..." : "保存并收录到变体库"}
             </button>
          </div>
        </div>
      </div>

      {/* 📺 FULLSCREEN MODAL EDITOR - 比例压缩，防止溢出 */}
      <AnimatePresence>
        {isFullScreen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 lg:p-20 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-6xl h-full bg-surface-container-lowest rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/10"
            >
               <div className="flex items-center justify-between px-10 py-6 border-b border-outline-variant/10">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500">
                      <Maximize2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black">沉浸式编辑 Payload</h4>
                      <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Advanced JSON Payload Editor</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsFullScreen(false)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-container-high hover:bg-surface-container-highest transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="flex-1 p-8 bg-[#0d0f12]">
                 <textarea 
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="w-full h-full p-8 rounded-[2rem] bg-[#1a1d23] text-orange-200 font-mono text-sm leading-relaxed border border-white/5 outline-none shadow-2xl resize-none focus:border-orange-500/30 transition-all font-bold"
                    placeholder='{ "payload": "..." }'
                 />
               </div>

               <div className="px-10 py-6 bg-surface-container-low flex justify-end gap-4 border-t border-outline-variant/10">
                  <button 
                    onClick={handleCopyBody}
                    className="px-8 py-3 rounded-2xl bg-surface-container-high font-black flex items-center gap-2 hover:bg-surface-container-highest transition-all text-xs"
                  >
                    {bodyCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {bodyCopied ? "已复制到剪贴板" : "复制全文数据"}
                  </button>
                  <button 
                    onClick={() => setIsFullScreen(false)}
                    className="px-10 py-3 rounded-2xl bg-primary-fixed text-on-primary font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
                  >
                    保存编辑并返回
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

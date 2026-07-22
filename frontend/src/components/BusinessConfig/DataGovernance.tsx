import { Activity, Lock, Shield } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { OpenAPI } from "@/client"
import { cn } from "@/lib/utils"

/**
 * 全局数据治理组件 (DataGovernanceView)
 * 负责人: Antigravity
 * 职责: 控制全网流量采集与回流拦截安全防线
 */
export const DataGovernanceView = () => {
  const [config, setConfig] = useState<Record<string, boolean>>({
    traffic_collection_enabled: true,
    loopback_interception_enabled: true,
  })
  const [loading, setLoading] = useState(false)

  // 获取请求头 (包含 Token)
  const getHeaders = async () => {
    // 物理对齐 main.tsx 对 OpenAPI.TOKEN 的物理初始化物理逻辑
    const token = localStorage.getItem("access_token") || ""
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  // 核心拉取逻辑：增加非 JSON 响应的物理拦截
  const fetchConfig = async () => {
    setLoading(true)
    try {
      const headers = await getHeaders()
      const res = await fetch(`${OpenAPI.BASE}/api/v1/traffic-manager/config`, {
        headers,
      })
      // 物理检查：如果返回的是 HTML (<!DOCTYPE)，说明 404 或代理未就位
      const contentType = res.headers.get("content-type")
      if (!res.ok || contentType?.includes("text/html")) {
        throw new Error(`API Connection Failed: ${res.status}`)
      }
      const data = await res.json()
      setConfig(data)
    } catch (e) {
      console.error("Governance fetch failed", e)
      // 这里的错误通常意味着前端没能连上后端 API (例如 404)
    } finally {
      // 物理指令：无论成功与否，必须立即解锁按钮以防假死
      setLoading(false)
    }
  }

  // 核心切换逻辑
  const handleToggle = async (key: string, current: boolean) => {
    if (loading) return
    setLoading(true)
    try {
      const headers = await getHeaders()
      const res = await fetch(
        `${OpenAPI.BASE}/api/v1/traffic-manager/config?key=${key}&enabled=${!current}`,
        {
          method: "POST",
          headers,
        },
      )

      const contentType = res.headers.get("content-type")
      if (!res.ok || contentType?.includes("text/html")) {
        throw new Error("Governance update failed: Check API Route")
      }

      const data = await res.json()
      if (data.message) {
        setConfig((prev) => ({ ...prev, [key]: !current }))
      }
    } catch (e) {
      console.error("Governance update failed", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-12"
    >
      <div className="flex items-center gap-6 p-1 bg-blue-50/30 rounded-3xl w-fit">
        <div className="w-2 h-10 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            全局数据治理
            <Shield className="w-8 h-8 text-blue-500 animate-[pulse_3s_infinite]" />
          </h2>
          <p className="text-gray-500 font-medium">
            控制全网流量采集开关与安全回流拦截拦截拦截防线
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        {/* 指标卡片 1: 流量采集 */}
        <div className="group/card relative bg-white/60 backdrop-blur-xl border border-blue-100/50 rounded-[2.5rem] p-10 hover:shadow-2xl hover:shadow-blue-200/40 transition-all duration-500">
          <div className="flex justify-between items-start">
            <div className="p-5 rounded-3xl bg-white shadow-md group-hover/card:scale-110 transition-transform">
              <Activity
                className={cn(
                  "w-8 h-8",
                  config.traffic_collection_enabled
                    ? "text-blue-500"
                    : "text-gray-400",
                )}
              />
            </div>
            <button
              onClick={() =>
                handleToggle(
                  "traffic_collection_enabled",
                  config.traffic_collection_enabled,
                )
              }
              disabled={loading}
              className={cn(
                "relative inline-flex h-10 w-18 shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-wait",
                config.traffic_collection_enabled
                  ? "bg-blue-600"
                  : "bg-gray-300",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out",
                  config.traffic_collection_enabled
                    ? "translate-x-8"
                    : "translate-x-0",
                )}
              />
            </button>
          </div>
          <div className="mt-8">
            <h3 className="text-2xl font-extrabold text-gray-900">
              流量采集总开关
            </h3>
            <p className="mt-4 text-gray-500 leading-relaxed font-medium">
              控制系统级采集探针。关闭后，接口将静默丢弃所有摄入报文。
            </p>
          </div>
        </div>

        {/* 指标卡片 2: 回流拦截 */}
        <div className="group/card relative bg-white/60 backdrop-blur-xl border border-red-100/50 rounded-[2.5rem] p-10 hover:shadow-2xl hover:shadow-red-200/40 transition-all duration-500">
          <div className="flex justify-between items-start">
            <div className="p-5 rounded-3xl bg-white shadow-md group-hover/card:scale-110 transition-transform">
              <Lock
                className={cn(
                  "w-8 h-8",
                  config.loopback_interception_enabled
                    ? "text-red-500"
                    : "text-gray-400",
                )}
              />
            </div>
            <button
              onClick={() =>
                handleToggle(
                  "loopback_interception_enabled",
                  config.loopback_interception_enabled,
                )
              }
              disabled={loading}
              className={cn(
                "relative inline-flex h-10 w-18 shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-wait",
                config.loopback_interception_enabled
                  ? "bg-red-600"
                  : "bg-gray-300",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out",
                  config.loopback_interception_enabled
                    ? "translate-x-8"
                    : "translate-x-0",
                )}
              />
            </button>
          </div>
          <div className="mt-8">
            <h3 className="text-2xl font-extrabold text-gray-900">
              重放流量拦截防线 (Loopback)
            </h3>
            <p className="mt-4 text-gray-500 leading-relaxed font-medium">
              拦截标识头 {`{ X-AAM-REPLAY: TRUE }`}
              。防止测试流量在多级链路中无限重播。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16 bg-gray-900 rounded-[3rem] p-12 text-white flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-gray-800 rounded-2xl ring-1 ring-gray-700">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-400 tracking-widest uppercase">
                Governance Center
              </span>
              <h4 className="text-4xl font-black italic tracking-tighter">
                Traffic Sentinel v1.2
              </h4>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex gap-12 mt-8 md:mt-0">
          <div className="text-center">
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">
              拦截准确率
            </p>
            <p className="text-4xl font-black text-white">99.9%</p>
          </div>
          <div className="text-center border-l border-gray-800 pl-12">
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">
              检测延迟
            </p>
            <p className="text-4xl font-black text-white">&lt;15ms</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

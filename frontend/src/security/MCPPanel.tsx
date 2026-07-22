// MCP 集成面板 — 亮色。展示 MCP 服务状态、已注册工具、Claude Desktop 配置片段。
// 渲染在大屏底部。bearer token 不从 API 取(仅运维可见),用户自行粘贴。
import { Bot, Check, Copy, ExternalLink, RefreshCw } from "lucide-react"
import { useState } from "react"
import { SectionCard } from "@/components/security/ui"
import { useMcpStatus } from "@/security/hooks"

const SNIPPET_BASE_TEMPLATE = (baseUrl: string) =>
  `{
  "mcpServers": {
    "security-platform": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${baseUrl}/mcp/sse",
        "--header",
        "Authorization: Bearer <SECURITY_PLATFORM_MCP_TOKEN>"
      ]
    }
  }
}`

export function MCPPanel() {
  const { data, isLoading, refetch, isFetching } = useMcpStatus()
  const [copied, setCopied] = useState(false)

  const baseUrl =
    typeof window === "undefined"
      ? "http://localhost:5173"
      : `${window.location.protocol}//${window.location.host}`
  const snippet = SNIPPET_BASE_TEMPLATE(baseUrl)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard 被禁用 — 静默降级
    }
  }

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-600" />
          MCP 集成
          {isLoading ? (
            <span className="text-xs text-gray-500 font-normal">检测中…</span>
          ) : data?.mounted ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-normal">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              在线 · {data.tool_count} 工具
            </span>
          ) : (
            <span className="text-xs text-amber-600 font-normal">未配置</span>
          )}
        </span>
      }
      action={
        <button
          type="button"
          onClick={() => refetch()}
          className="p-1 text-gray-500 hover:text-blue-600"
          title="重新检测"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
        </button>
      }
    >
      {!data?.mounted && !isLoading && (
        <div className="text-xs text-gray-500 bg-amber-50 border border-gray-200 border-amber-200 rounded-lg p-3 space-y-1">
          <div className="text-amber-700 font-semibold">MCP 通道未就绪</div>
          {data && !data.has_token && (
            <div>
              ✗ 后端缺少{" "}
              <code className="text-amber-700 font-mono">
                SECURITY_PLATFORM_MCP_TOKEN
              </code>{" "}
              环境变量(在 .env 添加后重启 backend)
            </div>
          )}
          {data?.has_token && !data.mcp_package_installed && (
            <div>
              ✗ Python <code className="text-amber-700 font-mono">mcp</code>{" "}
              包未安装(给 backend 添加依赖后重新 build 镜像)
            </div>
          )}
          {data?.error && (
            <div className="text-red-600">✗ 启动错误:{data.error}</div>
          )}
        </div>
      )}

      {data?.mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 工具列表 */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
              注册的工具 ({data.tool_count})
            </div>
            <div className="max-h-[160px] overflow-auto space-y-1">
              {data.tools.map((t) => (
                <div
                  key={t.name}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 border border-gray-200"
                >
                  <div className="font-mono text-blue-600 font-semibold">
                    {t.name}
                  </div>
                  {t.description && (
                    <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                      {t.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Claude Desktop 配置片段 */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center justify-between">
              <span>Claude Desktop 配置</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-900 normal-case"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" /> 已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> 复制
                  </>
                )}
              </button>
            </div>
            <pre className="text-[10px] text-gray-900 bg-gray-100 border border-gray-200 rounded-lg p-2.5 max-h-[160px] overflow-auto font-mono leading-relaxed">
              {snippet}
            </pre>
            <a
              href="https://github.com/geelen/mcp-remote"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-gray-500 hover:text-blue-600 mt-1.5 flex items-center gap-1"
            >
              mcp-remote 文档 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

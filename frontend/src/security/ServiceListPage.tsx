// 服务清单页(IA 区 3 顶层)。列出当前项目下所有服务:开放/关闭问题数、语言/框架、
// 最近扫描时间与状态,点击进服务详情(扫描历史/接口/知识/画像/源码缓存)。
// 数据源 GET /security/services(经 useServiceList,已按当前项目隔离)。
import { Link } from "@tanstack/react-router"
import { Network } from "lucide-react"
import { useMemo } from "react"
import { ScanStatusBadge } from "@/components/security/badges"
import {
  EmptyBlock,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from "@/components/security/ui"
import { fmtRelative } from "@/lib/format"
import { useServiceList } from "@/security/hooks"

export function ServiceListPage() {
  const services = useServiceList()
  // 按开放问题数降序:问题多的服务排前面,便于优先处置
  const list = useMemo(
    () =>
      [...(services.data ?? [])].sort(
        (a, b) => b.open_findings - a.open_findings,
      ),
    [services.data],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Network}
        title="服务"
        subtitle="当前项目下的服务清单 · 点击进入查看扫描历史、接口、业务知识、AI 画像与源码缓存"
      />
      <SectionCard title={`服务 (${list.length})`} bodyClassName="p-0">
        {services.isLoading ? (
          <LoadingBlock />
        ) : list.length === 0 ? (
          <EmptyBlock text="当前项目下暂无服务 — 去「项目管理」为项目添加服务" />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-xs uppercase border-b border-gray-100">
                <tr>
                  <th className="text-left py-2.5 px-3 font-semibold">服务</th>
                  <th className="text-left py-2.5 px-2 font-semibold">
                    语言 / 框架
                  </th>
                  <th className="text-right py-2.5 px-2 font-semibold">开放</th>
                  <th className="text-right py-2.5 px-2 font-semibold">已关</th>
                  <th className="text-left py-2.5 px-2 font-semibold">
                    最近扫描
                  </th>
                  <th className="text-left py-2.5 px-2 font-semibold">状态</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr
                    key={s.name}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2.5 px-3">
                      <Link
                        to="/security/services/$name"
                        params={{ name: s.name }}
                        className="text-gray-900 font-medium hover:text-blue-600 hover:underline underline-offset-2"
                      >
                        {s.name}
                      </Link>
                      <div className="text-[10px] text-gray-400 truncate max-w-xs">
                        {s.repo_url}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 text-xs">
                      {s.language ?? "—"}
                      {s.framework ? ` · ${s.framework}` : ""}
                    </td>
                    <td className="py-2.5 px-2 text-right text-blue-600 font-bold tabular-nums">
                      {s.open_findings}
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-500 tabular-nums">
                      {s.closed_findings}
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 text-xs">
                      {s.last_scan_at ? fmtRelative(s.last_scan_at) : "—"}
                    </td>
                    <td className="py-2.5 px-2">
                      {s.last_scan_status ? (
                        <ScanStatusBadge status={s.last_scan_status} />
                      ) : (
                        <span className="text-gray-500 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

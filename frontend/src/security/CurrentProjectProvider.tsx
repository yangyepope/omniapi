// 「当前项目」全局状态(scanner 多项目/多租户 FEAT-024/025)。
//
// 为什么用 Context + localStorage 而非路由 search params:
//   当前项目是跨多条安全路由(大屏/扫描管理/项目管理/成本…)共享、且需在会话间
//   记住的“租户选择”,语义更接近 theme/locale 这类全局偏好,而非某页私有的筛选参数。
//   因此持久化到 localStorage,由本 Provider 统一提供,各页 useQuery 把 project 进
//   queryKey 即随切换自动重取。逐页私有的 severity/status 等仍走各自的 URL 状态。
import { useQuery } from "@tanstack/react-query"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { SecurityApi } from "@/security/api"

// 存量数据不保证存在名为 "default" 的项目——不同部署的种子项目 key 可能不同
// (如本环境唯一项目是 aigs-middleground)。故不硬编码 "default",而是:
//   初始读 localStorage;项目列表回来后,若当前值不在列表里 → 回落到列表首个
//   真实项目。这样无论种子项目叫什么、default 是否存在,都不会卡在幽灵项目上。
const STORAGE_KEY = "security.current_project"

type CurrentProjectCtx = {
  project: string // 当前选中项目 key(""=尚未解析出可用项目)
  setProject: (key: string) => void
}

const Ctx = createContext<CurrentProjectCtx | null>(null)

export function CurrentProjectProvider({ children }: { children: ReactNode }) {
  // 初始值:localStorage 读回;读不到先留空,等项目列表回来再落到首个项目
  const [project, setProjectState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || ""
    } catch {
      return ""
    }
  })

  // setter:同时写回 localStorage(切换后刷新/重开仍记得)
  const setProject = useCallback((key: string) => {
    setProjectState(key)
    try {
      localStorage.setItem(STORAGE_KEY, key)
    } catch {
      // 隐私模式等写不了 localStorage 时忽略,内存态仍生效
    }
  }, [])

  // 校验/初始化:项目列表加载后,若当前 key 为空或已不在列表(被删/换了种子)
  // → 回落到列表首个真实项目,避免选中幽灵项目导致所有视图空数据。
  const { data } = useQuery({
    queryKey: ["security", "projects"],
    queryFn: SecurityApi.projects,
    staleTime: 30_000,
  })
  useEffect(() => {
    if (!data || data.items.length === 0) return
    const exists = data.items.some((p) => p.key === project)
    if (!exists) setProject(data.items[0].key)
  }, [data, project, setProject])

  const value = useMemo(() => ({ project, setProject }), [project, setProject])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// 读取当前项目。必须在 CurrentProjectProvider 内使用。
export function useCurrentProject(): CurrentProjectCtx {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("useCurrentProject 必须在 CurrentProjectProvider 内使用")
  }
  return ctx
}

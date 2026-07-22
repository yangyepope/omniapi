import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { ApiError, OpenAPI } from "./client"
import { ThemeProvider } from "./components/providers/theme-provider"
import { Toaster } from "./components/ui/sonner"
import { CurrentProjectProvider } from "./security/CurrentProjectProvider"
import "./index.css"
import "./i18n"
import { routeTree } from "./routeTree.gen"

// API 基地址:VITE_API_URL 未设置时必须兜底为空串(相对路径),
// 由 Vite dev proxy / frontend nginx 反代 /api → backend;
// 直接赋 undefined 会被拼成 "/undefined/api/v1/..." 导致全部请求 404
OpenAPI.BASE = import.meta.env.VITE_API_URL || ""
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || ""
}

const handleApiError = (error: Error) => {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    localStorage.removeItem("access_token")
    window.location.href = "/login"
  }
}
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        {/* 当前项目 Provider 在 Query 内(便于用 useQuery 校验项目列表)、
            包住 Router(全路由与 Header 均可读当前项目) */}
        <CurrentProjectProvider>
          <RouterProvider router={router} />
        </CurrentProjectProvider>
        <Toaster closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)

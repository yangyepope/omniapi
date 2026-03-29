import { Link as RouterLink, useRouterState } from "@tanstack/react-router"
import { useSidebar } from "@/components/ui/sidebar"

export type Item = {
  icon: string
  title: string
  path: string
}

interface MainProps {
  items: Item[]
}

export function Main({ items }: MainProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouterState()
  const currentPath = router.location.pathname

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <nav className="flex-1 px-3 space-y-2">
      {items.map((item) => {
        const isActive = item.path === "/" ? currentPath === "/" : currentPath.startsWith(item.path)

        return (
          <RouterLink
            key={item.title}
            to={item.path}
            onClick={handleMenuClick}
            className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
              isActive
                ? "text-secondary border-l-4 border-secondary bg-surface-variant rounded-r-lg"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-lg"
            }`}
          >
            <span 
              className="material-symbols-outlined text-xl" 
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              data-icon={item.icon}
            >
              {item.icon}
            </span>
            <span className="font-['Space_Grotesk'] text-sm tracking-tight">
              {item.title}
            </span>
          </RouterLink>
        )
      })}
    </nav>
  )
}

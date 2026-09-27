import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { MobileDrawer } from './MobileDrawer'
import { primaryNav, secondaryNav } from './navItems'
import { Sidebar } from './Sidebar'
import { StatusBanners } from './StatusBanners'

const SIDEBAR_KEY = 'sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

function useTitle(pathname: string): string {
  const item = [...primaryNav, ...secondaryNav].find((i) =>
    i.to === '/' ? pathname === '/' : pathname.startsWith(i.to),
  )
  return item?.label ?? 'Study Planner'
}

/**
 * Esqueleto de la app:
 * - Móvil (< md): cabecera con hamburguesa + barra de navegación inferior.
 * - Tablet (md): barra lateral estrecha de iconos.
 * - Escritorio (lg+): barra lateral completa, plegable.
 */
export function AppLayout() {
  const { pathname } = useLocation()
  const title = useTitle(pathname)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, prev ? '0' : '1')
      } catch {
        // Sin almacenamiento (modo privado): la preferencia no se recuerda.
      }
      return !prev
    })
  }

  useEffect(() => {
    document.title = title === 'Study Planner' ? title : `${title} · Study Planner`
    window.scrollTo(0, 0)
  }, [title])

  return (
    <div className="flex min-h-dvh">
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} onOpenMenu={() => setDrawerOpen(true)} />
        <StatusBanners />

        {/* pb-24 deja hueco para la barra inferior del móvil. */}
        <main className="flex-1 px-4 pt-4 pb-24 pr-safe md:px-6 md:pt-6 md:pb-8 xl:px-8 2xl:px-12">
          <div className="mx-auto w-full max-w-7xl 2xl:max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

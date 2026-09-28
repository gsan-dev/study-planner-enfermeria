import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { NotificacionesProvider } from '../notificaciones/NotificacionesProvider'
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
    <NotificacionesProvider>
      {/* Teclado: primer elemento al pulsar Tab, salta el menú y va al contenido. */}
      <a
        href="#contenido"
        className="sr-only rounded-xl bg-superficie px-4 py-3 font-semibold text-slate-900 shadow-lg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Saltar al contenido
      </a>
      <div className="flex min-h-dvh">
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        <MobileDrawer open={drawerOpen} onClose={closeDrawer} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header title={title} onOpenMenu={() => setDrawerOpen(true)} />
          <StatusBanners />

          {/* pb-24 deja hueco para la barra inferior del móvil. */}
          <main id="contenido" tabIndex={-1} className="flex-1 outline-none pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-24 pl-[max(1rem,env(safe-area-inset-left))] md:px-6 md:pt-6 md:pb-8 xl:px-8 2xl:px-12">
            {/* key: cada página entra con una animación suave */}
            <div key={pathname} className="animate-entrada mx-auto w-full max-w-7xl 2xl:max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>

        <BottomNav />
      </div>
    </NotificacionesProvider>
  )
}

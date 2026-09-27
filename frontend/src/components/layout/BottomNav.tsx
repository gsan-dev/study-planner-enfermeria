import { NavLink } from 'react-router'
import { primaryNav } from './navItems'

/** Barra de navegación inferior, solo en móvil (< 768px). */
export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {primaryNav.filter((item) => !item.hideInBottomNav).map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    // min-h-14 → zona táctil holgada (> 44px recomendados por Apple).
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                    isActive ? 'text-brand-700' : 'text-slate-500 active:text-slate-900',
                  ].join(' ')
                }
              >
                <Icon className="size-6" />
                <span>{item.shortLabel ?? item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

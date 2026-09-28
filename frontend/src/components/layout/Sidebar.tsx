import { NavLink } from 'react-router'
import { ChevronsLeftIcon, LogoMark } from '../icons'
import { primaryNav, secondaryNav, type NavItem } from './navItems'

interface SidebarProps {
  /** Solo iconos (en tablet siempre; en escritorio si el usuario la pliega). */
  collapsed: boolean
  onToggleCollapsed: () => void
}

// En tablet (md) siempre se ve plegada; desde lg manda la preferencia del usuario.
const itemLayout = (collapsed: boolean) => (collapsed ? 'justify-center' : 'justify-center lg:justify-start')
const labelVisibility = (collapsed: boolean) => (collapsed ? 'sr-only' : 'sr-only lg:not-sr-only lg:truncate')

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={item.label}
      className={({ isActive }) =>
        [
          'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
          itemLayout(collapsed),
          isActive
            ? 'bg-brand-50 text-brand-800'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        ].join(' ')
      }
    >
      <Icon className="size-5 shrink-0" />
      <span className={labelVisibility(collapsed)}>{item.label}</span>
    </NavLink>
  )
}

/**
 * Barra lateral para tablet y escritorio (oculta en móvil, donde se usa
 * la barra inferior). En tablet (md) va siempre plegada; desde lg se puede
 * plegar/desplegar.
 */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  return (
    <aside
      className={[
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-slate-200 bg-superficie pl-safe transition-[width] duration-200 md:flex',
        collapsed ? 'w-20' : 'w-20 lg:w-64',
      ].join(' ')}
    >
      <div className={['flex h-16 items-center gap-3 px-5', itemLayout(collapsed)].join(' ')}>
        <LogoMark className="size-9 shrink-0" />
        <span
          className={[
            'text-base font-semibold tracking-tight text-slate-900',
            collapsed ? 'hidden' : 'hidden lg:inline',
          ].join(' ')}
        >
          Study Planner
        </span>
      </div>

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3 py-4">
        {primaryNav.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-slate-200 px-3 py-4">
        {secondaryNav.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} />
        ))}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expandir menú lateral' : 'Plegar menú lateral'}
          className={[
            'hidden min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:flex',
            itemLayout(collapsed),
          ].join(' ')}
        >
          <ChevronsLeftIcon className={['size-5 shrink-0 transition-transform', collapsed ? 'rotate-180' : ''].join(' ')} />
          <span className={labelVisibility(collapsed)}>Plegar menú</span>
        </button>
      </div>
    </aside>
  )
}

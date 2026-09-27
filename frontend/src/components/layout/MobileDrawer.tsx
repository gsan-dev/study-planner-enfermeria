import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router'
import { CloseIcon, LogoMark } from '../icons'
import { primaryNav, secondaryNav } from './navItems'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

/** Menú lateral deslizante para móvil (abre desde el botón hamburguesa). */
export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <div className={['fixed inset-0 z-50 md:hidden', open ? '' : 'pointer-events-none'].join(' ')} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={[
          'absolute inset-0 bg-slate-900/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        inert={!open}
        className={[
          'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white pt-safe pb-safe pl-safe shadow-xl transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <LogoMark className="size-9" />
            <span className="font-semibold text-slate-900">Study Planner</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <CloseIcon className="size-6" />
          </button>
        </div>

        <nav aria-label="Menú" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          {[...primaryNav, ...secondaryNav].map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    'flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium',
                    isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700 active:bg-slate-100',
                  ].join(' ')
                }
              >
                <Icon className="size-5" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}

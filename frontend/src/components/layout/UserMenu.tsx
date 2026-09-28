import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth, useCurrentUser } from '../../auth/authContext'
import { LogoutIcon, SettingsIcon } from '../icons'
import { Avatar } from '../ui/Avatar'

/** Avatar (foto o inicial) y menú desplegable (ajustes y cerrar sesión). */
export function UserMenu() {
  const user = useCurrentUser()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de usuario"
        className="grid size-11 cursor-pointer place-items-center rounded-full"
      >
        <Avatar user={user} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate font-semibold text-slate-900">{user.nombre}</p>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
          </div>
          <Link
            to="/ajustes"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-3 px-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            <SettingsIcon className="size-5 text-slate-400" />
            Ajustes
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            <LogoutIcon className="size-5 text-slate-400" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

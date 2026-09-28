import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useNotificaciones } from '../../hooks/notificacionesContext'
import { haceTiempo } from '../../lib/tiempo'
import { BellIcon } from '../icons'
import { IconoTipo } from './IconoTipo'

/** Campana de la cabecera con el número de avisos sin leer y un desplegable con los recientes. */
export function Campana() {
  const { recientes, noLeidas, marcarTodas, abrir } = useNotificaciones()
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

  const etiqueta = noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={etiqueta}
        className="relative grid size-11 cursor-pointer place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
      >
        <BellIcon className="size-6" />
        {noLeidas > 0 && (
          <span
            className="absolute top-1.5 right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-peligro px-1 text-[11px] leading-none font-bold text-white ring-2 ring-superficie"
            aria-hidden="true"
          >
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones recientes"
          className="animate-menu fixed inset-x-2 top-[calc(3.75rem+env(safe-area-inset-top))] z-40 overflow-hidden rounded-2xl border border-slate-200 bg-superficie shadow-xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-1 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 pr-2 pl-4">
            <p className="font-semibold text-slate-900">Notificaciones</p>
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={() => marcarTodas()}
                className="min-h-11 cursor-pointer rounded-lg px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {recientes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No tienes notificaciones.</p>
          ) : (
            <ul className="max-h-[60dvh] overflow-y-auto">
              {recientes.map((n) => (
                <li key={n._id} className="border-b border-slate-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      abrir(n)
                    }}
                    className={`flex w-full cursor-pointer gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.leida ? '' : 'bg-brand-50/50'}`}
                  >
                    <IconoTipo tipo={n.tipo} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.leida ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{n.titulo}</span>
                      <span className="line-clamp-2 block text-sm text-slate-600">{n.mensaje}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{haceTiempo(n.createdAt)}</span>
                    </span>
                    {!n.leida && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Sin leer" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/notificaciones"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-slate-50"
          >
            Ver todas y ajustes
          </Link>
        </div>
      )}
    </div>
  )
}

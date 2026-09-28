import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'
import { BellIcon, TrashIcon } from '../components/icons'
import { DispositivoPush } from '../components/notificaciones/DispositivoPush'
import { IconoTipo } from '../components/notificaciones/IconoTipo'
import { PreferenciasForm } from '../components/notificaciones/PreferenciasForm'
import { Button, IconButton } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useCarga } from '../hooks/useCarga'
import { useNotificaciones } from '../hooks/notificacionesContext'
import { haceTiempo } from '../lib/tiempo'
import { getErrorMessage } from '../services/api'
import { borrarNotificacion, listNotificaciones, marcarLeida } from '../services/notificacionesService'

export function NotificacionesPage() {
  const { recargar: recargarCampana, marcarTodas, abrir, noLeidas } = useNotificaciones()
  const [soloNoLeidas, setSoloNoLeidas] = useState(false)
  const [version, setVersion] = useState(0)
  // Se recarga también cuando cambia el contador de la campana (llegó una nueva, se leyó…).
  const { data, cargando } = useCarga(`${soloNoLeidas}:${version}:${noLeidas}`, (s) =>
    listNotificaciones({ limite: 100, soloNoLeidas }, s),
  )

  const actualizar = () => {
    setVersion((v) => v + 1)
    recargarCampana()
  }

  const alternarLeida = async (id: string, leida: boolean) => {
    try {
      await marcarLeida(id, leida)
      actualizar()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const borrar = async (id: string) => {
    try {
      await borrarNotificacion(id)
      actualizar()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="historial" className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="Filtrar notificaciones" className="inline-flex rounded-xl bg-slate-200/70 p-1">
            {[
              { valor: false, label: 'Todas' },
              { valor: true, label: `Sin leer${noLeidas ? ` (${noLeidas})` : ''}` },
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={soloNoLeidas === t.valor}
                onClick={() => setSoloNoLeidas(t.valor)}
                className={[
                  'min-h-9 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors',
                  soloNoLeidas === t.valor ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
          {noLeidas > 0 && (
            <Button variant="ghost" onClick={() => marcarTodas().then(actualizar)}>
              Marcar todas como leídas
            </Button>
          )}
        </div>
        <h3 id="historial" className="sr-only">
          Historial de notificaciones
        </h3>

        {!data ? (
          <div className="grid h-40 place-items-center text-slate-400">
            <Spinner />
          </div>
        ) : data.notificaciones.length === 0 ? (
          <div className="grid min-h-60 place-items-center rounded-2xl border border-dashed border-slate-300 p-6 text-center">
            <div>
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <BellIcon className="size-6" />
              </div>
              <p className="mt-3 font-semibold text-slate-900">{soloNoLeidas ? 'Todo leído' : 'Aún no hay notificaciones'}</p>
              <p className="mt-1 text-sm text-slate-600">Aquí verás los avisos de exámenes, del plan y tus logros.</p>
            </div>
          </div>
        ) : (
          <ul className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white ${cargando ? 'opacity-60' : ''}`}>
            {data.notificaciones.map((n) => (
              <li key={n._id} className={`flex gap-3 border-b border-slate-100 p-3 last:border-b-0 md:p-4 ${n.leida ? '' : 'bg-brand-50/40'}`}>
                <IconoTipo tipo={n.tipo} />
                <button type="button" onClick={() => abrir(n)} className="min-w-0 flex-1 cursor-pointer text-left">
                  <span className={`block ${n.leida ? 'text-slate-800' : 'font-semibold text-slate-900'}`}>{n.titulo}</span>
                  <span className="block text-sm text-slate-600">{n.mensaje}</span>
                  <span className="mt-0.5 block text-xs text-slate-400" title={format(new Date(n.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}>
                    {haceTiempo(n.createdAt)}
                  </span>
                </button>
                <div className="flex shrink-0 flex-col items-center sm:flex-row">
                  <button
                    type="button"
                    onClick={() => alternarLeida(n._id, !n.leida)}
                    aria-label={n.leida ? `Marcar «${n.titulo}» como no leída` : `Marcar «${n.titulo}» como leída`}
                    title={n.leida ? 'Marcar como no leída' : 'Marcar como leída'}
                    className="grid size-11 cursor-pointer place-items-center rounded-xl hover:bg-slate-100"
                  >
                    <span className={`size-3 rounded-full ${n.leida ? 'border-2 border-slate-300' : 'bg-brand-600'}`} />
                  </button>
                  <IconButton label={`Borrar «${n.titulo}»`} tone="danger" onClick={() => borrar(n._id)}>
                    <TrashIcon className="size-4.5" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">Las notificaciones se borran solas a los 90 días.</p>
      </section>

      <div className="flex flex-col gap-5 lg:sticky lg:top-4">
        <DispositivoPush />
        <PreferenciasForm />
      </div>
    </div>
  )
}

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { diaLocal, hoyKey } from '../../lib/fechas'
import { agruparPorDia, sumaHoras, TIPO_SESION } from '../../lib/plan'
import type { SesionPreview } from '../../types/api'
import type { Tema } from '../../types/models'
import { formatHoras } from '../asignaturas/constants'
import { CheckIcon } from '../icons'

interface PlanAgendaProps {
  sesiones: SesionPreview[]
  temas: Map<string, Tema>
  color: string
  /** Si viene, cada sesión tiene casilla para completarla. */
  onToggle?: (sesion: SesionPreview) => void
  /** Sesiones guardándose (se desactivan). */
  pendientes?: Set<string>
}

function etiquetaDia(dia: string, hoy: string): string {
  const fecha = format(diaLocal(dia), "EEEE d 'de' MMMM", { locale: es })
  return dia === hoy ? `Hoy · ${fecha}` : fecha
}

/** Plan día a día. Los días anteriores a hoy se pueden plegar. */
export function PlanAgenda({ sesiones, temas, color, onToggle, pendientes }: PlanAgendaProps) {
  const hoy = hoyKey()
  const grupos = agruparPorDia(sesiones)
  const pasados = grupos.filter((g) => g.dia < hoy)
  const [verPasados, setVerPasados] = useState(false)
  const visibles = verPasados ? grupos : grupos.filter((g) => g.dia >= hoy)
  const atrasadas = pasados.flatMap((g) => g.sesiones).filter((s) => !s.completado).length

  return (
    <div className="flex flex-col gap-3">
      {pasados.length > 0 && (
        <button
          type="button"
          onClick={() => setVerPasados((v) => !v)}
          aria-expanded={verPasados}
          className="min-h-11 cursor-pointer self-start rounded-xl px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          {verPasados ? 'Ocultar días anteriores' : `Ver días anteriores (${pasados.length})`}
          {atrasadas > 0 && !verPasados && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{atrasadas} sin hacer</span>
          )}
        </button>
      )}

      {visibles.length === 0 && <p className="text-sm text-slate-500">No quedan sesiones pendientes en el plan.</p>}

      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibles.map(({ dia, sesiones: delDia }) => {
          const esHoy = dia === hoy
          const hecho = delDia.every((s) => s.completado)
          return (
            <li
              key={dia}
              className={[
                'rounded-2xl border bg-superficie p-3 md:p-4',
                esHoy ? 'border-brand-600 ring-1 ring-brand-600' : 'border-slate-200',
                dia < hoy && hecho ? 'opacity-70' : '',
              ].join(' ')}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <h4 className={`font-semibold first-letter:uppercase ${esHoy ? 'text-brand-800' : 'text-slate-900'}`}>
                  {etiquetaDia(dia, hoy)}
                </h4>
                <span className="shrink-0 text-sm text-slate-500">{formatHoras(sumaHoras(delDia))}</span>
              </div>
              <ul className="-mx-1 flex flex-col">
                {delDia.map((sesion, i) => {
                  const tema = temas.get(sesion.temaId)
                  const nombre = tema?.nombre ?? 'Tema eliminado'
                  const id = sesion._id ?? `${dia}-${i}`
                  const contenido = (
                    <>
                      {onToggle && (
                        <span
                          className={[
                            'grid size-6 shrink-0 place-items-center rounded-lg border-2 text-white transition-colors',
                            sesion.completado ? 'border-transparent' : 'border-slate-300 bg-superficie',
                          ].join(' ')}
                          style={sesion.completado ? { backgroundColor: color } : undefined}
                        >
                          {sesion.completado && <CheckIcon className="size-4" strokeWidth={3} />}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={`block ${sesion.completado ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {nombre}
                        </span>
                        {sesion.notas && <span className="block text-xs text-slate-500">{sesion.notas}</span>}
                      </span>
                      {sesion.tipo === 'repaso' && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          {TIPO_SESION.repaso}
                        </span>
                      )}
                      <span className="w-12 shrink-0 text-right text-sm text-slate-600 tabular-nums">{formatHoras(sesion.horas)}</span>
                    </>
                  )
                  return (
                    <li key={id}>
                      {onToggle && sesion._id ? (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={sesion.completado}
                          aria-label={`${nombre}, ${TIPO_SESION[sesion.tipo].toLowerCase()}, ${formatHoras(sesion.horas)}`}
                          disabled={pendientes?.has(sesion._id)}
                          onClick={() => onToggle(sesion)}
                          className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-1 text-left hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                        >
                          {contenido}
                        </button>
                      ) : (
                        <div className="flex min-h-10 items-center gap-3 px-1">{contenido}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

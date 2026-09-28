import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { sumaHoras, TIPO_SESION } from '../../lib/plan'
import { actualizarTarea } from '../../services/agendaService'
import { getErrorMessage } from '../../services/api'
import { actualizarSesion } from '../../services/planService'
import type { DashboardResponse } from '../../types/api'
import { formatHoras } from '../asignaturas/constants'
import { CheckIcon, ChecklistIcon, ClockIcon } from '../icons'

type Hoy = DashboardResponse['hoy']

interface HoyWidgetProps {
  hoy: Hoy
  /** Cambio local inmediato (optimista). */
  onLocalChange: (hoy: Hoy) => void
  /** Algo se ha guardado: volver a pedir el resumen (cumplimiento, semana…). */
  onSaved: () => void
}

function Casilla({ hecho, color }: { hecho: boolean; color: string }) {
  return (
    <span
      className={[
        'grid size-6 shrink-0 place-items-center rounded-lg border-2 text-white transition-colors',
        hecho ? 'border-transparent' : 'border-slate-300 bg-superficie',
      ].join(' ')}
      style={hecho ? { backgroundColor: color } : undefined}
    >
      {hecho && <CheckIcon className="size-4" strokeWidth={3} />}
    </span>
  )
}

/** "¿Qué estudiar hoy?": sesiones del plan de hoy y tareas de la agenda, marcables desde aquí. */
export function HoyWidget({ hoy, onLocalChange, onSaved }: HoyWidgetProps) {
  const [ocupados, setOcupados] = useState<Set<string>>(new Set())
  const total = sumaHoras(hoy.sesiones)
  const hechas = sumaHoras(hoy.sesiones.filter((s) => s.completado))

  const conOcupado = async (id: string, accion: () => Promise<void>) => {
    setOcupados((o) => new Set(o).add(id))
    try {
      await accion()
    } finally {
      setOcupados((o) => {
        const next = new Set(o)
        next.delete(id)
        return next
      })
    }
  }

  const toggleSesion = (id: string) => {
    const sesion = hoy.sesiones.find((s) => s._id === id)
    if (!sesion) return
    const completado = !sesion.completado
    onLocalChange({ ...hoy, sesiones: hoy.sesiones.map((s) => (s._id === id ? { ...s, completado } : s)) })
    conOcupado(id, async () => {
      try {
        const { temaEstudiado } = await actualizarSesion(sesion.planId, id, { completado })
        if (temaEstudiado) toast.success(`¡«${sesion.tema}» estudiado!`)
        onSaved()
      } catch (err) {
        onLocalChange(hoy)
        toast.error(getErrorMessage(err))
      }
    })
  }

  const toggleTarea = (id: string) => {
    const tarea = hoy.tareas.find((t) => t._id === id)
    if (!tarea) return
    onLocalChange({ ...hoy, tareas: hoy.tareas.map((t) => (t._id === id ? { ...t, hecho: !t.hecho } : t)) })
    conOcupado(id, async () => {
      try {
        await actualizarTarea(id, { hecho: !tarea.hecho })
      } catch (err) {
        onLocalChange(hoy)
        toast.error(getErrorMessage(err))
      }
    })
  }

  const nada = hoy.sesiones.length === 0 && hoy.tareas.length === 0

  return (
    <section aria-labelledby="que-estudiar" className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="que-estudiar" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          ¿Qué estudiar hoy?
        </h3>
        <Link to="/agenda" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:underline">
          Agenda
        </Link>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-superficie p-4">
        {hoy.sesiones.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-slate-900">Tu plan para hoy</p>
              <p className="text-sm text-slate-600 tabular-nums">
                {formatHoras(hechas)} de {formatHoras(total)}
              </p>
            </div>
            <ul className="-mx-2 mt-1 flex flex-col">
              {hoy.sesiones.map((s) => {
                const color = s.asignatura?.color ?? '#475569'
                return (
                  <li key={s._id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={s.completado}
                      aria-label={`Estudiar ${s.tema}, ${formatHoras(s.horas)}`}
                      disabled={ocupados.has(s._id)}
                      onClick={() => toggleSesion(s._id)}
                      className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left hover:bg-slate-50 disabled:cursor-wait"
                    >
                      <Casilla hecho={s.completado} color={color} />
                      <span className="min-w-0 flex-1">
                        <span className={`block ${s.completado ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{s.tema}</span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                          {s.asignatura?.nombre}
                          {s.tipo === 'repaso' && <span className="font-semibold text-amber-700">· {TIPO_SESION.repaso}</span>}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm text-slate-600 tabular-nums">{formatHoras(s.horas)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {hoy.tareas.length > 0 && (
          <div>
            <p className="font-semibold text-slate-900">Tareas</p>
            <ul className="-mx-2 mt-1 flex flex-col">
              {hoy.tareas.map((t) => (
                <li key={t._id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={t.hecho}
                    aria-label={`${t.texto}: ${t.hecho ? 'hecha' : 'pendiente'}`}
                    disabled={ocupados.has(t._id)}
                    onClick={() => toggleTarea(t._id)}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left hover:bg-slate-50 disabled:cursor-wait"
                  >
                    <Casilla hecho={t.hecho} color="#0f766e" />
                    <span className={`min-w-0 flex-1 ${t.hecho ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{t.texto}</span>
                    {t.hora && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm text-slate-500 tabular-nums">
                        <ClockIcon className="size-4" />
                        {t.hora}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hoy.tareasAtrasadas > 0 && (
          <Link to="/agenda" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100">
            Tienes {hoy.tareasAtrasadas === 1 ? '1 tarea pendiente' : `${hoy.tareasAtrasadas} tareas pendientes`} de otros días →
          </Link>
        )}

        {nada && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <ChecklistIcon className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Nada planificado para hoy</p>
              <p className="mt-1 text-sm text-slate-600">
                Crea un plan de estudio para tus exámenes y aquí verás qué toca cada día.
              </p>
            </div>
            <Link
              to="/plan"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primario px-4 text-sm font-semibold text-white hover:bg-primario-hover"
            >
              Ir al plan de estudio
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

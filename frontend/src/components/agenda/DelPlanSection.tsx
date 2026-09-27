import { Link } from 'react-router'
import { toast } from 'sonner'
import { TIPO_SESION } from '../../lib/plan'
import { getErrorMessage } from '../../services/api'
import { actualizarSesion } from '../../services/planService'
import type { ExamenConResumen, SesionAgenda } from '../../types/api'
import { formatHoras } from '../asignaturas/constants'
import { nombreExamen } from '../examenes/constants'
import { CalendarIcon, CheckIcon } from '../icons'

interface DelPlanSectionProps {
  examenes: ExamenConResumen[]
  sesiones: SesionAgenda[]
  onSesion: (id: string, completado: boolean) => void
}

/** Exámenes del día y sesiones del plan de estudio (se pueden completar desde aquí). */
export function DelPlanSection({ examenes, sesiones, onSesion }: DelPlanSectionProps) {
  if (examenes.length === 0 && sesiones.length === 0) return null

  const toggle = async (sesion: SesionAgenda) => {
    const completado = !sesion.completado
    onSesion(sesion._id, completado)
    try {
      const { temaEstudiado } = await actualizarSesion(sesion.planId, sesion._id, { completado })
      if (temaEstudiado) toast.success(`¡«${sesion.tema}» estudiado!`)
    } catch (err) {
      onSesion(sesion._id, !completado)
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <section aria-labelledby="del-plan" className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 id="del-plan" className="font-semibold text-slate-900">
        Exámenes y estudio
      </h3>

      {examenes.map((examen) => (
        <Link
          key={examen._id}
          to={`/plan/${examen._id}`}
          className="flex items-center gap-3 rounded-xl p-3 text-white"
          style={{ backgroundColor: examen.asignatura?.color ?? '#475569' }}
        >
          <CalendarIcon className="size-6 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase opacity-90">Examen{examen.hora && ` · ${examen.hora}`}</span>
            <span className="block font-semibold">{nombreExamen(examen, examen.asignatura?.nombre)}</span>
          </span>
        </Link>
      ))}

      {sesiones.length > 0 && (
        <ul className="-mx-2 flex flex-col">
          {sesiones.map((s) => {
            const color = s.asignatura?.color ?? '#475569'
            return (
              <li key={s._id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={s.completado}
                  aria-label={`Estudiar ${s.tema}, ${formatHoras(s.horas)}`}
                  onClick={() => toggle(s)}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left hover:bg-slate-50"
                >
                  <span
                    className={[
                      'grid size-6 shrink-0 place-items-center rounded-lg border-2 text-white transition-colors',
                      s.completado ? 'border-transparent' : 'border-slate-300 bg-white',
                    ].join(' ')}
                    style={s.completado ? { backgroundColor: color } : undefined}
                  >
                    {s.completado && <CheckIcon className="size-4" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block ${s.completado ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{s.tema}</span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                      {s.asignatura?.nombre}
                    </span>
                  </span>
                  {s.tipo === 'repaso' && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {TIPO_SESION.repaso}
                    </span>
                  )}
                  <span className="shrink-0 text-sm text-slate-600 tabular-nums">{formatHoras(s.horas)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

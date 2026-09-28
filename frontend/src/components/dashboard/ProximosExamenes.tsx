import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'react-router'
import { cuentaAtras, diaLocal, diasHasta } from '../../lib/fechas'
import type { DashboardResponse } from '../../types/api'
import { formatHoras } from '../asignaturas/constants'
import { nombreExamen, urgencia } from '../examenes/constants'
import { CalendarIcon } from '../icons'

export type ExamenConPlan = DashboardResponse['proximosExamenes'][number]

/** Tarjeta grande de examen: fecha, cuenta atrás, temas y progreso del plan. */
export function ExamenGrande({ examen }: { examen: ExamenConPlan }) {
  const color = examen.asignatura?.color ?? '#475569'
  const dias = diasHasta(examen.fecha)
  const fecha = diaLocal(examen.fecha)
  const { plan } = examen

  return (
    <Link
      to={`/plan/${examen._id}`}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow md:p-5"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex w-14 shrink-0 flex-col items-center rounded-xl py-2 text-center"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <span className="text-xs font-semibold uppercase">{format(fecha, 'EEE', { locale: es })}</span>
          <span className="text-2xl leading-none font-bold">{format(fecha, 'd')}</span>
          <span className="text-xs font-semibold uppercase">{format(fecha, 'MMM', { locale: es })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            <span className="truncate">{examen.asignatura?.nombre}</span>
          </p>
          <p className="mt-0.5 leading-snug font-semibold text-slate-900">{nombreExamen(examen, examen.asignatura?.nombre)}</p>
          {examen.hora && <p className="text-sm text-slate-600">{examen.hora}</p>}
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${urgencia(dias)}`}>{cuentaAtras(dias)}</span>
        <span className="text-right text-xs text-slate-500">
          {examen.resumenTemas.estudiados}/{examen.resumenTemas.total} temas estudiados
        </span>
      </div>

      {plan ? (
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-600">Plan: {formatHoras(plan.horasCompletadas)} de {formatHoras(plan.horasTotales)}</span>
            <span className="font-semibold text-slate-900">{plan.porcentaje}%</span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={plan.porcentaje}
            aria-label="Plan de estudio completado"
          >
            <div className="h-full rounded-full" style={{ width: `${plan.porcentaje}%`, backgroundColor: color }} />
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Sin plan de estudio · <span className="font-semibold text-brand-700">Crear plan →</span>
        </p>
      )}
    </Link>
  )
}

/** Los 3 próximos exámenes, en tarjetas grandes. */
export function ProximosExamenes({ examenes, total }: { examenes: ExamenConPlan[]; total: number }) {
  return (
    <section aria-labelledby="proximos-examenes" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="proximos-examenes" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Próximos exámenes
        </h3>
        {total > 0 && (
          <Link to="/examenes" className="text-sm font-semibold text-brand-700 hover:underline">
            {total > examenes.length ? `Ver los ${total}` : 'Ver todos'}
          </Link>
        )}
      </div>
      {examenes.length === 0 ? (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <CalendarIcon className="size-6" />
          </div>
          <p className="text-sm text-slate-600">
            No tienes exámenes próximos.{' '}
            <Link to="/examenes" className="font-semibold text-brand-700 hover:underline">
              Apunta uno
            </Link>{' '}
            para planificar el estudio.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {examenes.map((examen) => (
            <ExamenGrande key={examen._id} examen={examen} />
          ))}
        </div>
      )}
    </section>
  )
}

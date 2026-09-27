import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatHoras } from '../components/asignaturas/constants'
import { nombreExamen, urgencia } from '../components/examenes/constants'
import { CalendarIcon, ChecklistIcon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useExamenes } from '../hooks/useExamenes'
import { cuentaAtras, diaKey, diaLocal, diasHasta, hoyKey } from '../lib/fechas'
import { getErrorMessage } from '../services/api'
import { listPlanes } from '../services/planService'
import type { ExamenConResumen, PlanResumenLista } from '../types/api'

function proximaTexto(fecha: string): string {
  const dias = diasHasta(fecha)
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  return format(diaLocal(fecha), "EEEE d 'de' MMMM", { locale: es })
}

function ExamenPlanCard({ examen, plan }: { examen: ExamenConResumen; plan?: PlanResumenLista }) {
  const color = examen.asignatura?.color ?? '#475569'
  const dias = diasHasta(examen.fecha)
  return (
    <Link
      to={`/plan/${examen._id}`}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
      style={{ borderTopColor: color, borderTopWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-600">{examen.asignatura?.nombre}</p>
          <p className="font-semibold text-slate-900">{nombreExamen(examen, examen.asignatura?.nombre)}</p>
          <p className="text-sm text-slate-600 first-letter:uppercase">
            {format(diaLocal(examen.fecha), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${urgencia(dias)}`}>{cuentaAtras(dias)}</span>
      </div>

      {plan ? (
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-600">
              {formatHoras(plan.horasCompletadas)} de {formatHoras(plan.horasTotales)}
            </span>
            <span className="font-semibold text-slate-900">{plan.porcentajeCompletado}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${plan.porcentajeCompletado}%`, backgroundColor: color }} />
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            {plan.proximaSesion ? <span>Próxima sesión: {proximaTexto(plan.proximaSesion)}</span> : <span>Sin sesiones pendientes</span>}
            {plan.sesionesAtrasadas > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {plan.sesionesAtrasadas} atrasadas
              </span>
            )}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-600">
            {examen.temas.length === 0 ? 'Sin temas asignados' : 'Aún sin plan'}
          </span>
          <span className="text-sm font-semibold text-brand-700">Crear plan →</span>
        </div>
      )}
    </Link>
  )
}

export function PlanPage() {
  const { examenes, status, error, reload } = useExamenes()
  const [planes, setPlanes] = useState<PlanResumenLista[] | null>(null)
  const [planesError, setPlanesError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listPlanes(controller.signal)
      .then(setPlanes)
      .catch((err) => {
        if (!controller.signal.aborted) setPlanesError(getErrorMessage(err))
      })
    return () => controller.abort()
  }, [])

  if (status === 'error' || planesError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
        <p className="text-rose-700">{error || planesError}</p>
        <Button variant="secondary" onClick={reload} className="mt-3">
          Reintentar
        </Button>
      </div>
    )
  }
  if (status === 'loading' || !planes) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-400">
        <Spinner />
      </div>
    )
  }

  const hoy = hoyKey()
  const planPorExamen = new Map(planes.map((p) => [p.examenId, p]))
  const proximos = examenes.filter((e) => diaKey(e.fecha) >= hoy)
  const sinPlan = proximos.filter((e) => !planPorExamen.has(e._id)).length

  if (proximos.length === 0) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-slate-300 p-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <ChecklistIcon className="size-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No tienes exámenes próximos</h2>
          <p className="mt-1.5 text-slate-600">Apunta tus exámenes y los temas que entran; después podrás crear un plan para cada uno.</p>
          <Link
            to="/examenes"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <CalendarIcon className="size-5" />
            Ir a Exámenes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-600">
        Elige un examen para ver su plan o crearlo.
        {sinPlan > 0 && (
          <>
            {' '}
            <strong className="text-slate-900">
              {sinPlan === 1 ? '1 examen no tiene plan' : `${sinPlan} exámenes no tienen plan`}
            </strong>{' '}
            todavía.
          </>
        )}
      </p>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {proximos.map((examen) => (
          <ExamenPlanCard key={examen._id} examen={examen} plan={planPorExamen.get(examen._id)} />
        ))}
      </div>
    </div>
  )
}

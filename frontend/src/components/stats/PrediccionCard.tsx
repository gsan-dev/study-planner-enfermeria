import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'react-router'
import { cuentaAtras, diaLocal, diasHasta } from '../../lib/fechas'
import type { PrediccionExamen } from '../../types/api'
import { formatHoras } from '../asignaturas/constants'
import { nombreExamen } from '../examenes/constants'

/** Estado según la preparación: color de estado siempre con texto. */
function nivel(nota: number) {
  if (nota >= 7) return { texto: 'Bien encaminada', barra: 'bg-emerald-600', etiqueta: 'bg-emerald-50 text-emerald-800' }
  if (nota >= 5) return { texto: 'Justa', barra: 'bg-amber-500', etiqueta: 'bg-amber-50 text-amber-900' }
  return { texto: 'En riesgo', barra: 'bg-rose-600', etiqueta: 'bg-rose-50 text-rose-800' }
}

const nota = (n: number) => String(n).replace('.', ',')

/** Preparación estimada para un examen, ahora y si se cumple el plan. */
export function PrediccionCard({ prediccion }: { prediccion: PrediccionExamen }) {
  const { examen, notaActual, notaConPlan } = prediccion
  const color = examen.asignatura?.color ?? '#475569'
  const dias = diasHasta(examen.fecha)

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-superficie p-4" style={{ borderTopColor: color, borderTopWidth: 4 }}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-600">{examen.asignatura?.nombre}</p>
        <p className="font-semibold text-slate-900">{nombreExamen(examen, examen.asignatura?.nombre)}</p>
        <p className="text-sm text-slate-500 first-letter:uppercase">
          {format(diaLocal(examen.fecha), "EEEE d 'de' MMMM", { locale: es })} · {cuentaAtras(dias).toLowerCase()}
        </p>
      </div>

      {notaActual === null ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Este examen no tiene temas: indica cuáles entran para poder estimar la preparación.
        </p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <p>
              <span className="text-4xl font-semibold text-slate-900 tabular-nums">{nota(notaActual)}</span>
              <span className="text-slate-500"> / 10</span>
            </p>
            <span className={`mb-1 rounded-full px-2 py-0.5 text-xs font-semibold ${nivel(notaActual).etiqueta}`}>
              {nivel(notaActual).texto}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={notaActual}
            aria-label="Preparación estimada"
          >
            <div className={`h-full rounded-full ${nivel(notaActual).barra}`} style={{ width: `${notaActual * 10}%` }} />
          </div>
          <p className="text-sm text-slate-600">
            {formatHoras(prediccion.horasEstudiadas)} de {formatHoras(prediccion.horasRecomendadas)} recomendadas ·{' '}
            {prediccion.temas.estudiados} de {prediccion.temas.total} temas estudiados
          </p>
          {prediccion.tienePlan && notaConPlan !== null && prediccion.horasPlanPendientes > 0 ? (
            <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
              Si cumples tu plan ({formatHoras(prediccion.horasPlanPendientes)} más): <strong>{nota(notaConPlan)} / 10</strong>
            </p>
          ) : (
            !prediccion.tienePlan && (
              <Link to={`/plan/${examen._id}`} className="flex min-h-11 flex-wrap items-center gap-x-1 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Sin plan de estudio · <span className="font-semibold text-brand-700">Crear plan →</span>
              </Link>
            )
          )}
        </>
      )}
    </article>
  )
}

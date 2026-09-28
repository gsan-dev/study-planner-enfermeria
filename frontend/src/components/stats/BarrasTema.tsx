import type { EstadisticasTema } from '../../types/api'
import { formatHoras } from '../asignaturas/constants'
import { CheckIcon } from '../icons'
import { COLOR_FUERTE, COLOR_SUAVE } from './colores'

/**
 * Por tema, horas invertidas (barra oscura) frente a las recomendadas (pista
 * clara), con una marca en las planificadas. Todos en la misma escala.
 */
export function BarrasTema({ temas, horasSinTema }: { temas: EstadisticasTema[]; horasSinTema: number }) {
  if (temas.length === 0) {
    return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Esta asignatura no tiene temas.</p>
  }
  const escala = Math.max(0.5, ...temas.flatMap((t) => [t.horasInvertidas, t.horasPlanificadas, t.horasRecomendadas]))
  const pct = (h: number) => `${Math.min(100, (h / escala) * 100)}%`

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: COLOR_FUERTE }} aria-hidden="true" />
          Estudiado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: COLOR_SUAVE }} aria-hidden="true" />
          Recomendado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-slate-900" aria-hidden="true" />
          En el plan
        </span>
      </figcaption>

      <ul className="flex flex-col gap-3">
        {temas.map((t) => (
          <li key={t.tema._id}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-1.5 text-slate-800">
                {t.tema.estudiado && <CheckIcon className="size-4 shrink-0 text-emerald-700" strokeWidth={3} aria-label="Estudiado" />}
                <span className="truncate">{t.tema.nombre}</span>
              </span>
              <span className="shrink-0 text-slate-600 tabular-nums">
                <span className="font-semibold text-slate-900">{formatHoras(t.horasInvertidas)}</span> de{' '}
                {formatHoras(t.horasRecomendadas)}
                {t.horasPlanificadas > 0 && <span className="text-slate-500"> · plan {formatHoras(t.horasPlanificadas)}</span>}
              </span>
            </div>
            <div className="relative mt-1 h-2.5" aria-hidden="true">
              <div className="absolute inset-y-0 left-0 rounded-r-[4px]" style={{ width: pct(t.horasRecomendadas), backgroundColor: COLOR_SUAVE }} />
              {t.horasInvertidas > 0 && (
                <div
                  className="absolute inset-y-0 left-0 rounded-r-[4px]"
                  style={{ width: pct(t.horasInvertidas), backgroundColor: COLOR_FUERTE }}
                />
              )}
              {t.horasPlanificadas > 0 && (
                <div className="absolute -inset-y-1 w-0.5 bg-slate-900" style={{ left: `calc(${pct(t.horasPlanificadas)} - 1px)` }} />
              )}
            </div>
          </li>
        ))}
      </ul>

      {horasSinTema > 0 && (
        <p className="text-sm text-slate-500">
          Además, {formatHoras(horasSinTema)} registradas en la asignatura sin indicar tema.
        </p>
      )}
    </figure>
  )
}

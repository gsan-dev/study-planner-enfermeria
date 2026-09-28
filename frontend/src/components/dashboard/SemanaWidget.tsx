import type { DashboardResponse } from '../../types/api'
import { formatHoras } from '../asignaturas/constants'
import { GraficoHorasDia } from '../stats/GraficoHorasDia'

interface SemanaWidgetProps {
  semana: DashboardResponse['semana']
  cumplimiento: DashboardResponse['cumplimiento']
}

/** Estado del cumplimiento: color de estado + texto (nunca solo color). */
function estadoCumplimiento(porcentaje: number) {
  if (porcentaje >= 80) return { texto: 'Vas al día', barra: 'bg-emerald-600', etiqueta: 'text-emerald-800 bg-emerald-50' }
  if (porcentaje >= 50) return { texto: 'Algo atrasada', barra: 'bg-amber-500', etiqueta: 'text-amber-900 bg-amber-50' }
  return { texto: 'Muy atrasada', barra: 'bg-rose-600', etiqueta: 'text-rose-800 bg-rose-50' }
}

/** Resumen semanal: horas planificadas frente a hechas por día y cumplimiento del plan. */
export function SemanaWidget({ semana, cumplimiento }: SemanaWidgetProps) {
  const estado = cumplimiento.porcentaje !== null ? estadoCumplimiento(cumplimiento.porcentaje) : null

  return (
    <section aria-labelledby="tu-semana" className="flex flex-col gap-3">
      <h3 id="tu-semana" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
        Tu semana
      </h3>
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-superficie p-4 md:p-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
        {/* Cifras */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:content-start">
          <div>
            <p className="text-sm text-slate-600">Horas estudiadas</p>
            <p className="text-3xl font-semibold text-slate-900 tabular-nums">{formatHoras(semana.horasCompletadas)}</p>
            <p className="text-sm text-slate-500">de {formatHoras(semana.horasPlanificadas)} planificadas</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Cumplimiento del plan</p>
            {cumplimiento.porcentaje === null || !estado ? (
              <p className="mt-1 text-sm text-slate-500">Aún no hay sesiones que tocaran.</p>
            ) : (
              <>
                <p className="text-3xl font-semibold text-slate-900 tabular-nums">{cumplimiento.porcentaje}%</p>
                <div
                  className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={cumplimiento.porcentaje}
                  aria-label="Cumplimiento del plan"
                >
                  <div className={`h-full rounded-full ${estado.barra}`} style={{ width: `${cumplimiento.porcentaje}%` }} />
                </div>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${estado.etiqueta}`}>{estado.texto}</span>
                  {cumplimiento.atrasadas > 0 && (
                    <span className="text-slate-500">
                      {cumplimiento.atrasadas} {cumplimiento.atrasadas === 1 ? 'sesión atrasada' : 'sesiones atrasadas'}
                    </span>
                  )}
                </p>
              </>
            )}
          </div>
        </div>

        <GraficoHorasDia
          titulo="Horas de estudio por día"
          vacio="Esta semana aún no hay estudio planificado ni registrado."
          dias={semana.dias.map((d) => ({ fecha: d.fecha, planificadas: d.horasPlanificadas, hechas: d.horasCompletadas }))}
        />
      </div>
    </section>
  )
}

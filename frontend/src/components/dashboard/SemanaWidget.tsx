import { format } from 'date-fns'
import { useState } from 'react'
import { es } from 'date-fns/locale'
import { diaLocal, hoyKey } from '../../lib/fechas'
import type { DashboardResponse } from '../../types/api'
import { formatHoras } from '../asignaturas/constants'

// Un solo tono (validado con el validador de paletas: rampa ordinal, contraste ≥ 2:1):
// la pista es lo planificado y el relleno, lo hecho.
const COLOR_PLANIFICADO = '#14b8a6' // brand-500
const COLOR_HECHO = '#115e59' // brand-800
const ALTO_PX = 128

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
  const hoy = hoyKey()
  // Columna con el tooltip abierto (al pasar el ratón o al tocarla).
  const [activa, setActiva] = useState<string | null>(null)
  const maximo = Math.max(...semana.dias.map((d) => d.horasPlanificadas), 0)
  // Escala redondeada a la hora para la línea de referencia superior.
  const escala = Math.max(1, Math.ceil(maximo))
  const sinPlan = semana.horasPlanificadas === 0
  const estado = cumplimiento.porcentaje !== null ? estadoCumplimiento(cumplimiento.porcentaje) : null

  return (
    <section aria-labelledby="tu-semana" className="flex flex-col gap-3">
      <h3 id="tu-semana" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
        Tu semana
      </h3>
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
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

        {/* Gráfico: horas por día */}
        <figure className="flex min-w-0 flex-col gap-2">
          <figcaption className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700">Horas de estudio por día</span>
            <span className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm" style={{ backgroundColor: COLOR_HECHO }} aria-hidden="true" />
                Hecho
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm" style={{ backgroundColor: COLOR_PLANIFICADO }} aria-hidden="true" />
                Planificado
              </span>
            </span>
          </figcaption>

          {sinPlan ? (
            <p className="grid h-32 place-items-center rounded-xl bg-slate-50 text-sm text-slate-500">
              Esta semana no tienes sesiones planificadas.
            </p>
          ) : (
            <div className="relative" aria-hidden="true">
              {/* Línea de referencia superior (escala) y línea base */}
              <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-slate-200" />
              <span className="pointer-events-none absolute -top-2.5 right-0 bg-white pl-1 text-xs text-slate-400 tabular-nums">
                {formatHoras(escala)}
              </span>
              <div className="flex items-end border-b border-slate-300" style={{ height: ALTO_PX }}>
                {semana.dias.map((dia) => {
                  const key = dia.fecha.slice(0, 10)
                  const alto = (dia.horasPlanificadas / escala) * ALTO_PX
                  const altoHecho = dia.horasPlanificadas > 0 ? (dia.horasCompletadas / dia.horasPlanificadas) * alto : 0
                  const etiqueta = `${format(diaLocal(key), "EEEE d", { locale: es })}: ${formatHoras(dia.horasCompletadas)} de ${formatHoras(dia.horasPlanificadas)}`
                  return (
                    <div
                      key={key}
                      onMouseEnter={() => setActiva(key)}
                      onMouseLeave={() => setActiva(null)}
                      onClick={() => setActiva((a) => (a === key ? null : key))}
                      className="relative flex h-full flex-1 cursor-default items-end justify-center"
                    >
                      {dia.horasPlanificadas > 0 && (
                        <div
                          className="relative w-full max-w-6 overflow-hidden rounded-t-[4px]"
                          style={{ height: alto, backgroundColor: COLOR_PLANIFICADO }}
                        >
                          <div className="absolute inset-x-0 bottom-0" style={{ height: altoHecho, backgroundColor: COLOR_HECHO }} />
                        </div>
                      )}
                      {/* Tooltip al pasar o al tocar (el teclado y los lectores usan la tabla) */}
                      {activa === key && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow first-letter:uppercase">
                          {etiqueta}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-1.5 flex">
                {semana.dias.map((dia) => {
                  const key = dia.fecha.slice(0, 10)
                  const esHoy = key === hoy
                  return (
                    <span
                      key={key}
                      className={`flex-1 text-center text-xs capitalize ${esHoy ? 'font-semibold text-brand-800' : 'text-slate-500'}`}
                    >
                      {format(diaLocal(key), 'EEEEEE', { locale: es })}
                      {esHoy && <span className="block text-[10px] tracking-wide uppercase">hoy</span>}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Misma información en tabla, para lectores de pantalla */}
          {!sinPlan && (
            <table className="sr-only">
              <caption>Horas de estudio por día de esta semana</caption>
              <thead>
                <tr>
                  <th scope="col">Día</th>
                  <th scope="col">Hecho</th>
                  <th scope="col">Planificado</th>
                </tr>
              </thead>
              <tbody>
                {semana.dias.map((dia) => (
                  <tr key={dia.fecha}>
                    <th scope="row">{format(diaLocal(dia.fecha), 'EEEE d', { locale: es })}</th>
                    <td>{formatHoras(dia.horasCompletadas)}</td>
                    <td>{formatHoras(dia.horasPlanificadas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </figure>
      </div>
    </section>
  )
}

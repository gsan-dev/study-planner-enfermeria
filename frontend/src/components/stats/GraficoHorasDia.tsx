import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { diaLocal, hoyKey } from '../../lib/fechas'
import { formatHoras } from '../asignaturas/constants'
import { COLOR_FUERTE, COLOR_SUAVE } from './colores'

export interface HorasDia {
  fecha: string // YYYY-MM-DD (o ISO)
  planificadas: number
  hechas: number
}

const ALTO_PX = 128

/**
 * Columnas por día: la pista clara es lo planificado y la oscura, lo hecho
 * (puede superar lo planificado si se registraron horas a mano). Tooltip al
 * pasar o tocar una columna y la misma información en una tabla oculta.
 */
export function GraficoHorasDia({ dias, titulo, vacio }: { dias: HorasDia[]; titulo: string; vacio: string }) {
  const hoy = hoyKey()
  const [activa, setActiva] = useState<string | null>(null)
  const maximo = Math.max(0, ...dias.flatMap((d) => [d.planificadas, d.hechas]))
  // Escala redondeada a la hora para la línea de referencia superior.
  const escala = Math.max(1, Math.ceil(maximo))
  const altura = (horas: number) => (horas / escala) * ALTO_PX

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{titulo}</span>
        <span className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ backgroundColor: COLOR_FUERTE }} aria-hidden="true" />
            Hecho
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ backgroundColor: COLOR_SUAVE }} aria-hidden="true" />
            Planificado
          </span>
        </span>
      </figcaption>

      {maximo === 0 ? (
        <p className="grid h-32 place-items-center rounded-xl bg-slate-50 text-sm text-slate-500">{vacio}</p>
      ) : (
        <div className="relative" aria-hidden="true">
          {/* Línea de referencia superior (escala) y línea base */}
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-slate-200" />
          <span className="pointer-events-none absolute -top-2.5 right-0 bg-superficie pl-1 text-xs text-slate-500 tabular-nums">
            {formatHoras(escala)}
          </span>
          <div className="flex items-end border-b border-slate-300" style={{ height: ALTO_PX }}>
            {dias.map((dia) => {
              const key = dia.fecha.slice(0, 10)
              const etiqueta = `${format(diaLocal(key), 'EEEE d', { locale: es })}: ${formatHoras(dia.hechas)} hechas de ${formatHoras(dia.planificadas)}`
              return (
                <div
                  key={key}
                  onMouseEnter={() => setActiva(key)}
                  onMouseLeave={() => setActiva(null)}
                  onClick={() => setActiva((a) => (a === key ? null : key))}
                  className="relative flex h-full flex-1 cursor-default items-end justify-center"
                >
                  <div className="relative h-full w-full max-w-6">
                    {dia.planificadas > 0 && (
                      <div
                        className="absolute inset-x-0 bottom-0 rounded-t-[4px]"
                        style={{ height: altura(dia.planificadas), backgroundColor: COLOR_SUAVE }}
                      />
                    )}
                    {dia.hechas > 0 && (
                      <div
                        className="absolute inset-x-0 bottom-0 rounded-t-[4px]"
                        style={{ height: altura(dia.hechas), backgroundColor: COLOR_FUERTE }}
                      />
                    )}
                  </div>
                  {/* Tooltip al pasar o al tocar (el teclado y los lectores usan la tabla) */}
                  {activa === key && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-slate-50 shadow first-letter:uppercase">
                      {etiqueta}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-1.5 flex">
            {dias.map((dia) => {
              const key = dia.fecha.slice(0, 10)
              const esHoy = key === hoy
              return (
                <span key={key} className={`flex-1 text-center text-xs capitalize ${esHoy ? 'font-semibold text-brand-800' : 'text-slate-500'}`}>
                  {format(diaLocal(key), 'EEEEEE', { locale: es })}
                  {esHoy && <span className="block text-[10px] tracking-wide uppercase">hoy</span>}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {maximo > 0 && (
        <table className="sr-only">
          <caption>{titulo}</caption>
          <thead>
            <tr>
              <th scope="col">Día</th>
              <th scope="col">Hecho</th>
              <th scope="col">Planificado</th>
            </tr>
          </thead>
          <tbody>
            {dias.map((dia) => (
              <tr key={dia.fecha}>
                <th scope="row">{format(diaLocal(dia.fecha), 'EEEE d', { locale: es })}</th>
                <td>{formatHoras(dia.hechas)}</td>
                <td>{formatHoras(dia.planificadas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  )
}

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState, type PointerEvent } from 'react'
import { diaLocal } from '../../lib/fechas'
import type { EvolucionDia } from '../../types/api'
import { formatHoras } from '../asignaturas/constants'
import { COLOR_FUERTE } from './colores'

/** Máximo "redondo" del eje (1, 2, 5, 10, 20, 50…) por encima del valor. */
function maximoRedondo(valor: number): number {
  if (valor <= 0) return 1
  const base = 10 ** Math.floor(Math.log10(valor))
  return [1, 2, 5, 10].map((m) => m * base).find((m) => m >= valor) ?? 10 * base
}

/**
 * Horas acumuladas en el tiempo. Una línea de 2px con un velo del 10 %, una
 * línea vertical que sigue al puntero (se engancha al día más cercano) y un
 * tooltip con las horas de ese día y el acumulado.
 */
export function LineaAcumulada({ dias, titulo }: { dias: EvolucionDia[]; titulo: string }) {
  const [indice, setIndice] = useState<number | null>(null)
  if (dias.length === 0) return null

  const maximo = maximoRedondo(dias.at(-1)?.acumulado ?? 0)
  const x = (i: number) => (dias.length === 1 ? 50 : (i / (dias.length - 1)) * 100)
  const y = (v: number) => 100 - (v / maximo) * 100
  const puntos = dias.map((d, i) => `${x(i)},${y(d.acumulado)}`)
  const linea = `M${puntos.join(' L')}`
  const area = `${linea} L${x(dias.length - 1)},100 L${x(0)},100 Z`
  const marcas = [0, maximo / 2, maximo]
  const activo = indice !== null ? dias[indice] : null

  const mover = (event: PointerEvent<HTMLDivElement>) => {
    const caja = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - caja.left) / caja.width))
    setIndice(Math.round(ratio * (dias.length - 1)))
  }

  const fechaCorta = (f: string) => format(diaLocal(f), 'd MMM', { locale: es })

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="sr-only">{titulo}</figcaption>
      <div className="flex">
        {/* Eje Y */}
        <div className="relative h-44 w-10 shrink-0" aria-hidden="true">
          {marcas.map((m) => (
            <span key={m} className="absolute right-2 -translate-y-1/2 text-xs text-slate-500 tabular-nums" style={{ top: `${y(m)}%` }}>
              {String(m).replace('.', ',')}h
            </span>
          ))}
        </div>

        <div
          className="relative h-44 min-w-0 flex-1 touch-none"
          onPointerMove={mover}
          onPointerDown={mover}
          onPointerLeave={() => setIndice(null)}
          aria-hidden="true"
        >
          {/* Rejilla */}
          {marcas.map((m) => (
            <div
              key={m}
              className={`absolute inset-x-0 border-t ${m === 0 ? 'border-slate-300' : 'border-slate-100'}`}
              style={{ top: `${y(m)}%` }}
            />
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <path d={area} style={{ fill: COLOR_FUERTE }} fillOpacity={0.1} />
            <path
              d={linea}
              fill="none"
              style={{ stroke: COLOR_FUERTE }}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* Último valor: punto con anillo del color del fondo */}
          <span
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-superficie"
            style={{ left: `${x(dias.length - 1)}%`, top: `${y(dias.at(-1)!.acumulado)}%`, backgroundColor: COLOR_FUERTE }}
          />
          {activo && indice !== null && (
            <>
              <div className="absolute inset-y-0 border-l border-slate-400" style={{ left: `${x(indice)}%` }} />
              <span
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-superficie"
                style={{ left: `${x(indice)}%`, top: `${y(activo.acumulado)}%`, backgroundColor: COLOR_FUERTE }}
              />
              <div
                className="pointer-events-none absolute top-0 z-10 rounded-lg bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-slate-50 shadow"
                style={
                  x(indice) > 60
                    ? { right: `${100 - x(indice)}%`, marginRight: 8 }
                    : { left: `${x(indice)}%`, marginLeft: 8 }
                }
              >
                <p className="font-semibold first-letter:uppercase">{format(diaLocal(activo.fecha), "EEEE d 'de' MMMM", { locale: es })}</p>
                <p>
                  {formatHoras(activo.horas)} ese día · {formatHoras(activo.acumulado)} en total
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex justify-between pl-10 text-xs text-slate-500" aria-hidden="true">
        <span>{fechaCorta(dias[0].fecha)}</span>
        <span>{fechaCorta(dias.at(-1)!.fecha)}</span>
      </div>

      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Horas ese día</th>
            <th scope="col">Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {dias.map((d) => (
            <tr key={d.fecha}>
              <th scope="row">{format(diaLocal(d.fecha), "d 'de' MMMM", { locale: es })}</th>
              <td>{formatHoras(d.horas)}</td>
              <td>{formatHoras(d.acumulado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

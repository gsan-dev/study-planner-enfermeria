import { useState } from 'react'
import { formatHoras } from '../asignaturas/constants'
import { COLOR_OTRAS } from './colores'

export interface ParteDonut {
  id: string
  nombre: string
  color: string
  horas: number
}

const MAX_PARTES = 6
const RADIO = 48
const GROSOR = 16
const CIRCUNFERENCIA = 2 * Math.PI * RADIO
// Hueco del color del fondo entre segmentos (unos 2px en pantalla).
const HUECO = 1.6

/** Como mucho 6 partes: las 5 mayores y el resto agrupado en "Otras". */
function agrupar(partes: ParteDonut[]): ParteDonut[] {
  const ordenadas = partes.filter((p) => p.horas > 0).sort((a, b) => b.horas - a.horas)
  if (ordenadas.length <= MAX_PARTES) return ordenadas
  const resto = ordenadas.slice(MAX_PARTES - 1)
  return [
    ...ordenadas.slice(0, MAX_PARTES - 1),
    { id: 'otras', nombre: `Otras (${resto.length})`, color: COLOR_OTRAS, horas: resto.reduce((a, p) => a + p.horas, 0) },
  ]
}

/**
 * Reparto de horas por asignatura (parte de un todo). La identidad no depende
 * solo del color: cada segmento tiene su fila en la leyenda con nombre, horas
 * y porcentaje, y al pasar por uno se resalta su fila (y al revés).
 */
export function DonutAsignaturas({ partes, titulo }: { partes: ParteDonut[]; titulo: string }) {
  const [activa, setActiva] = useState<string | null>(null)
  const grupos = agrupar(partes)
  const total = grupos.reduce((a, p) => a + p.horas, 0)

  if (grupos.length === 0) {
    return <p className="grid h-40 place-items-center rounded-xl bg-slate-50 text-sm text-slate-500">Aún no hay horas registradas en este periodo.</p>
  }

  const porcentaje = (h: number) => Math.round((h / total) * 100)
  const largos = grupos.map((p) => (p.horas / total) * CIRCUNFERENCIA)
  const segmentos = grupos.map((p, i) => ({
    ...p,
    largo: largos[i],
    // Empieza donde terminan los anteriores.
    inicio: largos.slice(0, i).reduce((a, l) => a + l, 0),
  }))
  const resaltada = grupos.find((p) => p.id === activa)

  return (
    <figure className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <figcaption className="sr-only">{titulo}</figcaption>
      <div className="relative size-44 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          {segmentos.length === 1 ? (
            <circle cx="60" cy="60" r={RADIO} fill="none" stroke={segmentos[0].color} strokeWidth={GROSOR} />
          ) : (
            segmentos.map((s) => (
              <circle
                key={s.id}
                cx="60"
                cy="60"
                r={RADIO}
                fill="none"
                stroke={s.color}
                strokeWidth={activa === s.id ? GROSOR + 4 : GROSOR}
                strokeDasharray={`${Math.max(0.5, s.largo - HUECO)} ${CIRCUNFERENCIA}`}
                strokeDashoffset={-s.inicio}
                opacity={activa && activa !== s.id ? 0.45 : 1}
                className="cursor-default transition-[stroke-width,opacity]"
                onMouseEnter={() => setActiva(s.id)}
                onMouseLeave={() => setActiva(null)}
                onClick={() => setActiva((a) => (a === s.id ? null : s.id))}
              />
            ))
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div className="max-w-24">
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{formatHoras(resaltada ? resaltada.horas : total)}</p>
            <p className="truncate text-xs text-slate-500">{resaltada ? resaltada.nombre : 'en total'}</p>
          </div>
        </div>
      </div>

      <ul className="flex w-full min-w-0 flex-col gap-0.5">
        {grupos.map((p) => (
          <li
            key={p.id}
            onMouseEnter={() => setActiva(p.id)}
            onMouseLeave={() => setActiva(null)}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${activa === p.id ? 'bg-slate-100' : ''}`}
          >
            <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-slate-800">{p.nombre}</span>
            <span className="shrink-0 text-slate-600 tabular-nums">{formatHoras(p.horas)}</span>
            <span className="w-10 shrink-0 text-right font-semibold text-slate-900 tabular-nums">{porcentaje(p.horas)}%</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { abreviar, layoutDia, toMinutes, type GridEntry } from '../../lib/horario'
import type { DiaSemana } from '../../types/models'
import { DIAS } from '../asignaturas/constants'

interface TimetableGridProps {
  entries: GridEntry[]
  /** Alto de cada hora en px. */
  hourHeight?: number
  /** Mostrar sábado y domingo aunque no haya clases. */
  showWeekend?: boolean
  /** Resalta hoy y marca la hora actual. */
  highlightToday?: boolean
  /** Si se pasa, cada hueco vacío es un botón para añadir una clase. */
  onCellClick?: (dia: DiaSemana, hora: number) => void
  onEntryClick?: (entry: GridEntry) => void
  compact?: boolean
}

const DEFAULT_START = 8
const DEFAULT_END = 21

function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [enabled])
  return now
}

/**
 * Horario semanal tipo "papel": días en columnas, horas en filas y cada clase
 * como un bloque de su color. Las clases que coinciden se reparten el ancho.
 */
export function TimetableGrid({
  entries,
  hourHeight = 52,
  showWeekend = false,
  highlightToday = false,
  onCellClick,
  onEntryClick,
  compact = false,
}: TimetableGridProps) {
  const now = useNow(highlightToday)
  const today = now.getDay() as DiaSemana

  const dias = useMemo(() => {
    const conClase = new Set(entries.map((e) => e.dia))
    return DIAS.filter((d) => (d.value >= 1 && d.value <= 5) || showWeekend || conClase.has(d.value))
  }, [entries, showWeekend])

  // Rango de horas: 8–21 por defecto, ampliado si alguna clase se sale.
  const [startHour, endHour] = useMemo(() => {
    let start = DEFAULT_START
    let end = DEFAULT_END
    for (const e of entries) {
      start = Math.min(start, Math.floor(toMinutes(e.horaInicio) / 60))
      end = Math.max(end, Math.ceil(toMinutes(e.horaFin) / 60))
    }
    return [start, end]
  }, [entries])

  const horas = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const porDia = useMemo(() => {
    const map = new Map<DiaSemana, ReturnType<typeof layoutDia>>()
    for (const d of dias) map.set(d.value, layoutDia(entries.filter((e) => e.dia === d.value)))
    return map
  }, [entries, dias])

  const minutesToPx = (min: number) => ((min - startHour * 60) / 60) * hourHeight
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const showNowLine = highlightToday && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-fit"
        style={{ gridTemplateColumns: `2.5rem repeat(${dias.length}, minmax(${compact ? '3rem' : '3.6rem'}, 1fr))` }}
      >
        {/* Cabecera de días */}
        <div />
        {dias.map((d) => {
          const esHoy = highlightToday && d.value === today
          return (
            <div
              key={d.value}
              className={[
                'border-b border-slate-200 py-2 text-center text-xs font-semibold tracking-wide uppercase',
                esHoy ? 'text-brand-700' : 'text-slate-500',
              ].join(' ')}
            >
              <span className={esHoy ? 'rounded-full bg-brand-50 px-2 py-0.5' : ''}>{d.short}</span>
            </div>
          )
        })}

        {/* Columna de horas */}
        <div className="relative" style={{ height: horas.length * hourHeight }}>
          {horas.map((h, i) => (
            <span
              key={h}
              className="absolute right-1.5 -translate-y-1/2 text-[11px] text-slate-500 tabular-nums"
              style={{ top: i * hourHeight }}
            >
              {i === 0 ? '' : `${h}:00`}
            </span>
          ))}
        </div>

        {/* Columnas de días */}
        {dias.map((d) => {
          const esHoy = highlightToday && d.value === today
          return (
            <div
              key={d.value}
              className={['relative border-l border-slate-100', esHoy ? 'bg-brand-50/40' : ''].join(' ')}
              style={{
                height: horas.length * hourHeight,
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${hourHeight - 1}px, var(--color-slate-100) ${hourHeight - 1}px, var(--color-slate-100) ${hourHeight}px)`,
              }}
            >
              {onCellClick &&
                horas.map((h, i) => (
                  <button
                    key={h}
                    type="button"
                    aria-label={`Añadir clase el ${d.label.toLowerCase()} a las ${h}:00`}
                    onClick={() => onCellClick(d.value, h)}
                    className="group absolute inset-x-0 cursor-pointer hover:bg-brand-50/70 focus-visible:bg-brand-50"
                    style={{ top: i * hourHeight, height: hourHeight }}
                  >
                    <span className="hidden text-lg leading-none text-brand-600 group-hover:inline group-focus-visible:inline">+</span>
                  </button>
                ))}

              {porDia.get(d.value)?.map((entry) => {
                const top = minutesToPx(toMinutes(entry.horaInicio))
                const height = Math.max(minutesToPx(toMinutes(entry.horaFin)) - top, 18)
                const width = 100 / entry.lanes
                const interactive = Boolean(onEntryClick) && !entry.muted
                const Tag = interactive ? 'button' : 'div'
                return (
                  <Tag
                    key={entry.id}
                    {...(interactive
                      ? { type: 'button' as const, onClick: () => onEntryClick?.(entry) }
                      : {})}
                    title={`${entry.titulo} · ${entry.horaInicio}–${entry.horaFin}${entry.detalle ? ` · ${entry.detalle}` : ''}`}
                    className={[
                      // @container: el contenido se adapta al ancho real del bloque (container queries).
                      '@container absolute flex flex-col justify-start overflow-hidden rounded-md border-l-[3px] px-1 py-0.5 text-left leading-tight @max-[2rem]:px-0.5',
                      interactive ? 'cursor-pointer transition-[filter] hover:brightness-95' : '',
                      entry.muted ? 'pointer-events-none opacity-45' : 'shadow-xs',
                    ].join(' ')}
                    style={{
                      top: top + 1,
                      height: height - 2,
                      left: `calc(${entry.lane * width}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                      backgroundColor: entry.muted ? 'var(--color-slate-200)' : `${entry.color}24`,
                      borderLeftColor: entry.muted ? 'var(--color-slate-400)' : entry.color,
                    }}
                  >
                    {/* Bloques muy estrechos (clases a la misma hora en móvil): solo la abreviatura. */}
                    <span className={`hidden font-semibold text-slate-900 @max-[2rem]:block ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                      {abreviar(entry.titulo)}
                    </span>
                    <span
                      className={`block font-semibold text-slate-900 @max-[2rem]:hidden ${compact ? 'text-[10px]' : 'text-[11px]'} line-clamp-3 break-words hyphens-auto`}
                    >
                      {entry.titulo}
                    </span>
                    {height >= 40 && (
                      <span className={`block text-slate-600 tabular-nums @max-[2rem]:hidden ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                        {entry.horaInicio}–{entry.horaFin}
                      </span>
                    )}
                    {height >= 64 && entry.detalle && (
                      <span className="block truncate text-[10px] text-slate-500 @max-[2rem]:hidden">{entry.detalle}</span>
                    )}
                  </Tag>
                )
              })}

              {esHoy && showNowLine && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-rose-500"
                  style={{ top: minutesToPx(nowMinutes) }}
                  aria-hidden="true"
                >
                  <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-rose-500" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

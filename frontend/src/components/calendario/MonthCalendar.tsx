import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { hoyKey, toDiaKey } from '../../lib/fechas'
import { ChevronDownIcon } from '../icons'

export interface CalendarEvent {
  id: string
  color: string
  label: string
}

interface MonthCalendarProps {
  /** Cualquier día del mes que se muestra. */
  mes: Date
  onMesChange: (mes: Date) => void
  /** Día seleccionado (YYYY-MM-DD). */
  selected: string | null
  onSelect: (dia: string) => void
  /** Eventos por día (YYYY-MM-DD). */
  eventos: Map<string, CalendarEvent[]>
  /** Nombre de los eventos para los lectores de pantalla ("examen", "exámenes"). */
  nombreEvento: [singular: string, plural: string]
  /** Siempre puntos, también en pantallas grandes (para columnas estrechas). */
  compacto?: boolean
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MAX_CHIPS = 2

/**
 * Calendario mensual (semana de lunes a domingo). En el móvil cada evento es
 * un punto de color; desde md se ve su nombre.
 */
export function MonthCalendar({ mes, onMesChange, selected, onSelect, eventos, nombreEvento, compacto = false }: MonthCalendarProps) {
  const hoy = hoyKey()
  const dias = eachDayOfInterval({
    start: startOfWeek(startOfMonth(mes), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(mes), { weekStartsOn: 1 }),
  })
  const esMesActual = isSameMonth(mes, new Date())

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-4">
      <div className="mb-2 flex items-center gap-1 px-1">
        <h3 className="flex-1 text-lg font-semibold text-slate-900 first-letter:uppercase" aria-live="polite">
          {format(mes, 'MMMM yyyy', { locale: es })}
        </h3>
        {!esMesActual && (
          <button
            type="button"
            onClick={() => {
              onMesChange(new Date())
              onSelect(hoy)
            }}
            className="min-h-11 cursor-pointer rounded-xl px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Hoy
          </button>
        )}
        <button
          type="button"
          onClick={() => onMesChange(addMonths(mes, -1))}
          aria-label="Mes anterior"
          className="grid size-11 cursor-pointer place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <ChevronDownIcon className="size-5 rotate-90" />
        </button>
        <button
          type="button"
          onClick={() => onMesChange(addMonths(mes, 1))}
          aria-label="Mes siguiente"
          className="grid size-11 cursor-pointer place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <ChevronDownIcon className="size-5 -rotate-90" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500" aria-hidden="true">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
        {dias.map((dia) => {
          const key = toDiaKey(dia)
          const lista = eventos.get(key) ?? []
          const fuera = !isSameMonth(dia, mes)
          const esHoy = key === hoy
          const esSeleccionado = key === selected
          const etiqueta = [
            format(dia, "EEEE d 'de' MMMM", { locale: es }),
            lista.length > 0 ? `${lista.length} ${lista.length === 1 ? nombreEvento[0] : nombreEvento[1]}` : null,
          ]
            .filter(Boolean)
            .join(', ')

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-label={etiqueta}
              aria-pressed={esSeleccionado}
              className={[
                'relative flex min-h-12 cursor-pointer flex-col items-center gap-1 p-1 text-left focus-visible:z-10 sm:min-h-16',
                compacto ? '' : 'md:min-h-24 md:items-stretch',
                fuera ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-800',
                esSeleccionado ? 'outline-2 -outline-offset-2 outline-brand-600' : 'hover:bg-brand-50/50',
              ].join(' ')}
            >
              <span
                className={[
                  'grid size-7 shrink-0 place-items-center rounded-full text-sm',
                  esHoy ? 'bg-brand-700 font-semibold text-white' : '',
                ].join(' ')}
              >
                {format(dia, 'd')}
              </span>

              {lista.length > 0 && (
                <>
                  {/* Móvil (o compacto): puntos */}
                  <span className={`flex flex-wrap justify-center gap-0.5 ${compacto ? '' : 'md:hidden'}`} aria-hidden="true">
                    {lista.slice(0, 4).map((e) => (
                      <span key={e.id} className="size-1.5 rounded-full" style={{ backgroundColor: e.color }} />
                    ))}
                  </span>
                  {/* Desde md: nombres */}
                  <span className={`hidden flex-col gap-0.5 ${compacto ? '' : 'md:flex'}`} aria-hidden="true">
                    {lista.slice(0, MAX_CHIPS).map((e) => (
                      <span
                        key={e.id}
                        className="truncate rounded px-1 py-0.5 text-xs leading-tight font-medium text-white"
                        style={{ backgroundColor: e.color }}
                      >
                        {e.label}
                      </span>
                    ))}
                    {lista.length > MAX_CHIPS && (
                      <span className="px-1 text-xs text-slate-500">+{lista.length - MAX_CHIPS} más</span>
                    )}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

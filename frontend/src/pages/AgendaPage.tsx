import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { DelPlanSection } from '../components/agenda/DelPlanSection'
import { DiarioSection } from '../components/agenda/DiarioSection'
import { TareasSection } from '../components/agenda/TareasSection'
import { MonthCalendar, type CalendarEvent } from '../components/calendario/MonthCalendar'
import { CalendarIcon, ChevronDownIcon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useAgenda } from '../hooks/useAgenda'
import { diaKey, diaLocal, hoyKey, toDiaKey } from '../lib/fechas'

const COLOR_TAREA = '#64748b'
const COLOR_DIARIO = '#0f766e'

export function AgendaPage() {
  const hoy = hoyKey()
  const [dia, setDia] = useState(hoy)
  const [mes, setMes] = useState(() => diaLocal(hoy))
  const [verCalendario, setVerCalendario] = useState(false)

  // Se pide la cuadrícula completa del mes que se ve (con los días de los meses vecinos).
  const desde = toDiaKey(startOfWeek(startOfMonth(mes), { weekStartsOn: 1 }))
  const hasta = toDiaKey(endOfWeek(endOfMonth(mes), { weekStartsOn: 1 }))
  const { data, status, error, reload, upsertTarea, removeTarea, setDiario, setSesionCompletada } = useAgenda(desde, hasta, hoy)

  const irA = (nuevo: string) => {
    setDia(nuevo)
    setMes(diaLocal(nuevo))
  }

  const eventos = useMemo(() => {
    const mapa = new Map<string, CalendarEvent[]>()
    const push = (key: string, evento: CalendarEvent) => mapa.set(key, [...(mapa.get(key) ?? []), evento])
    if (!data) return mapa
    for (const e of data.examenes) {
      push(diaKey(e.fecha), { id: e._id, color: e.asignatura?.color ?? '#475569', label: `Examen ${e.asignatura?.nombre ?? ''}` })
    }
    const estudioPorDia = new Map<string, string>()
    for (const s of data.sesiones) estudioPorDia.set(diaKey(s.fecha), s.asignatura?.color ?? '#475569')
    for (const [key, color] of estudioPorDia) push(key, { id: `estudio-${key}`, color, label: 'Estudio' })
    const tareasPorDia = new Map<string, number>()
    for (const t of data.tareas) if (!t.hecho) tareasPorDia.set(diaKey(t.fecha), (tareasPorDia.get(diaKey(t.fecha)) ?? 0) + 1)
    for (const [key, n] of tareasPorDia) push(key, { id: `tareas-${key}`, color: COLOR_TAREA, label: n === 1 ? '1 tarea' : `${n} tareas` })
    for (const e of data.diario) push(diaKey(e.fecha), { id: e._id, color: COLOR_DIARIO, label: 'Diario' })
    return mapa
  }, [data])

  const delDia = <T extends { fecha: string }>(lista: T[] | undefined) => (lista ?? []).filter((x) => diaKey(x.fecha) === dia)
  const entrada = data?.diario.find((e) => diaKey(e.fecha) === dia) ?? null
  const esHoy = dia === hoy
  // Los datos del día solo valen si ya han llegado los del mes que lo contiene.
  const listo = data !== null && dia >= desde && dia <= hasta && status !== 'loading'

  const calendario = (
    <MonthCalendar
      mes={mes}
      onMesChange={setMes}
      selected={dia}
      onSelect={(key) => {
        irA(key)
        setVerCalendario(false)
      }}
      eventos={eventos}
      nombreEvento={['apunte', 'apuntes']}
      compacto
    />
  )

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
      {/* Escritorio: calendario siempre visible */}
      <div className="hidden lg:sticky lg:top-4 lg:block">{calendario}</div>

      <div className="flex min-w-0 flex-col gap-4">
        {/* Navegación por días */}
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">
          <button
            type="button"
            onClick={() => irA(toDiaKey(addDays(diaLocal(dia), -1)))}
            aria-label="Día anterior"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
          >
            <ChevronDownIcon className="size-5 rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => setVerCalendario((v) => !v)}
            aria-expanded={verCalendario}
            className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl hover:bg-slate-50 lg:cursor-default lg:hover:bg-transparent"
          >
            <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{esHoy ? 'Hoy' : format(diaLocal(dia), 'yyyy')}</span>
            <span className="truncate font-semibold text-slate-900 first-letter:uppercase">
              {format(diaLocal(dia), "EEEE d 'de' MMMM", { locale: es })}
            </span>
          </button>
          <button
            type="button"
            onClick={() => irA(toDiaKey(addDays(diaLocal(dia), 1)))}
            aria-label="Día siguiente"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
          >
            <ChevronDownIcon className="size-5 -rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => setVerCalendario((v) => !v)}
            aria-label={verCalendario ? 'Ocultar calendario' : 'Ver calendario'}
            aria-pressed={verCalendario}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <CalendarIcon className="size-5" />
          </button>
        </div>

        {!esHoy && (
          <Button variant="ghost" onClick={() => irA(hoy)} className="-mt-2 self-center">
            Volver a hoy
          </Button>
        )}

        {/* Móvil: calendario desplegable */}
        {verCalendario && <div className="lg:hidden">{calendario}</div>}

        {status === 'error' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
            <p className="text-rose-700">{error}</p>
            <Button variant="secondary" onClick={reload} className="mt-3">
              Reintentar
            </Button>
          </div>
        )}

        {status !== 'error' && !listo && (
          <div className="grid min-h-40 place-items-center text-slate-400">
            <Spinner />
          </div>
        )}

        {listo && data && (
          <>
            <DelPlanSection examenes={delDia(data.examenes)} sesiones={delDia(data.sesiones)} onSesion={setSesionCompletada} />
            <TareasSection
              key={`tareas-${dia}`}
              dia={dia}
              esHoy={esHoy}
              tareas={delDia(data.tareas)}
              pendientes={data.pendientes}
              onChange={upsertTarea}
              onRemove={removeTarea}
            />
            <DiarioSection key={`diario-${dia}`} dia={dia} entrada={entrada} onSaved={setDiario} />
          </>
        )}
      </div>
    </div>
  )
}

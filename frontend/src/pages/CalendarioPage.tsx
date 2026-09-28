import { addMonths, format, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { formatHoras } from '../components/asignaturas/constants'
import { nombreExamen } from '../components/examenes/constants'
import { CalendarIcon, CheckIcon, ChevronDownIcon, NotebookIcon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { diaLocal, hoyKey } from '../lib/fechas'
import { TIPO_SESION } from '../lib/plan'
import { getErrorMessage } from '../services/api'
import { getCalendarioMes } from '../services/dashboardService'
import { actualizarSesion } from '../services/planService'
import type { BloqueEstudio, CalendarioMes, DiaCalendario } from '../types/api'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const EMOJI_ANIMO = ['', '😣', '😕', '😐', '🙂', '😄']
const SIN_ASIGNATURA = '#475569'

const idAsignatura = (b: { asignatura: { _id: string } | null }) => b.asignatura?._id ?? 'sin'

/** Día del calendario ya filtrado por las asignaturas visibles. */
function filtrar(dia: DiaCalendario, ocultas: Set<string>): DiaCalendario {
  if (ocultas.size === 0) return dia
  return {
    ...dia,
    examenes: dia.examenes.filter((e) => !ocultas.has(e.asignatura?._id ?? 'sin')),
    estudio: dia.estudio.filter((b) => !ocultas.has(idAsignatura(b))),
  }
}

function Celda({ dia, mes, seleccionado, onSelect }: { dia: DiaCalendario; mes: Date; seleccionado: boolean; onSelect: () => void }) {
  const fecha = diaLocal(dia.fecha)
  const fuera = !isSameMonth(fecha, mes)
  const esHoy = dia.fecha === hoyKey()
  const partes = [
    format(fecha, "EEEE d 'de' MMMM", { locale: es }),
    dia.examenes.length > 0 && `${dia.examenes.length} ${dia.examenes.length === 1 ? 'examen' : 'exámenes'}`,
    dia.estudio.length > 0 && `estudio de ${dia.estudio.map((b) => b.asignatura?.nombre).join(', ')}`,
    dia.tareas.total > 0 && `${dia.tareas.total} ${dia.tareas.total === 1 ? 'tarea' : 'tareas'}`,
    dia.diario && 'diario',
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={seleccionado}
      aria-label={partes.join(', ')}
      className={[
        'flex min-h-14 min-w-0 cursor-pointer flex-col gap-1 p-1 text-left focus-visible:z-10 md:min-h-28 md:p-1.5',
        fuera ? 'bg-slate-50' : 'bg-white',
        seleccionado ? 'outline-2 -outline-offset-2 outline-brand-600' : 'hover:bg-brand-50/40',
      ].join(' ')}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className={[
            'grid size-7 place-items-center rounded-full text-sm',
            esHoy ? 'bg-brand-700 font-semibold text-white' : fuera ? 'text-slate-400' : 'text-slate-800',
          ].join(' ')}
        >
          {format(fecha, 'd')}
        </span>
        {/* Tareas y diario: iconos pequeños (solo desde md) */}
        <span className="hidden items-center gap-1 text-xs text-slate-500 md:flex" aria-hidden="true">
          {dia.tareas.total > 0 && (
            <span className={dia.tareas.hechas === dia.tareas.total ? 'text-emerald-700' : ''}>
              ✓{dia.tareas.hechas}/{dia.tareas.total}
            </span>
          )}
          {dia.diario && <span>{dia.diario.animo ? EMOJI_ANIMO[dia.diario.animo] : '✎'}</span>}
        </span>
      </span>

      {/* Móvil: puntos de color */}
      <span className="flex flex-wrap justify-center gap-0.5 md:hidden" aria-hidden="true">
        {dia.examenes.map((e) => (
          <span key={e._id} className="size-2 rounded-sm" style={{ backgroundColor: e.asignatura?.color ?? SIN_ASIGNATURA }} />
        ))}
        {dia.estudio.map((b) => (
          <span key={idAsignatura(b)} className="size-1.5 rounded-full" style={{ backgroundColor: b.asignatura?.color ?? SIN_ASIGNATURA }} />
        ))}
        {(dia.tareas.total > 0 || dia.diario) && <span className="size-1.5 rounded-full bg-slate-400" />}
      </span>

      {/* Desde md: exámenes y bloques de estudio */}
      <span className="hidden min-w-0 flex-col gap-0.5 md:flex" aria-hidden="true">
        {dia.examenes.map((e) => (
          <span
            key={e._id}
            className="truncate rounded px-1.5 py-0.5 text-xs leading-tight font-semibold text-white"
            style={{ backgroundColor: e.asignatura?.color ?? SIN_ASIGNATURA }}
          >
            Examen · {e.asignatura?.nombre}
          </span>
        ))}
        {dia.estudio.slice(0, 3).map((b) => {
          const hecho = b.horasCompletadas >= b.horas
          const color = b.asignatura?.color ?? SIN_ASIGNATURA
          return (
            <span
              key={idAsignatura(b)}
              className="flex min-w-0 items-center gap-1 rounded border-l-[3px] bg-slate-50 px-1 py-0.5 text-xs leading-tight text-slate-700"
              style={{ borderLeftColor: color }}
            >
              <span className={`truncate ${hecho ? 'text-slate-400 line-through' : ''}`}>{b.asignatura?.nombre ?? 'Estudio'}</span>
              <span className="ml-auto shrink-0 text-slate-500 tabular-nums">{formatHoras(b.horas).replace(' h', 'h')}</span>
            </span>
          )
        })}
        {dia.estudio.length > 3 && <span className="px-1 text-xs text-slate-500">+{dia.estudio.length - 3} más</span>}
      </span>
    </button>
  )
}

function DetalleDia({ dia, onSesion }: { dia: DiaCalendario; onSesion: (bloque: BloqueEstudio, sesionId: string) => void }) {
  const fecha = diaLocal(dia.fecha)
  const vacio = dia.examenes.length === 0 && dia.estudio.length === 0 && dia.tareas.total === 0 && !dia.diario

  return (
    <section aria-labelledby="detalle-dia" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 id="detalle-dia" className="font-semibold text-slate-900 first-letter:uppercase">
        {dia.fecha === hoyKey() && 'Hoy · '}
        {format(fecha, "EEEE d 'de' MMMM", { locale: es })}
      </h3>

      {vacio && <p className="text-sm text-slate-500">Nada planificado este día.</p>}

      {dia.examenes.map((e) => (
        <Link
          key={e._id}
          to={`/plan/${e._id}`}
          className="flex items-center gap-3 rounded-xl p-3 text-white"
          style={{ backgroundColor: e.asignatura?.color ?? SIN_ASIGNATURA }}
        >
          <CalendarIcon className="size-6 shrink-0" />
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase opacity-90">Examen{e.hora && ` · ${e.hora}`}</span>
            <span className="block font-semibold">{nombreExamen(e, e.asignatura?.nombre)}</span>
          </span>
        </Link>
      ))}

      {dia.estudio.map((bloque) => {
        const color = bloque.asignatura?.color ?? SIN_ASIGNATURA
        return (
          <div key={idAsignatura(bloque)}>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
              {bloque.asignatura?.nombre ?? 'Estudio'}
              <span className="ml-auto font-normal text-slate-500 tabular-nums">
                {formatHoras(bloque.horasCompletadas)} / {formatHoras(bloque.horas)}
              </span>
            </p>
            <ul className="-mx-2 mt-1 flex flex-col">
              {bloque.sesiones.map((s) => (
                <li key={s._id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={s.completado}
                    aria-label={`Estudiar ${s.tema}, ${formatHoras(s.horas)}`}
                    onClick={() => onSesion(bloque, s._id)}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left hover:bg-slate-50"
                  >
                    <span
                      className={[
                        'grid size-6 shrink-0 place-items-center rounded-lg border-2 text-white',
                        s.completado ? 'border-transparent' : 'border-slate-300 bg-white',
                      ].join(' ')}
                      style={s.completado ? { backgroundColor: color } : undefined}
                    >
                      {s.completado && <CheckIcon className="size-4" strokeWidth={3} />}
                    </span>
                    <span className={`min-w-0 flex-1 ${s.completado ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{s.tema}</span>
                    {s.tipo === 'repaso' && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        {TIPO_SESION.repaso}
                      </span>
                    )}
                    <span className="shrink-0 text-sm text-slate-600 tabular-nums">{formatHoras(s.horas)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {(dia.tareas.total > 0 || dia.diario) && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
          {dia.tareas.total > 0 && (
            <span>
              Tareas: {dia.tareas.hechas} de {dia.tareas.total} hechas
            </span>
          )}
          {dia.diario && <span>Diario {dia.diario.animo ? EMOJI_ANIMO[dia.diario.animo] : 'escrito'}</span>}
        </p>
      )}

      <Link
        to={`/agenda?dia=${dia.fecha}`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        <NotebookIcon className="size-5" />
        Abrir en la agenda
      </Link>
    </section>
  )
}

export function CalendarioPage() {
  const hoy = hoyKey()
  const [mes, setMes] = useState(() => diaLocal(hoy))
  const [seleccionado, setSeleccionado] = useState(hoy)
  const [ocultas, setOcultas] = useState<Set<string>>(new Set())
  const [datos, setDatos] = useState<CalendarioMes | null>(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const mesKey = format(mes, 'yyyy-MM')

  useEffect(() => {
    const controller = new AbortController()
    getCalendarioMes(mesKey, controller.signal)
      .then((res) => {
        setDatos(res)
        setError('')
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(getErrorMessage(err))
      })
    return () => controller.abort()
  }, [mesKey, reloadKey])

  const cargando = !datos || datos.mes !== mesKey
  const dias = (datos?.dias ?? []).map((d) => filtrar(d, ocultas))
  const detalle = dias.find((d) => d.fecha === seleccionado)

  const cambiarMes = (delta: number) => {
    const nuevo = addMonths(mes, delta)
    setMes(nuevo)
    setSeleccionado(isSameMonth(nuevo, diaLocal(hoy)) ? hoy : format(nuevo, 'yyyy-MM-01'))
  }

  const toggleAsignatura = (id: string) =>
    setOcultas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleSesion = async (bloque: BloqueEstudio, sesionId: string) => {
    if (!datos) return
    const sesion = bloque.sesiones.find((s) => s._id === sesionId)
    if (!sesion) return
    const completado = !sesion.completado
    const aplicar = (valor: boolean) =>
      setDatos((d) =>
        d
          ? {
              ...d,
              dias: d.dias.map((dia) => ({
                ...dia,
                estudio: dia.estudio.map((b) => {
                  if (!b.sesiones.some((s) => s._id === sesionId)) return b
                  const sesiones = b.sesiones.map((s) => (s._id === sesionId ? { ...s, completado: valor } : s))
                  return { ...b, sesiones, horasCompletadas: sesiones.filter((s) => s.completado).reduce((a, s) => a + s.horas, 0) }
                }),
              })),
            }
          : d,
      )
    aplicar(completado)
    try {
      const { temaEstudiado } = await actualizarSesion(sesion.planId, sesionId, { completado })
      if (temaEstudiado) toast.success(`¡«${sesion.tema}» estudiado!`)
    } catch (err) {
      aplicar(!completado)
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-xl font-semibold text-slate-900 first-letter:uppercase" aria-live="polite">
          {format(mes, 'MMMM yyyy', { locale: es })}
        </h2>
        {!isSameMonth(mes, diaLocal(hoy)) && (
          <Button
            variant="ghost"
            onClick={() => {
              setMes(diaLocal(hoy))
              setSeleccionado(hoy)
            }}
          >
            Hoy
          </Button>
        )}
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          aria-label="Mes anterior"
          className="grid size-11 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <ChevronDownIcon className="size-5 rotate-90" />
        </button>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
          className="grid size-11 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <ChevronDownIcon className="size-5 -rotate-90" />
        </button>
      </div>

      {/* Leyenda y filtro por asignatura: el color sigue a la asignatura aunque se oculten otras */}
      {datos && datos.asignaturas.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mostrar asignaturas">
          {datos.asignaturas.map((a) => {
            const visible = !ocultas.has(a._id)
            return (
              <button
                key={a._id}
                type="button"
                aria-pressed={visible}
                onClick={() => toggleAsignatura(a._id)}
                className={[
                  'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
                  visible ? 'border-slate-300 bg-white text-slate-800' : 'border-dashed border-slate-300 bg-transparent text-slate-400',
                ].join(' ')}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: visible ? a.color : 'transparent', boxShadow: visible ? undefined : `inset 0 0 0 1.5px ${a.color}` }}
                  aria-hidden="true"
                />
                {a.nombre}
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
          <p className="text-rose-700">{error}</p>
          <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)} className="mt-3">
            Reintentar
          </Button>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="relative">
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500" aria-hidden="true">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-1.5">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
            {cargando && dias.length === 0
              ? Array.from({ length: 35 }, (_, i) => <div key={i} className="min-h-14 bg-white md:min-h-28" />)
              : dias.map((dia) => (
                  <Celda
                    key={dia.fecha}
                    dia={dia}
                    mes={mes}
                    seleccionado={dia.fecha === seleccionado}
                    onSelect={() => setSeleccionado(dia.fecha)}
                  />
                ))}
          </div>
          {cargando && (
            <div className="absolute inset-0 grid place-items-center text-slate-400">
              <Spinner />
            </div>
          )}
        </div>

        {detalle && !cargando && <DetalleDia dia={detalle} onSesion={toggleSesion} />}
      </div>
    </div>
  )
}

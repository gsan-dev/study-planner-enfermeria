import { addDays, format, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { formatHoras } from '../components/asignaturas/constants'
import { ChartIcon, ChevronDownIcon, PlusIcon, TrashIcon } from '../components/icons'
import { BarrasTema } from '../components/stats/BarrasTema'
import { DonutAsignaturas } from '../components/stats/DonutAsignaturas'
import { GraficoHorasDia } from '../components/stats/GraficoHorasDia'
import { LineaAcumulada } from '../components/stats/LineaAcumulada'
import { PrediccionCard } from '../components/stats/PrediccionCard'
import { RegistrarHorasModal } from '../components/stats/RegistrarHorasModal'
import { Button, IconButton } from '../components/ui/Button'
import { SelectField } from '../components/ui/Field'
import { Spinner } from '../components/ui/Spinner'
import { useAsignaturas } from '../hooks/useAsignaturas'
import { useCarga } from '../hooks/useCarga'
import { diaLocal, hoyKey, toDiaKey } from '../lib/fechas'
import { getErrorMessage } from '../services/api'
import {
  borrarRegistro,
  getEstadisticasPorTema,
  getEvolucion,
  getPrediccion,
  getProgresoPorAsignatura,
  getResumenProgreso,
  getSemanaEstadisticas,
  listRegistros,
} from '../services/progresoService'
import type { PeriodoProgreso } from '../types/api'

function Tarjeta({ titulo, accion, children, className = '' }: { titulo: string; accion?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  )
}

function Cargando() {
  return (
    <div className="grid h-40 place-items-center text-slate-400">
      <Spinner />
    </div>
  )
}

function Segmentado<T extends string>({ valor, opciones, onChange, label }: { valor: T; opciones: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {opciones.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={valor === o.value}
          onClick={() => onChange(o.value)}
          className={[
            'min-h-8 cursor-pointer rounded-md px-3 text-xs font-semibold',
            valor === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ProgresoPage() {
  const hoy = hoyKey()
  // Cambia al registrar o borrar horas: vuelve a pedir todo.
  const [version, setVersion] = useState(0)
  const [registrando, setRegistrando] = useState(false)
  const [semana, setSemana] = useState(() => toDiaKey(startOfWeek(diaLocal(hoy), { weekStartsOn: 1 })))
  const [periodo, setPeriodo] = useState<PeriodoProgreso>('mes')
  const [rango, setRango] = useState<30 | 90>(30)
  const [asignaturaTema, setAsignaturaTema] = useState('')
  const { asignaturas, status: asignaturasStatus } = useAsignaturas('false')

  const resumen = useCarga(`resumen:${hoy}:${version}`, (s) => getResumenProgreso(hoy, s))
  const semanaDatos = useCarga(`semana:${semana}:${version}`, (s) => getSemanaEstadisticas(semana, s))
  const reparto = useCarga(`reparto:${periodo}:${version}`, (s) => getProgresoPorAsignatura(periodo, hoy, s))
  const todas = useCarga(`todas:${version}`, (s) => getProgresoPorAsignatura('todo', hoy, s))
  const desdeEvolucion = toDiaKey(addDays(diaLocal(hoy), -(rango - 1)))
  const evolucion = useCarga(`evolucion:${rango}:${version}`, (s) => getEvolucion(desdeEvolucion, hoy, s))
  const prediccion = useCarga(`prediccion:${version}`, (s) => getPrediccion(hoy, s))
  const registros = useCarga(`registros:${version}`, (s) => listRegistros(15, s))
  const temaSeleccionado = asignaturaTema || asignaturas[0]?._id || ''
  const porTema = useCarga(`tema:${temaSeleccionado}:${version}`, (s) =>
    temaSeleccionado ? getEstadisticasPorTema(temaSeleccionado, s) : Promise.resolve(null),
  )

  const actualizar = () => setVersion((v) => v + 1)

  const borrar = async (id: string) => {
    try {
      await borrarRegistro(id)
      toast.success('Registro borrado')
      actualizar()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  if (asignaturasStatus === 'ready' && asignaturas.length === 0) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-slate-300 p-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <ChartIcon className="size-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Aún no hay nada que medir</h2>
          <p className="mt-1.5 text-slate-600">Añade tus asignaturas y empieza a estudiar: aquí verás tus horas, tu racha y cómo vas.</p>
          <Link
            to="/asignaturas"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Ir a Asignaturas
          </Link>
        </div>
      </div>
    )
  }

  const r = resumen.data
  const cifras = r
    ? [
        { label: 'Esta semana', valor: formatHoras(r.horasSemana), detalle: `hoy ${formatHoras(r.horasHoy)}` },
        {
          label: 'Racha',
          valor: `${r.racha} ${r.racha === 1 ? 'día' : 'días'}`,
          detalle: r.mejorRacha > 0 ? `mejor: ${r.mejorRacha} ${r.mejorRacha === 1 ? 'día' : 'días'}` : 'estudia hoy para empezarla',
        },
        { label: 'Total estudiado', valor: formatHoras(r.horasTotales), detalle: `en ${r.diasEstudiados} ${r.diasEstudiados === 1 ? 'día' : 'días'}` },
        { label: 'Media diaria', valor: formatHoras(r.mediaDiaria), detalle: 'últimos 30 días' },
      ]
    : []
  const lunes = diaLocal(semana)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-600">
          {r ? (
            <>
              <strong className="text-slate-900">
                {r.temas.estudiados} de {r.temas.total}
              </strong>{' '}
              temas estudiados
            </>
          ) : (
            'Tu progreso de estudio'
          )}
        </p>
        <Button onClick={() => setRegistrando(true)} disabled={asignaturas.length === 0}>
          <PlusIcon className="size-5" />
          Registrar horas
        </Button>
      </div>

      {/* Cifras */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {r
          ? cifras.map((c) => (
              <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">{c.label}</p>
                <p className="mt-0.5 text-2xl font-semibold text-slate-900 tabular-nums md:text-3xl">{c.valor}</p>
                <p className="text-xs text-slate-500">{c.detalle}</p>
              </div>
            ))
          : Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Tarjeta
          titulo="Horas por día"
          accion={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSemana(toDiaKey(addDays(lunes, -7)))}
                aria-label="Semana anterior"
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <ChevronDownIcon className="size-5 rotate-90" />
              </button>
              <span className="min-w-28 text-center text-sm text-slate-600">
                {format(lunes, 'd MMM', { locale: es })} – {format(addDays(lunes, 6), 'd MMM', { locale: es })}
              </span>
              <button
                type="button"
                onClick={() => setSemana(toDiaKey(addDays(lunes, 7)))}
                aria-label="Semana siguiente"
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <ChevronDownIcon className="size-5 -rotate-90" />
              </button>
            </div>
          }
        >
          {semanaDatos.data ? (
            <div className={semanaDatos.cargando ? 'opacity-50' : ''}>
              <GraficoHorasDia
                titulo={`Horas estudiadas: ${formatHoras(semanaDatos.data.horasEstudiadas)} de ${formatHoras(semanaDatos.data.horasPlanificadas)} planificadas`}
                vacio="Sin estudio planificado ni registrado esta semana."
                dias={semanaDatos.data.dias.map((d) => ({ fecha: d.fecha, planificadas: d.horasPlanificadas, hechas: d.horasEstudiadas }))}
              />
            </div>
          ) : (
            <Cargando />
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Horas por asignatura"
          accion={
            <Segmentado
              label="Periodo"
              valor={periodo}
              onChange={setPeriodo}
              opciones={[
                { value: 'semana', label: 'Semana' },
                { value: 'mes', label: 'Mes' },
                { value: 'todo', label: 'Todo' },
              ]}
            />
          }
        >
          {reparto.data ? (
            <div className={reparto.cargando ? 'opacity-50' : ''}>
              <DonutAsignaturas
                titulo="Reparto de horas estudiadas por asignatura"
                partes={reparto.data.asignaturas.map((a) => ({
                  id: a.asignatura._id,
                  nombre: a.asignatura.nombre,
                  color: a.asignatura.color,
                  horas: a.horasEstudiadas,
                }))}
              />
            </div>
          ) : (
            <Cargando />
          )}
        </Tarjeta>
      </div>

      <Tarjeta
        titulo="Horas acumuladas"
        accion={
          <Segmentado
            label="Rango"
            valor={String(rango) as '30' | '90'}
            onChange={(v) => setRango(Number(v) as 30 | 90)}
            opciones={[
              { value: '30', label: '30 días' },
              { value: '90', label: '90 días' },
            ]}
          />
        }
      >
        {evolucion.data ? (
          <div className={evolucion.cargando ? 'opacity-50' : ''}>
            <LineaAcumulada dias={evolucion.data} titulo={`Horas acumuladas en los últimos ${rango} días`} />
          </div>
        ) : (
          <Cargando />
        )}
      </Tarjeta>

      {/* Predicción */}
      <section aria-labelledby="prediccion" className="flex flex-col gap-3">
        <div>
          <h3 id="prediccion" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Preparación para los exámenes
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Estimación orientativa (sobre 10): la mitad por las horas estudiadas de sus temas frente a las recomendadas y la
            mitad por los temas ya estudiados. No es una nota real.
          </p>
        </div>
        {!prediccion.data ? (
          <Cargando />
        ) : prediccion.data.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">No tienes exámenes próximos.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {prediccion.data.map((p) => (
              <PrediccionCard key={p.examen._id} prediccion={p} />
            ))}
          </div>
        )}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Tarjeta titulo="Por asignatura">
          {!todas.data ? (
            <Cargando />
          ) : (
            <ul className="flex flex-col gap-4">
              {todas.data.asignaturas.map((a) => (
                <li key={a.asignatura._id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <Link to={`/asignaturas/${a.asignatura._id}`} className="flex min-w-0 items-center gap-2 font-medium text-slate-900 hover:underline">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.asignatura.color }} aria-hidden="true" />
                      <span className="truncate">{a.asignatura.nombre}</span>
                    </Link>
                    <span className="shrink-0 text-sm text-slate-600 tabular-nums">
                      <strong className="text-slate-900">{formatHoras(a.horasEstudiadas)}</strong> estudiadas
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={a.porcentajeTemario}
                    aria-label={`Temario de ${a.asignatura.nombre} estudiado`}
                  >
                    <div className="h-full rounded-full" style={{ width: `${a.porcentajeTemario}%`, backgroundColor: a.asignatura.color }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {a.temas.total === 0
                      ? 'Sin temas'
                      : `${a.temas.estudiados} de ${a.temas.total} temas (${a.porcentajeTemario}%) · recomendadas ${formatHoras(a.horasRecomendadas)}`}
                    {a.horasPlanificadas > 0 && ` · en planes ${formatHoras(a.horasPlanificadas)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Por tema"
          accion={
            <SelectField
              label="Asignatura"
              value={temaSeleccionado}
              onChange={(e) => setAsignaturaTema(e.target.value)}
              wrapperClassName="w-48 [&_label]:sr-only"
            >
              {asignaturas.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.nombre}
                </option>
              ))}
            </SelectField>
          }
        >
          {porTema.data ? (
            <div className={porTema.cargando ? 'opacity-50' : ''}>
              <BarrasTema temas={porTema.data.temas} horasSinTema={porTema.data.horasSinTema} />
            </div>
          ) : (
            <Cargando />
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Últimos registros">
        {!registros.data ? (
          <Cargando />
        ) : registros.data.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay horas registradas. Completa sesiones de tu plan o usa «Registrar horas».
          </p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {registros.data.map((reg) => (
              <li key={reg._id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-50">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: reg.asignatura?.color ?? '#475569' }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-800">
                    {reg.asignatura?.nombre ?? 'Asignatura eliminada'}
                    {reg.temas[0] && <span className="text-slate-500"> · {reg.temas[0].nombre}</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="first-letter:uppercase">{format(diaLocal(reg.fecha), "EEE d 'de' MMM", { locale: es })}</span>
                    {reg.origen === 'plan' ? ' · del plan' : ' · a mano'}
                    {reg.notas && ` · ${reg.notas}`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">{formatHoras(reg.horasEstudiadas)}</span>
                {reg.origen === 'manual' ? (
                  <IconButton label="Borrar registro" tone="danger" onClick={() => borrar(reg._id)}>
                    <TrashIcon className="size-4.5" />
                  </IconButton>
                ) : (
                  <span className="size-11 shrink-0" aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <RegistrarHorasModal
        open={registrando}
        asignaturas={asignaturas}
        onClose={() => setRegistrando(false)}
        onSaved={() => {
          setRegistrando(false)
          actualizar()
        }}
      />
    </div>
  )
}

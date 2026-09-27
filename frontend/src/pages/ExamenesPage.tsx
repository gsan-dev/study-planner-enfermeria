import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { MonthCalendar, type CalendarEvent } from '../components/calendario/MonthCalendar'
import { ExamenCard } from '../components/examenes/ExamenCard'
import { ExamenDetalleModal } from '../components/examenes/ExamenDetalleModal'
import { ExamenFormModal } from '../components/examenes/ExamenFormModal'
import { nombreExamen } from '../components/examenes/constants'
import { BookIcon, CalendarIcon, PlusIcon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SelectField } from '../components/ui/Field'
import { Spinner } from '../components/ui/Spinner'
import { useAsignaturas } from '../hooks/useAsignaturas'
import { useExamenes } from '../hooks/useExamenes'
import { diaKey, diaLocal, hoyKey } from '../lib/fechas'
import { getErrorMessage } from '../services/api'
import { deleteExamen } from '../services/examenesService'
import type { ExamenConResumen } from '../types/api'

type Vista = 'lista' | 'calendario'
type Filtro = 'proximos' | 'pasados'

const VISTA_KEY = 'examenes:vista'

function leerVista(): Vista {
  try {
    return localStorage.getItem(VISTA_KEY) === 'calendario' ? 'calendario' : 'lista'
  } catch {
    return 'lista'
  }
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex self-start rounded-xl bg-slate-200/70 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={[
            'min-h-9 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors',
            value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Agrupa por mes ("octubre de 2026") manteniendo el orden. */
function porMes(examenes: ExamenConResumen[]) {
  const grupos: { mes: string; examenes: ExamenConResumen[] }[] = []
  for (const examen of examenes) {
    const mes = format(diaLocal(examen.fecha), "MMMM 'de' yyyy", { locale: es })
    const ultimo = grupos.at(-1)
    if (ultimo?.mes === mes) ultimo.examenes.push(examen)
    else grupos.push({ mes, examenes: [examen] })
  }
  return grupos
}

export function ExamenesPage() {
  const { examenes, status, error, reload, upsert, remove } = useExamenes()
  const { asignaturas, status: asignaturasStatus } = useAsignaturas('false')

  const [vista, setVistaState] = useState<Vista>(leerVista)
  const [filtro, setFiltro] = useState<Filtro>('proximos')
  const [asignaturaFiltro, setAsignaturaFiltro] = useState('')
  const [mes, setMes] = useState(() => new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(hoyKey)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExamenConResumen | null>(null)
  const [fechaInicial, setFechaInicial] = useState<string | undefined>()
  const [viendoId, setViendoId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ExamenConResumen | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const setVista = (next: Vista) => {
    setVistaState(next)
    try {
      localStorage.setItem(VISTA_KEY, next)
    } catch {
      // Sin almacenamiento (modo privado): la vista no se recuerda.
    }
  }

  const hoy = hoyKey()
  const filtrados = useMemo(
    () => (asignaturaFiltro ? examenes.filter((e) => e.asignaturaId === asignaturaFiltro) : examenes),
    [examenes, asignaturaFiltro],
  )
  const proximos = filtrados.filter((e) => diaKey(e.fecha) >= hoy)
  // Pasados: el más reciente primero.
  const pasados = filtrados.filter((e) => diaKey(e.fecha) < hoy).reverse()
  const visibles = filtro === 'proximos' ? proximos : pasados

  // Asignaturas que tienen exámenes (incluidas archivadas), para el filtro.
  const asignaturasConExamen = useMemo(() => {
    const vistas = new Map<string, string>()
    for (const e of examenes) if (e.asignatura) vistas.set(e.asignaturaId, e.asignatura.nombre)
    return [...vistas].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [examenes])

  const eventos = useMemo(() => {
    const mapa = new Map<string, CalendarEvent[]>()
    for (const e of filtrados) {
      const key = diaKey(e.fecha)
      const lista = mapa.get(key) ?? []
      lista.push({ id: e._id, color: e.asignatura?.color ?? '#475569', label: e.asignatura?.nombre ?? nombreExamen(e) })
      mapa.set(key, lista)
    }
    return mapa
  }, [filtrados])

  const delDia = filtrados.filter((e) => diaKey(e.fecha) === diaSeleccionado)
  const viendo = viendoId ? (examenes.find((e) => e._id === viendoId) ?? null) : null

  const openCreate = (fecha?: string) => {
    setEditing(null)
    setFechaInicial(fecha)
    setFormOpen(true)
  }

  const openEdit = (examen: ExamenConResumen) => {
    setViendoId(null)
    setEditing(examen)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteError('')
    setDeleteLoading(true)
    try {
      await deleteExamen(deleting._id)
      remove(deleting._id)
      toast.success('Examen eliminado')
      setDeleting(null)
      setViendoId(null)
    } catch (err) {
      setDeleteError(getErrorMessage(err))
    } finally {
      setDeleteLoading(false)
    }
  }

  const sinAsignaturas = asignaturasStatus === 'ready' && asignaturas.length === 0
  const loading = status === 'loading' || asignaturasStatus === 'loading'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Vista"
          value={vista}
          onChange={setVista}
          options={[
            { value: 'lista', label: 'Lista' },
            { value: 'calendario', label: 'Calendario' },
          ]}
        />
        <Button onClick={() => openCreate(vista === 'calendario' ? diaSeleccionado : undefined)} disabled={sinAsignaturas}>
          <PlusIcon className="size-5" />
          Nuevo examen
        </Button>
      </div>

      {loading && (
        <div className="grid min-h-[30vh] place-items-center text-slate-400">
          <Spinner />
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
          <p className="text-rose-700">{error}</p>
          <Button variant="secondary" onClick={reload} className="mt-3">
            Reintentar
          </Button>
        </div>
      )}

      {!loading && status === 'ready' && examenes.length === 0 && (
        <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-slate-300 p-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              {sinAsignaturas ? <BookIcon className="size-7" /> : <CalendarIcon className="size-7" />}
            </div>
            {sinAsignaturas ? (
              <>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">Primero, tus asignaturas</h2>
                <p className="mt-1.5 text-slate-600">
                  Cada examen pertenece a una asignatura. Añade las de este cuatrimestre y vuelve aquí.
                </p>
                <Link
                  to="/asignaturas"
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  <BookIcon className="size-5" />
                  Ir a Asignaturas
                </Link>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">Aún no hay exámenes</h2>
                <p className="mt-1.5 text-slate-600">
                  Apunta la fecha de cada examen y qué temas entran. Luego podrás generar un plan de estudio.
                </p>
                <Button onClick={() => openCreate()} className="mt-5">
                  <PlusIcon className="size-5" />
                  Añadir examen
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {!loading && status === 'ready' && examenes.length > 0 && (
        <>
          {asignaturasConExamen.length > 1 && (
            <SelectField
              label="Asignatura"
              value={asignaturaFiltro}
              onChange={(e) => setAsignaturaFiltro(e.target.value)}
              wrapperClassName="sm:max-w-xs"
            >
              <option value="">Todas las asignaturas</option>
              {asignaturasConExamen.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </SelectField>
          )}

          {vista === 'lista' ? (
            <div className="flex flex-col gap-4">
              <Segmented
                label="Qué exámenes mostrar"
                value={filtro}
                onChange={setFiltro}
                options={[
                  { value: 'proximos', label: `Próximos (${proximos.length})` },
                  { value: 'pasados', label: `Pasados (${pasados.length})` },
                ]}
              />
              {visibles.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  {filtro === 'proximos' ? 'No tienes exámenes próximos. ¡A disfrutar!' : 'No hay exámenes pasados.'}
                </p>
              ) : (
                porMes(visibles).map((grupo) => (
                  <section key={grupo.mes} aria-label={grupo.mes} className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">{grupo.mes}</h3>
                    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                      {grupo.examenes.map((examen) => (
                        <ExamenCard key={examen._id} examen={examen} onOpen={() => setViendoId(examen._id)} />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
              <MonthCalendar
                mes={mes}
                onMesChange={setMes}
                selected={diaSeleccionado}
                onSelect={(key) => {
                  setDiaSeleccionado(key)
                  // Tocar un día del mes anterior/siguiente cambia de mes.
                  setMes(diaLocal(key))
                }}
                eventos={eventos}
                nombreEvento={['examen', 'exámenes']}
              />
              <section aria-labelledby="dia-seleccionado" className="flex flex-col gap-3">
                <h3 id="dia-seleccionado" className="font-semibold text-slate-900 first-letter:uppercase">
                  {format(diaLocal(diaSeleccionado), "EEEE d 'de' MMMM", { locale: es })}
                </h3>
                {delDia.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay exámenes este día.</p>
                ) : (
                  delDia.map((examen) => (
                    <ExamenCard key={examen._id} examen={examen} onOpen={() => setViendoId(examen._id)} />
                  ))
                )}
                {!sinAsignaturas && (
                  <Button variant="secondary" onClick={() => openCreate(diaSeleccionado)}>
                    <PlusIcon className="size-5" />
                    Añadir examen este día
                  </Button>
                )}
              </section>
            </div>
          )}
        </>
      )}

      <ExamenFormModal
        open={formOpen}
        examen={editing}
        fechaInicial={fechaInicial}
        asignaturas={asignaturas}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          upsert(saved)
          setFormOpen(false)
          // Al crear desde la lista, se muestra donde ha caído.
          if (vista === 'calendario') {
            setDiaSeleccionado(diaKey(saved.fecha))
            setMes(diaLocal(saved.fecha))
          } else {
            setFiltro(diaKey(saved.fecha) >= hoy ? 'proximos' : 'pasados')
          }
        }}
      />

      <ExamenDetalleModal
        examen={viendo}
        onClose={() => setViendoId(null)}
        onEdit={openEdit}
        onDelete={setDeleting}
        onChange={upsert}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar examen"
        message={
          <p>
            Se eliminará <strong className="text-slate-900">{deleting ? nombreExamen(deleting, deleting.asignatura?.nombre) : ''}</strong>{' '}
            y su plan de estudio, si tiene. Los temas de la asignatura no se tocan.
          </p>
        }
        confirmLabel="Eliminar"
        loading={deleteLoading}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleting(null)
          setDeleteError('')
        }}
      />
    </div>
  )
}

import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAsignaturas } from '../../hooks/useAsignaturas'
import type { GridEntry } from '../../lib/horario'
import { CameraIcon, TableIcon } from '../icons'
import { Spinner } from '../ui/Spinner'
import { TimetableGrid } from './TimetableGrid'

/** Horario semanal (solo lectura) para la página de inicio. */
export function HorarioWidget() {
  const { asignaturas, status } = useAsignaturas('false')
  const navigate = useNavigate()

  const entries = useMemo<GridEntry[]>(
    () =>
      asignaturas.flatMap((a) =>
        a.horarios.map((h, i) => ({ id: `${a._id}-${i}`, ...h, titulo: a.nombre, detalle: h.aula, color: a.color })),
      ),
    [asignaturas],
  )

  return (
    <section aria-labelledby="tu-horario" className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="tu-horario" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Tu horario
        </h3>
        {entries.length > 0 && (
          <Link to="/horario" className="text-sm font-semibold text-brand-700 hover:underline">
            Editar
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-3">
        {status === 'loading' && (
          <div className="grid h-48 place-items-center text-slate-400">
            <Spinner />
          </div>
        )}
        {status === 'error' && <p className="p-4 text-sm text-slate-500">No se pudo cargar el horario.</p>}
        {status === 'ready' && entries.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <TableIcon className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Aún no has añadido tu horario</p>
              <p className="mt-1 text-sm text-slate-600">Escanea una foto de tu horario o créalo tocando los huecos de la tabla.</p>
            </div>
            <Link
              to="/horario"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <CameraIcon className="size-5" />
              Crear mi horario
            </Link>
          </div>
        )}
        {status === 'ready' && entries.length > 0 && (
          <TimetableGrid entries={entries} hourHeight={36} compact highlightToday onEntryClick={() => navigate('/horario')} />
        )}
      </div>
    </section>
  )
}

import { useState } from 'react'
import { toast } from 'sonner'
import { AsignaturaCard } from '../components/asignaturas/AsignaturaCard'
import { AsignaturaFormModal } from '../components/asignaturas/AsignaturaFormModal'
import { Link } from 'react-router'
import { BookIcon, PlusIcon, TableIcon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useAsignaturas } from '../hooks/useAsignaturas'
import { getErrorMessage } from '../services/api'
import { archivarAsignatura, deleteAsignatura, type FiltroArchivadas } from '../services/asignaturasService'
import type { Asignatura } from '../types/models'

const TABS: { value: FiltroArchivadas; label: string }[] = [
  { value: 'false', label: 'Activas' },
  { value: 'true', label: 'Archivadas' },
]

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-superficie p-5">
      <div className="h-5 w-2/3 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-1/3 rounded bg-slate-100" />
      <div className="mt-6 h-2 rounded bg-slate-100" />
    </div>
  )
}

export function AsignaturasPage() {
  const [filtro, setFiltro] = useState<FiltroArchivadas>('false')
  const { asignaturas, status, error, reload, upsert, remove, updateResumen } = useAsignaturas(filtro)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Asignatura | null>(null)
  const [deleting, setDeleting] = useState<Asignatura | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (asignatura: Asignatura) => {
    setEditing(asignatura)
    setFormOpen(true)
  }

  const toggleArchivada = async (asignatura: Asignatura) => {
    try {
      const actualizada = await archivarAsignatura(asignatura._id, !asignatura.archivada)
      upsert(actualizada)
      toast.success(actualizada.archivada ? `«${actualizada.nombre}» archivada` : `«${actualizada.nombre}» recuperada`, {
        action: {
          label: 'Deshacer',
          onClick: () => {
            archivarAsignatura(asignatura._id, asignatura.archivada)
              .then(upsert)
              .catch((err) => toast.error(getErrorMessage(err)))
          },
        },
      })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteError('')
    setDeleteLoading(true)
    try {
      await deleteAsignatura(deleting._id)
      remove(deleting._id)
      toast.success('Asignatura eliminada')
      setDeleting(null)
    } catch (err) {
      setDeleteError(getErrorMessage(err))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filtrar asignaturas" className="inline-flex rounded-xl bg-slate-200/70 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={filtro === tab.value}
              onClick={() => setFiltro(tab.value)}
              className={[
                'min-h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors',
                filtro === tab.value ? 'bg-superficie text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {filtro === 'false' && (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/horario"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-superficie px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <TableIcon className="size-5" />
              Horario semanal
            </Link>
            <Button onClick={openCreate}>
              <PlusIcon className="size-5" />
              Nueva asignatura
            </Button>
          </div>
        )}
      </div>

      {status === 'loading' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
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

      {status === 'ready' && asignaturas.length === 0 && (
        <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-slate-300 p-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <BookIcon className="size-7" />
            </div>
            {filtro === 'false' ? (
              <>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">Aún no tienes asignaturas</h2>
                <p className="mt-1.5 text-slate-600">
                  Empieza añadiendo las asignaturas de este cuatrimestre con su horario y temario.
                </p>
                <Button onClick={openCreate} className="mt-5">
                  <PlusIcon className="size-5" />
                  Añadir asignatura
                </Button>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">No hay asignaturas archivadas</h2>
                <p className="mt-1.5 text-slate-600">
                  Archiva las asignaturas que ya hayas aprobado para quitarlas de en medio sin perder nada.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {status === 'ready' && asignaturas.length > 0 && (
        // 1 columna en móvil/tablet, 2 en escritorio, 3 en pantallas grandes.
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {asignaturas.map((asignatura) => (
            <AsignaturaCard
              key={asignatura._id}
              asignatura={asignatura}
              onEdit={() => openEdit(asignatura)}
              onToggleArchivada={() => toggleArchivada(asignatura)}
              onDelete={() => setDeleting(asignatura)}
              onResumenChange={(resumen) => updateResumen(asignatura._id, resumen)}
            />
          ))}
        </div>
      )}

      <AsignaturaFormModal
        open={formOpen}
        asignatura={editing}
        otras={filtro === 'false' ? asignaturas.filter((a) => a._id !== editing?._id) : []}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          upsert(saved)
          setFormOpen(false)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar asignatura"
        message={
          <div className="flex flex-col gap-2">
            <p>
              Se eliminará <strong className="text-slate-900">{deleting?.nombre}</strong> junto con sus temas, exámenes
              y planes de estudio. Esta acción no se puede deshacer.
            </p>
            <p className="text-sm">Si ya la has terminado, puedes archivarla en lugar de eliminarla.</p>
          </div>
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

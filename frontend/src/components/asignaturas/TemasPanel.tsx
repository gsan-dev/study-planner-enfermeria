import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { temaFormSchema, type TemaFormValues } from '../../schemas/tema'
import { validateForm, type FieldErrors } from '../../schemas/validation'
import { getErrorMessage } from '../../services/api'
import { createTema, deleteTema, listTemas, marcarTemaEstudiado } from '../../services/asignaturasService'
import type { ResumenTemas, Tema } from '../../types/models'
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon } from '../icons'
import { Button, IconButton } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Spinner } from '../ui/Spinner'
import { emptyTema, formatHoras } from './constants'
import { TemaFields } from './TemaFields'
import { TemaFormModal } from './TemaFormModal'

interface TemasPanelProps {
  asignaturaId: string
  color: string
  /** Solo lectura (asignaturas archivadas). */
  readOnly?: boolean
  onResumenChange: (resumen: ResumenTemas) => void
}

function resumir(temas: Tema[]): ResumenTemas {
  return {
    total: temas.length,
    estudiados: temas.filter((t) => t.estudiado).length,
    horasEstimadas: temas.reduce((sum, t) => sum + t.horasEstimadas, 0),
  }
}

function DificultadDots({ nivel }: { nivel: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Dificultad ${nivel} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`size-1.5 rounded-full ${i <= nivel ? 'bg-slate-500' : 'bg-slate-200'}`} />
      ))}
    </span>
  )
}

export function TemasPanel({ asignaturaId, color, readOnly = false, onResumenChange }: TemasPanelProps) {
  const [temas, setTemas] = useState<Tema[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [nuevo, setNuevo] = useState<TemaFormValues>(emptyTema)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Tema | null>(null)
  const [deleting, setDeleting] = useState<Tema | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const nombreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    listTemas(asignaturaId, controller.signal)
      .then(setTemas)
      .catch((err) => {
        if (!controller.signal.aborted) setLoadError(getErrorMessage(err))
      })
    return () => controller.abort()
  }, [asignaturaId])

  const commit = (next: Tema[]) => {
    setTemas(next)
    onResumenChange(resumir(next))
  }

  const onAdd = async (event: FormEvent) => {
    event.preventDefault()
    const result = validateForm(temaFormSchema, nuevo)
    if (result.errors) return setErrors(result.errors)
    setErrors({})
    setAdding(true)
    try {
      const tema = await createTema(asignaturaId, result.data)
      commit([...(temas ?? []), tema])
      // Mantiene dificultad y horas: al meter un temario suelen repetirse.
      setNuevo({ ...nuevo, nombre: '' })
      nombreRef.current?.querySelector('input')?.focus()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setAdding(false)
    }
  }

  const toggleEstudiado = async (tema: Tema) => {
    if (!temas) return
    const optimista = temas.map((t) => (t._id === tema._id ? { ...t, estudiado: !t.estudiado } : t))
    commit(optimista)
    try {
      const actualizado = await marcarTemaEstudiado(tema._id, !tema.estudiado)
      commit(optimista.map((t) => (t._id === tema._id ? actualizado : t)))
    } catch (error) {
      commit(temas)
      toast.error(getErrorMessage(error))
    }
  }

  const confirmDelete = async () => {
    if (!deleting || !temas) return
    setDeleteError('')
    setDeleteLoading(true)
    try {
      await deleteTema(deleting._id)
      commit(temas.filter((t) => t._id !== deleting._id))
      toast.success('Tema eliminado')
      setDeleting(null)
    } catch (error) {
      setDeleteError(getErrorMessage(error))
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loadError) return <p className="py-4 text-sm text-rose-600">{loadError}</p>
  if (!temas) {
    return (
      <div className="flex justify-center py-6 text-slate-400">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {temas.length === 0 ? (
        <p className="py-2 text-sm text-slate-500">
          {readOnly ? 'Esta asignatura no tiene temas.' : 'Aún no hay temas. Añade el primero abajo.'}
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {temas.map((tema) => (
            <li key={tema._id} className="flex items-center gap-1 rounded-xl px-1 hover:bg-slate-50">
              <button
                type="button"
                role="checkbox"
                aria-checked={tema.estudiado}
                aria-label={`${tema.nombre}: ${tema.estudiado ? 'estudiado' : 'pendiente'}`}
                disabled={readOnly}
                onClick={() => toggleEstudiado(tema)}
                className="grid size-11 shrink-0 cursor-pointer place-items-center disabled:cursor-default"
              >
                <span
                  className={[
                    'grid size-6 place-items-center rounded-lg border-2 text-white transition-colors',
                    tema.estudiado ? 'border-transparent' : 'border-slate-300 bg-white',
                  ].join(' ')}
                  style={tema.estudiado ? { backgroundColor: color } : undefined}
                >
                  {tema.estudiado && <CheckIcon className="size-4" strokeWidth={3} />}
                </span>
              </button>
              <div className="min-w-0 flex-1 py-2">
                <p className={`truncate ${tema.estudiado ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{tema.nombre}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <DificultadDots nivel={tema.dificultad} />
                  <span>{formatHoras(tema.horasEstimadas)}</span>
                </p>
              </div>
              {!readOnly && (
                <>
                  <IconButton label={`Editar ${tema.nombre}`} onClick={() => setEditing(tema)}>
                    <PencilIcon className="size-4.5" />
                  </IconButton>
                  <IconButton label={`Eliminar ${tema.nombre}`} tone="danger" onClick={() => setDeleting(tema)}>
                    <TrashIcon className="size-4.5" />
                  </IconButton>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <form onSubmit={onAdd} noValidate className="rounded-xl border border-dashed border-slate-300 p-3">
          <div ref={nombreRef}>
            <TemaFields values={nuevo} errors={errors} onChange={setNuevo} layout="inline" />
          </div>
          <Button type="submit" variant="secondary" loading={adding} className="mt-3 w-full sm:w-auto">
            <PlusIcon className="size-4" />
            Añadir tema
          </Button>
        </form>
      )}

      <TemaFormModal
        tema={editing}
        onClose={() => setEditing(null)}
        onSaved={(actualizado) => {
          commit(temas.map((t) => (t._id === actualizado._id ? actualizado : t)))
          setEditing(null)
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar tema"
        message={
          <>
            ¿Seguro que quieres eliminar <strong className="text-slate-900">{deleting?.nombre}</strong>? También se
            quitará de los exámenes y planes de estudio donde aparezca.
          </>
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

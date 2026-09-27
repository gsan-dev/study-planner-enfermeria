import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cuentaAtras, diaLocal, diasHasta } from '../../lib/fechas'
import { getErrorMessage } from '../../services/api'
import { marcarTemaEstudiado } from '../../services/asignaturasService'
import { getExamenDetalles, setTemasExamen } from '../../services/examenesService'
import type { ExamenConResumen, ExamenDetalles } from '../../types/api'
import type { Tema } from '../../types/models'
import { CheckIcon, PencilIcon, TrashIcon } from '../icons'
import { Button } from '../ui/Button'
import { FormError } from '../ui/FormError'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { labelTipo, nombreExamen, urgencia } from './constants'
import { TemasSelector } from './TemasSelector'

interface ExamenDetalleModalProps {
  examen: ExamenConResumen | null
  onClose: () => void
  onEdit: (examen: ExamenConResumen) => void
  onDelete: (examen: ExamenConResumen) => void
  /** El examen cambió (temas o temas estudiados). */
  onChange: (examen: ExamenConResumen) => void
}

export function ExamenDetalleModal({ examen, onClose, ...props }: ExamenDetalleModalProps) {
  return (
    <Modal open={examen !== null} onClose={onClose} title="Examen" size="lg">
      {examen && <Detalle key={examen._id} examen={examen} onClose={onClose} {...props} />}
    </Modal>
  )
}

function Detalle({ examen, onEdit, onDelete, onChange }: ExamenDetalleModalProps & { examen: ExamenConResumen }) {
  const [detalles, setDetalles] = useState<ExamenDetalles | null>(null)
  const [loadError, setLoadError] = useState('')
  const [eligiendo, setEligiendo] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getExamenDetalles(examen._id, controller.signal)
      .then(setDetalles)
      .catch((err) => {
        if (!controller.signal.aborted) setLoadError(getErrorMessage(err))
      })
    return () => controller.abort()
  }, [examen._id])

  const dias = diasHasta(examen.fecha)
  const color = examen.asignatura?.color ?? '#475569'
  const readOnly = examen.asignatura?.archivada ?? true

  /** Recalcula el resumen del examen con los temas actuales y avisa a la página. */
  const actualizar = (next: ExamenDetalles) => {
    const actualizado: ExamenConResumen = {
      ...next.examen,
      resumenTemas: { total: next.temas.length, estudiados: next.temas.filter((t) => t.estudiado).length },
    }
    setDetalles({ ...next, examen: actualizado })
    onChange(actualizado)
  }

  const toggleEstudiado = async (tema: Tema) => {
    if (!detalles) return
    const cambiar = (t: Tema, estudiado: boolean) => (t._id === tema._id ? { ...t, estudiado } : t)
    const previo = detalles
    actualizar({
      ...detalles,
      temas: detalles.temas.map((t) => cambiar(t, !tema.estudiado)),
      temario: detalles.temario.map((t) => cambiar(t, !tema.estudiado)),
    })
    try {
      await marcarTemaEstudiado(tema._id, !tema.estudiado)
    } catch (err) {
      actualizar(previo)
      toast.error(getErrorMessage(err))
    }
  }

  const guardarTemas = async () => {
    if (!detalles || !eligiendo) return
    setSaving(true)
    setSaveError('')
    try {
      const guardado = await setTemasExamen(examen._id, eligiendo)
      const incluidos = new Set(guardado.temas)
      actualizar({ ...detalles, examen: guardado, temas: detalles.temario.filter((t) => incluidos.has(t._id)) })
      setEligiendo(null)
      toast.success('Temas del examen actualizados')
    } catch (err) {
      setSaveError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-4">
        <div className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-600">{examen.asignatura?.nombre ?? 'Asignatura eliminada'}</p>
          <h3 className="text-xl font-semibold text-slate-900">{nombreExamen(examen, examen.asignatura?.nombre)}</h3>
          <p className="mt-1 text-slate-700 first-letter:uppercase">
            {format(diaLocal(examen.fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
            {examen.hora && ` · ${examen.hora}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
            <span className={`rounded-full px-2 py-0.5 ${urgencia(dias)}`}>{cuentaAtras(dias)}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{labelTipo(examen.tipo)}</span>
            {examen.aula && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">Aula {examen.aula}</span>}
            {examen.peso != null && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{examen.peso}% de la nota</span>
            )}
          </div>
        </div>
      </div>

      {examen.notas && <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm whitespace-pre-line text-slate-700">{examen.notas}</p>}

      <section aria-labelledby="temas-examen" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 id="temas-examen" className="font-semibold text-slate-900">
              Temas que entran
            </h4>
            {detalles && detalles.temas.length > 0 && (
              <p className="text-sm text-slate-500">
                {detalles.examen.resumenTemas.estudiados} de {detalles.temas.length} estudiados
              </p>
            )}
          </div>
          {detalles && !readOnly && !eligiendo && (
            <button
              type="button"
              onClick={() => setEligiendo(detalles.temas.map((t) => t._id))}
              className="min-h-9 shrink-0 cursor-pointer rounded-lg px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              Cambiar temas
            </button>
          )}
        </div>

        {loadError && <p className="text-sm text-rose-600">{loadError}</p>}
        {!detalles && !loadError && (
          <div className="flex justify-center py-6 text-slate-400">
            <Spinner />
          </div>
        )}

        {detalles && eligiendo && (
          <div className="flex flex-col gap-3">
            <TemasSelector
              asignaturaId={examen.asignaturaId}
              temario={detalles.temario}
              selected={eligiendo}
              onChange={setEligiendo}
              onTemaCreado={(tema) => {
                setDetalles({ ...detalles, temario: [...detalles.temario, tema] })
                setEligiendo([...eligiendo, tema._id])
              }}
              color={color}
            />
            <FormError message={saveError} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setEligiendo(null)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={guardarTemas} loading={saving}>
                Guardar temas
              </Button>
            </div>
          </div>
        )}

        {detalles && !eligiendo && detalles.temas.length === 0 && (
          <p className="text-sm text-slate-500">
            {detalles.temario.length === 0
              ? 'La asignatura aún no tiene temas.'
              : 'No has indicado qué temas entran.'}
          </p>
        )}

        {detalles && !eligiendo && detalles.temas.length > 0 && (
          <ul className="-mx-2 flex flex-col">
            {detalles.temas.map((tema) => (
              <li key={tema._id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={tema.estudiado}
                  disabled={readOnly}
                  onClick={() => toggleEstudiado(tema)}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left hover:bg-slate-50 disabled:cursor-default"
                >
                  <span
                    className={[
                      'grid size-6 shrink-0 place-items-center rounded-lg border-2 text-white transition-colors',
                      tema.estudiado ? 'border-transparent' : 'border-slate-300 bg-white',
                    ].join(' ')}
                    style={tema.estudiado ? { backgroundColor: color } : undefined}
                  >
                    {tema.estudiado && <CheckIcon className="size-4" strokeWidth={3} />}
                  </span>
                  <span className={tema.estudiado ? 'text-slate-400 line-through' : 'text-slate-800'}>{tema.nombre}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={() => onDelete(examen)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
          <TrashIcon className="size-5" />
          Eliminar
        </Button>
        <Button variant="secondary" onClick={() => onEdit(examen)}>
          <PencilIcon className="size-5" />
          Editar examen
        </Button>
      </div>
    </div>
  )
}

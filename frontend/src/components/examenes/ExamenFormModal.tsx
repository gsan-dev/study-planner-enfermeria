import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { examenFormSchema, type ExamenFormValues } from '../../schemas/examen'
import { validateForm, type FieldErrors } from '../../schemas/validation'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { listTemas } from '../../services/asignaturasService'
import { createExamen, updateExamen } from '../../services/examenesService'
import type { ExamenConResumen } from '../../types/api'
import type { Asignatura, Tema } from '../../types/models'
import { diaKey } from '../../lib/fechas'
import { Button } from '../ui/Button'
import { inputClass, SelectField, TextField } from '../ui/Field'
import { FormError } from '../ui/FormError'
import { Modal } from '../ui/Modal'
import { TIPOS_EXAMEN } from './constants'
import { TemasSelector } from './TemasSelector'

interface ExamenFormModalProps {
  open: boolean
  /** Si viene, se edita; si no, se crea uno nuevo. */
  examen?: ExamenConResumen | null
  /** Fecha propuesta al crear desde el calendario (YYYY-MM-DD). */
  fechaInicial?: string
  /** Asignaturas activas entre las que elegir. */
  asignaturas: Asignatura[]
  onClose: () => void
  onSaved: (examen: ExamenConResumen) => void
}

function initialValues(examen: ExamenConResumen | null | undefined, fechaInicial: string | undefined, asignaturas: Asignatura[]): ExamenFormValues {
  return {
    asignaturaId: examen?.asignaturaId ?? (asignaturas.length === 1 ? asignaturas[0]._id : ''),
    tipo: examen?.tipo ?? 'parcial',
    titulo: examen?.titulo ?? '',
    fecha: examen ? diaKey(examen.fecha) : (fechaInicial ?? ''),
    hora: examen?.hora ?? '',
    peso: examen?.peso != null ? String(examen.peso) : '',
    aula: examen?.aula ?? '',
    notas: examen?.notas ?? '',
    temas: examen?.temas ?? [],
  }
}

export function ExamenFormModal({ open, examen, ...props }: ExamenFormModalProps) {
  return (
    <Modal open={open} onClose={props.onClose} title={examen ? 'Editar examen' : 'Nuevo examen'} size="lg">
      {/* Se monta al abrir: arranca siempre con los valores actuales. */}
      {open && <ExamenForm examen={examen} {...props} />}
    </Modal>
  )
}

function ExamenForm({ examen, fechaInicial, asignaturas, onClose, onSaved }: Omit<ExamenFormModalProps, 'open'>) {
  const [values, setValues] = useState<ExamenFormValues>(() => initialValues(examen, fechaInicial, asignaturas))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [temario, setTemario] = useState<{ asignaturaId: string; temas: Tema[] } | null>(null)
  // Al crear, o al cambiar de asignatura, se proponen todos sus temas.
  const proponerTodos = useRef(!examen)
  const notasId = useId()

  const { asignaturaId } = values
  useEffect(() => {
    if (!asignaturaId) return
    const controller = new AbortController()
    listTemas(asignaturaId, controller.signal)
      .then((temas) => {
        setTemario({ asignaturaId, temas })
        if (proponerTodos.current) {
          proponerTodos.current = false
          setValues((v) => ({ ...v, temas: temas.map((t) => t._id) }))
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setErrors((e) => ({ ...e, temas: getErrorMessage(err) }))
      })
    return () => controller.abort()
  }, [asignaturaId])

  // Un examen de una asignatura archivada se puede editar: se añade a las opciones.
  const opciones =
    examen?.asignatura && !asignaturas.some((a) => a._id === examen.asignaturaId)
      ? [...asignaturas, { _id: examen.asignaturaId, nombre: `${examen.asignatura.nombre} (archivada)`, color: examen.asignatura.color }]
      : asignaturas
  const asignatura = opciones.find((a) => a._id === asignaturaId)

  const set = <K extends keyof ExamenFormValues>(key: K, value: ExamenFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors(({ [key]: _omit, ...rest }) => rest)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = validateForm(examenFormSchema, values)
    if (result.errors) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setFormError('')
    setSaving(true)
    try {
      const saved = examen ? await updateExamen(examen._id, result.data) : await createExamen(result.data)
      toast.success(examen ? 'Examen actualizado' : 'Examen añadido')
      onSaved(saved)
    } catch (error) {
      setErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <SelectField
        label="Asignatura"
        required
        value={asignaturaId}
        onChange={(e) => {
          proponerTodos.current = true
          setTemario(null)
          setValues((v) => ({ ...v, asignaturaId: e.target.value, temas: [] }))
          setErrors(({ asignaturaId: _a, temas: _t, ...rest }) => rest)
        }}
        error={errors.asignaturaId}
      >
        <option value="" disabled>
          Elige una asignatura…
        </option>
        {opciones.map((a) => (
          <option key={a._id} value={a._id}>
            {a.nombre}
          </option>
        ))}
      </SelectField>

      <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
        <SelectField label="Tipo" value={values.tipo} onChange={(e) => set('tipo', e.target.value as ExamenFormValues['tipo'])}>
          {TIPOS_EXAMEN.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Título"
          placeholder="Opcional. Ej. Primer parcial"
          autoComplete="off"
          value={values.titulo}
          onChange={(e) => set('titulo', e.target.value)}
          error={errors.titulo}
        />
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-[1fr_8rem_1fr]">
        <TextField
          label="Fecha"
          type="date"
          required
          min="2000-01-01"
          max="2100-12-31"
          value={values.fecha}
          onChange={(e) => set('fecha', e.target.value)}
          error={errors.fecha}
          wrapperClassName="col-span-2 sm:col-span-1"
        />
        <TextField label="Hora" type="time" value={values.hora} onChange={(e) => set('hora', e.target.value)} error={errors.hora} />
        <TextField
          label="Aula"
          placeholder="Opcional"
          autoComplete="off"
          value={values.aula}
          onChange={(e) => set('aula', e.target.value)}
          error={errors.aula}
        />
      </div>

      <TextField
        label="Peso en la nota final (%)"
        inputMode="decimal"
        placeholder="Opcional. Ej. 40"
        value={values.peso}
        onChange={(e) => set('peso', e.target.value)}
        error={errors.peso}
        wrapperClassName="sm:max-w-56"
      />

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Temas que entran</legend>
        {asignaturaId ? (
          <TemasSelector
            asignaturaId={asignaturaId}
            temario={temario?.asignaturaId === asignaturaId ? temario.temas : null}
            selected={values.temas}
            onChange={(temas) => set('temas', temas)}
            onTemaCreado={(tema) => {
              setTemario((t) => (t ? { ...t, temas: [...t.temas, tema] } : t))
              setValues((v) => ({ ...v, temas: [...v.temas, tema._id] }))
            }}
            color={asignatura?.color ?? '#0d9488'}
            error={errors.temas}
          />
        ) : (
          <p className="text-sm text-slate-500">Elige primero la asignatura para ver su temario.</p>
        )}
      </fieldset>

      <div>
        <label htmlFor={notasId} className="mb-1.5 block text-sm font-medium text-slate-700">
          Notas
        </label>
        <textarea
          id={notasId}
          rows={3}
          maxLength={1000}
          placeholder="Opcional. Ej. Traer calculadora, entra el tema 3 solo hasta el apartado 2…"
          value={values.notas}
          onChange={(e) => set('notas', e.target.value)}
          className={`${inputClass} border-slate-300 py-2.5 focus:border-brand-600`}
        />
        {errors.notas && <p className="mt-1.5 text-sm text-rose-600">{errors.notas}</p>}
      </div>

      <FormError message={formError} />

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {examen ? 'Guardar cambios' : 'Añadir examen'}
        </Button>
      </div>
    </form>
  )
}

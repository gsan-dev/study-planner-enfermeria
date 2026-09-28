import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { asignaturaFormSchema, type AsignaturaFormValues } from '../../schemas/asignatura'
import { validateForm, type FieldErrors } from '../../schemas/validation'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { createAsignatura, updateAsignatura } from '../../services/asignaturasService'
import type { Asignatura, Horario } from '../../types/models'
import { HorarioAsignaturaEditor } from '../horario/HorarioAsignaturaEditor'
import { CheckIcon } from '../icons'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Field'
import { FormError } from '../ui/FormError'
import { Modal } from '../ui/Modal'
import { COLORES, ordenarHorarios } from './constants'

interface AsignaturaFormModalProps {
  open: boolean
  /** Si viene, se edita; si no, se crea una nueva. */
  asignatura?: Asignatura | null
  onClose: () => void
  onSaved: (asignatura: Asignatura) => void
  /** Resto de asignaturas activas, para ver sus clases como referencia en la tabla. */
  otras: Asignatura[]
}

function initialValues(asignatura?: Asignatura | null): AsignaturaFormValues {
  return {
    nombre: asignatura?.nombre ?? '',
    profesor: asignatura?.profesor ?? '',
    creditos: asignatura?.creditos != null ? String(asignatura.creditos) : '',
    color: asignatura?.color ?? COLORES[0].value,
    horarios: ordenarHorarios(asignatura?.horarios ?? []),
  }
}

export function AsignaturaFormModal({ open, asignatura, onClose, onSaved, otras }: AsignaturaFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={asignatura ? 'Editar asignatura' : 'Nueva asignatura'} size="lg">
      {/* El formulario se monta al abrir: arranca siempre con los valores actuales. */}
      <AsignaturaForm asignatura={asignatura} onClose={onClose} onSaved={onSaved} otras={otras} />
    </Modal>
  )
}

function AsignaturaForm({ asignatura, onClose, onSaved, otras }: Omit<AsignaturaFormModalProps, 'open'>) {
  const [values, setValues] = useState<AsignaturaFormValues>(() => initialValues(asignatura))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = validateForm(asignaturaFormSchema, values)
    if (result.errors) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setFormError('')
    setSaving(true)
    try {
      const saved = asignatura
        ? await updateAsignatura(asignatura._id, result.data)
        : await createAsignatura(result.data)
      toast.success(asignatura ? 'Asignatura actualizada' : 'Asignatura creada')
      onSaved(saved)
    } catch (error) {
      setErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField
        label="Nombre"
        required
        autoFocus={!asignatura}
        placeholder="Ej. Anatomía humana"
        value={values.nombre}
        onChange={(e) => setValues({ ...values, nombre: e.target.value })}
        error={errors.nombre}
      />

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <TextField
          label="Profesor/a"
          placeholder="Opcional"
          autoComplete="off"
          value={values.profesor}
          onChange={(e) => setValues({ ...values, profesor: e.target.value })}
          error={errors.profesor}
        />
        <TextField
          label="Créditos"
          inputMode="decimal"
          placeholder="Ej. 6"
          value={values.creditos}
          onChange={(e) => setValues({ ...values, creditos: e.target.value })}
          error={errors.creditos}
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Color</legend>
        <div role="radiogroup" aria-label="Color de la asignatura" className="-mx-1 flex flex-wrap">
          {COLORES.map((color) => {
            const selected = values.color === color.value
            return (
              <button
                key={color.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={color.label}
                title={color.label}
                onClick={() => setValues({ ...values, color: color.value })}
                className="grid size-11 cursor-pointer place-items-center rounded-full"
              >
                <span
                  className={[
                    'grid size-8 place-items-center rounded-full text-white transition-transform',
                    selected ? 'scale-110 ring-2 ring-slate-900 ring-offset-2 ring-offset-superficie' : 'hover:scale-105',
                  ].join(' ')}
                  style={{ backgroundColor: color.value }}
                >
                  {selected && <CheckIcon className="size-4" strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Horario de clases</legend>
        <HorarioAsignaturaEditor
          horarios={values.horarios as Horario[]}
          onChange={(horarios) => {
            setValues((v) => ({ ...v, horarios }))
            setErrors(({ horarios: _omit, ...rest }) => rest)
          }}
          nombre={values.nombre}
          color={values.color}
          otras={otras}
        />
        {errors.horarios && <p className="mt-2 text-sm text-rose-600">{errors.horarios}</p>}
      </fieldset>

      <FormError message={formError} />

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {asignatura ? 'Guardar cambios' : 'Crear asignatura'}
        </Button>
      </div>
    </form>
  )
}

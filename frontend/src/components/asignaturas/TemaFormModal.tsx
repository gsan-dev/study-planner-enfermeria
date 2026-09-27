import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { temaFormSchema, type TemaFormValues } from '../../schemas/tema'
import { validateForm, type FieldErrors } from '../../schemas/validation'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { updateTema } from '../../services/asignaturasService'
import type { Tema } from '../../types/models'
import { Button } from '../ui/Button'
import { FormError } from '../ui/FormError'
import { Modal } from '../ui/Modal'
import { TemaFields } from './TemaFields'

interface TemaFormModalProps {
  tema: Tema | null
  onClose: () => void
  onSaved: (tema: Tema) => void
}

export function TemaFormModal({ tema, onClose, onSaved }: TemaFormModalProps) {
  return (
    <Modal open={tema !== null} onClose={onClose} title="Editar tema">
      {tema && <TemaForm tema={tema} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  )
}

function TemaForm({ tema, onClose, onSaved }: { tema: Tema; onClose: () => void; onSaved: (tema: Tema) => void }) {
  const [values, setValues] = useState<TemaFormValues>({
    nombre: tema.nombre,
    dificultad: String(tema.dificultad),
    horasEstimadas: String(tema.horasEstimadas),
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = validateForm(temaFormSchema, values)
    if (result.errors) return setErrors(result.errors)
    setFormError('')
    setSaving(true)
    try {
      onSaved(await updateTema(tema._id, result.data))
      toast.success('Tema actualizado')
    } catch (error) {
      setErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TemaFields values={values} errors={errors} onChange={setValues} />
      <FormError message={formError} />
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}

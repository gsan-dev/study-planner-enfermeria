import { useEffect, useId, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { hoyKey } from '../../lib/fechas'
import { numberFromInput, validateForm, type FieldErrors } from '../../schemas/validation'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { listTemas } from '../../services/asignaturasService'
import { registrarHoras } from '../../services/progresoService'
import type { RegistroProgreso } from '../../types/api'
import type { Asignatura, Tema } from '../../types/models'
import { Button } from '../ui/Button'
import { inputClass, SelectField, TextField } from '../ui/Field'
import { FormError } from '../ui/FormError'
import { Modal } from '../ui/Modal'

const schema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige el día'),
  horas: numberFromInput('Introduce un número de horas').pipe(
    z
      .number({ error: 'Indica cuántas horas has estudiado' })
      .min(0.25, 'Mínimo 15 minutos')
      .max(16, 'Máximo 16 horas')
      .refine((h) => Number.isInteger(h * 4), 'De 15 en 15 minutos (0,25 · 0,5 · 0,75…)'),
  ),
  asignaturaId: z.string().min(1, 'Elige la asignatura'),
  temaId: z.string().transform((v) => v || undefined),
  notas: z
    .string()
    .trim()
    .max(500, 'Máximo 500 caracteres')
    .transform((v) => v || undefined),
})

interface RegistrarHorasModalProps {
  open: boolean
  asignaturas: Asignatura[]
  onClose: () => void
  onSaved: (registro: RegistroProgreso) => void
}

export function RegistrarHorasModal({ open, ...props }: RegistrarHorasModalProps) {
  return (
    <Modal open={open} onClose={props.onClose} title="Registrar horas de estudio">
      {open && <Formulario {...props} />}
    </Modal>
  )
}

function Formulario({ asignaturas, onClose, onSaved }: Omit<RegistrarHorasModalProps, 'open'>) {
  const [values, setValues] = useState({
    fecha: hoyKey(),
    horas: '1',
    asignaturaId: asignaturas.length === 1 ? asignaturas[0]._id : '',
    temaId: '',
    notas: '',
  })
  const [temas, setTemas] = useState<{ asignaturaId: string; lista: Tema[] } | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const notasId = useId()

  const { asignaturaId } = values
  useEffect(() => {
    if (!asignaturaId) return
    const controller = new AbortController()
    listTemas(asignaturaId, controller.signal)
      .then((lista) => setTemas({ asignaturaId, lista }))
      .catch(() => {
        // Sin temas se puede registrar igualmente en la asignatura.
      })
    return () => controller.abort()
  }, [asignaturaId])

  const temasDeAsignatura = temas?.asignaturaId === asignaturaId ? temas.lista : []

  const set = (campo: keyof typeof values, valor: string) => {
    setValues((v) => ({ ...v, [campo]: valor, ...(campo === 'asignaturaId' ? { temaId: '' } : {}) }))
    setErrors(({ [campo]: _omit, ...resto }) => resto)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = validateForm(schema, values)
    if (result.errors) return setErrors(result.errors)
    const { horas } = result.data
    if (horas === null) return setErrors({ horas: 'Indica cuántas horas has estudiado' })
    setErrors({})
    setFormError('')
    setSaving(true)
    try {
      const registro = await registrarHoras({ ...result.data, horas })
      toast.success(`${String(horas).replace('.', ',')} h registradas`)
      onSaved(registro)
    } catch (error) {
      setErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Día" type="date" max={hoyKey()} value={values.fecha} onChange={(e) => set('fecha', e.target.value)} error={errors.fecha} />
        <TextField
          label="Horas"
          inputMode="decimal"
          autoFocus
          value={values.horas}
          onChange={(e) => set('horas', e.target.value)}
          error={errors.horas}
          hint="Ej. 1,5"
        />
      </div>
      <SelectField label="Asignatura" required value={values.asignaturaId} onChange={(e) => set('asignaturaId', e.target.value)} error={errors.asignaturaId}>
        <option value="" disabled>
          Elige una asignatura…
        </option>
        {asignaturas.map((a) => (
          <option key={a._id} value={a._id}>
            {a.nombre}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Tema (opcional)"
        value={values.temaId}
        onChange={(e) => set('temaId', e.target.value)}
        disabled={!asignaturaId || temasDeAsignatura.length === 0}
        error={errors.temaId}
      >
        <option value="">{asignaturaId && temasDeAsignatura.length === 0 ? 'La asignatura no tiene temas' : 'Sin tema concreto'}</option>
        {temasDeAsignatura.map((t) => (
          <option key={t._id} value={t._id}>
            {t.nombre}
          </option>
        ))}
      </SelectField>
      <div>
        <label htmlFor={notasId} className="mb-1.5 block text-sm font-medium text-slate-700">
          Notas
        </label>
        <textarea
          id={notasId}
          rows={2}
          maxLength={500}
          placeholder="Opcional. Ej. Repaso con esquemas"
          value={values.notas}
          onChange={(e) => set('notas', e.target.value)}
          className={`${inputClass} border-slate-300 py-2.5 focus:border-brand-600`}
        />
      </div>
      <FormError message={formError} />
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          Registrar
        </Button>
      </div>
    </form>
  )
}

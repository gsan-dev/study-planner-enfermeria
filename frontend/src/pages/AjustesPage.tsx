import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth, useCurrentUser } from '../auth/authContext'
import { LogoutIcon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Field'
import { perfilSchema } from '../schemas/auth'
import { validateForm, type FieldErrors } from '../schemas/validation'
import { getErrorMessage, getFieldErrors } from '../services/api'
import { updateMe } from '../services/authService'

export function AjustesPage() {
  const { setUser, logout } = useAuth()
  const user = useCurrentUser()
  const [values, setValues] = useState({
    nombre: user.nombre,
    horasEstudioDiarias: String(user.horasEstudioDiarias),
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = validateForm(perfilSchema, values)
    if (result.errors) return setErrors(result.errors)
    setErrors({})
    setSaving(true)
    try {
      setUser(await updateMe(result.data))
      toast.success('Cambios guardados')
    } catch (error) {
      setErrors(getFieldErrors(error))
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Tu perfil</h2>
        <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <TextField label="Email" value={user.email} disabled readOnly />
          <TextField
            label="Nombre"
            autoComplete="given-name"
            value={values.nombre}
            onChange={(e) => setValues({ ...values, nombre: e.target.value })}
            error={errors.nombre}
          />
          <TextField
            label="Horas de estudio al día"
            inputMode="decimal"
            value={values.horasEstudioDiarias}
            onChange={(e) => setValues({ ...values, horasEstudioDiarias: e.target.value })}
            error={errors.horasEstudioDiarias}
            hint="Se usa por defecto al generar tus planes de estudio."
            wrapperClassName="sm:max-w-xs"
          />
          <div>
            <Button type="submit" loading={saving}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Sesión</h2>
        <p className="mt-1 text-sm text-slate-600">Cierra la sesión en este dispositivo. En los demás seguirá abierta.</p>
        <Button variant="secondary" onClick={logout} className="mt-4">
          <LogoutIcon className="size-5" />
          Cerrar sesión
        </Button>
      </section>
    </div>
  )
}

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../auth/authContext'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { PasswordField, TextField } from '../components/ui/Field'
import { registerSchema } from '../schemas/auth'
import { validateForm, type FieldErrors } from '../schemas/validation'
import { getErrorMessage, getFieldErrors } from '../services/api'

export function RegisterPage() {
  const { register } = useAuth()
  const location = useLocation()
  const [values, setValues] = useState({ nombre: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues({ ...values, [field]: e.target.value })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const result = validateForm(registerSchema, values)
    if (result.errors) return setErrors(result.errors)
    setErrors({})
    setSubmitting(true)
    try {
      await register(result.data.nombre, result.data.email, result.data.password)
      toast.success(`¡Te damos la bienvenida, ${result.data.nombre.split(' ')[0]}!`)
    } catch (error) {
      setErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Organiza tus asignaturas y exámenes de Enfermería"
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-brand-700 hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField label="Nombre" autoComplete="given-name" value={values.nombre} onChange={set('nombre')} error={errors.nombre} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          value={values.email}
          onChange={set('email')}
          error={errors.email}
        />
        <PasswordField
          label="Contraseña"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint="Mínimo 8 caracteres"
        />
        <PasswordField
          label="Repite la contraseña"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={set('confirmPassword')}
          error={errors.confirmPassword}
        />
        {formError && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {formError}
          </p>
        )}
        <Button type="submit" loading={submitting} className="mt-1 w-full">
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  )
}

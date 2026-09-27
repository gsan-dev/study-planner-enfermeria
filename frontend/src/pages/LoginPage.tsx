import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/authContext'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { PasswordField, TextField } from '../components/ui/Field'
import { loginSchema } from '../schemas/auth'
import { validateForm, type FieldErrors } from '../schemas/validation'
import { getErrorMessage } from '../services/api'

export function LoginPage() {
  const { login } = useAuth()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const result = validateForm(loginSchema, values)
    if (result.errors) return setErrors(result.errors)
    setErrors({})
    setSubmitting(true)
    try {
      await login(result.data.email, result.data.password)
      // RedirectIfAuthenticated lleva a la página que se quería visitar.
    } catch (error) {
      setFormError(getErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Hola de nuevo"
      subtitle="Entra para ver tu plan de estudio"
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" state={location.state} className="font-semibold text-brand-700 hover:underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          error={errors.email}
        />
        <PasswordField
          label="Contraseña"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
          error={errors.password}
        />
        {formError && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {formError}
          </p>
        )}
        <Button type="submit" loading={submitting} className="mt-1 w-full">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}

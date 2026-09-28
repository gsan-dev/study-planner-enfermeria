import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { cambiarEmailSchema, cambiarNombreSchema } from '../../schemas/auth'
import { validateForm, type FieldErrors } from '../../schemas/validation'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { cambiarEmail, cambiarNombre } from '../../services/authService'
import type { User } from '../../types/models'
import { Button } from '../ui/Button'
import { PasswordField, TextField } from '../ui/Field'
import { FormError } from '../ui/FormError'
import { Modal } from '../ui/Modal'

export type DatoPerfil = 'nombre' | 'email'

const TEXTOS: Record<DatoPerfil, { titulo: string; etiqueta: string; exito: string }> = {
  nombre: { titulo: 'Cambiar el nombre', etiqueta: 'Nuevo nombre', exito: 'Nombre cambiado' },
  email: { titulo: 'Cambiar el email', etiqueta: 'Nuevo email', exito: 'Email cambiado. Úsalo a partir de ahora para entrar.' },
}

interface CambiarDatoModalProps {
  /** Qué se cambia (null = cerrado). */
  dato: DatoPerfil | null
  user: User
  onClose: () => void
  onSaved: (user: User) => void
}

/** Cambio de nombre o de email: pide la contraseña de la cuenta. */
export function CambiarDatoModal({ dato, ...props }: CambiarDatoModalProps) {
  return (
    <Modal open={dato !== null} onClose={props.onClose} title={dato ? TEXTOS[dato].titulo : ''}>
      {dato && <Formulario key={dato} dato={dato} {...props} />}
    </Modal>
  )
}

function Formulario({ dato, user, onClose, onSaved }: Omit<CambiarDatoModalProps, 'dato'> & { dato: DatoPerfil }) {
  const [valor, setValor] = useState(dato === 'nombre' ? user.nombre : '')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const textos = TEXTOS[dato]

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = validateForm(dato === 'nombre' ? cambiarNombreSchema : cambiarEmailSchema, { valor, password })
    if (result.errors) return setErrors(result.errors)
    setErrors({})
    setFormError('')
    setSaving(true)
    try {
      const guardado =
        dato === 'nombre'
          ? await cambiarNombre(result.data.valor, result.data.password)
          : await cambiarEmail(result.data.valor, result.data.password)
      toast.success(textos.exito)
      onSaved(guardado)
    } catch (error) {
      // El API marca el campo con el mismo nombre que el dato ("nombre"/"email").
      const campos = getFieldErrors(error)
      setErrors({ valor: campos[dato], password: campos.password })
      if (!campos[dato] && !campos.password) setFormError(getErrorMessage(error))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {dato === 'email' && (
        <p className="text-sm text-slate-600">
          Ahora entras con <strong className="text-slate-900">{user.email}</strong>. Después del cambio tendrás que usar el nuevo.
        </p>
      )}
      <TextField
        label={textos.etiqueta}
        type={dato === 'email' ? 'email' : 'text'}
        autoComplete={dato === 'email' ? 'email' : 'name'}
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        error={errors.valor}
      />
      <PasswordField
        label="Tu contraseña"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        hint="Por seguridad, confirma que eres tú."
      />
      <FormError message={formError} />
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          Guardar
        </Button>
      </div>
    </form>
  )
}

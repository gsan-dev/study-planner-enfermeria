import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useAuth, useCurrentUser } from '../auth/authContext'
import { CambiarDatoModal, type DatoPerfil } from '../components/ajustes/CambiarDatoModal'
import { BellIcon, CameraIcon, ChevronDownIcon, LogoutIcon, TrashIcon } from '../components/icons'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Field'
import { prepararFotoPerfil } from '../lib/imagen'
import { useTema, type PreferenciaTema } from '../lib/tema'
import { perfilSchema } from '../schemas/auth'
import { validateForm, type FieldErrors } from '../schemas/validation'
import { getErrorMessage, getFieldErrors } from '../services/api'
import { cambiarFoto, quitarFoto, updateMe } from '../services/authService'

export function AjustesPage() {
  const { setUser, logout } = useAuth()
  const user = useCurrentUser()
  const [values, setValues] = useState({ horasEstudioDiarias: String(user.horasEstudioDiarias) })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [cambiando, setCambiando] = useState<DatoPerfil | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const inputFoto = useRef<HTMLInputElement>(null)
  const { preferencia, setPreferencia } = useTema()

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

  const elegirFoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0]
    // Permite volver a elegir la misma imagen más adelante.
    event.target.value = ''
    if (!archivo) return
    setSubiendoFoto(true)
    try {
      setUser(await cambiarFoto(await prepararFotoPerfil(archivo)))
      toast.success('Foto actualizada')
    } catch (error) {
      toast.error(error instanceof Error && !('isAxiosError' in error) ? 'No se pudo leer la imagen. Prueba con otra.' : getErrorMessage(error))
    } finally {
      setSubiendoFoto(false)
    }
  }

  const borrarFoto = async () => {
    setSubiendoFoto(true)
    try {
      setUser(await quitarFoto())
      toast.success('Foto quitada')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubiendoFoto(false)
    }
  }

  const filas: { dato: DatoPerfil; etiqueta: string; valor: string }[] = [
    { dato: 'nombre', etiqueta: 'Nombre', valor: user.nombre },
    { dato: 'email', etiqueta: 'Email', valor: user.email },
  ]

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section aria-labelledby="tu-perfil" className="rounded-2xl border border-slate-200 bg-superficie p-5 md:p-6">
        <h2 id="tu-perfil" className="text-lg font-semibold text-slate-900">
          Tu perfil
        </h2>

        {/* Foto: se cambia sin contraseña */}
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
          <div className={subiendoFoto ? 'opacity-50' : ''}>
            <Avatar user={user} size="lg" />
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <input ref={inputFoto} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={elegirFoto} />
            <Button variant="secondary" onClick={() => inputFoto.current?.click()} loading={subiendoFoto}>
              <CameraIcon className="size-5" />
              {user.foto ? 'Cambiar foto' : 'Añadir foto'}
            </Button>
            {user.foto && (
              <Button variant="ghost" onClick={borrarFoto} disabled={subiendoFoto} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                <TrashIcon className="size-5" />
                Quitar
              </Button>
            )}
          </div>
        </div>

        {/* Nombre y email: con la contraseña */}
        <ul className="mt-5 flex flex-col divide-y divide-slate-100 border-t border-slate-100">
          {filas.map(({ dato, etiqueta, valor }) => (
            <li key={dato} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-500">{etiqueta}</p>
                <p className="truncate font-medium text-slate-900">{valor}</p>
              </div>
              {!user.demo && (
                <Button variant="secondary" onClick={() => setCambiando(dato)} aria-label={`Cambiar ${etiqueta.toLowerCase()}`}>
                  Cambiar
                </Button>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          {user.demo
            ? 'Es la cuenta demo: el nombre y el email no se pueden cambiar.'
            : 'Para cambiar el nombre o el email te pediremos la contraseña.'}
        </p>
      </section>

      <section aria-labelledby="estudio" className="rounded-2xl border border-slate-200 bg-superficie p-5 md:p-6">
        <h2 id="estudio" className="text-lg font-semibold text-slate-900">
          Estudio
        </h2>
        <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <TextField
            label="Horas de estudio al día"
            inputMode="decimal"
            value={values.horasEstudioDiarias}
            onChange={(e) => setValues({ horasEstudioDiarias: e.target.value })}
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

      <section aria-labelledby="apariencia" className="rounded-2xl border border-slate-200 bg-superficie p-5 md:p-6">
        <h2 id="apariencia" className="text-lg font-semibold text-slate-900">
          Apariencia
        </h2>
        <div role="radiogroup" aria-labelledby="apariencia" className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1 sm:max-w-md">
          {(
            [
              ['claro', 'Claro'],
              ['oscuro', 'Oscuro'],
              ['sistema', 'Automático'],
            ] as [PreferenciaTema, string][]
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={preferencia === valor}
              onClick={() => setPreferencia(valor)}
              className={[
                'min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors',
                preferencia === valor ? 'bg-superficie text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-500">«Automático» sigue el modo claro u oscuro de tu dispositivo.</p>
      </section>

      <Link
        to="/notificaciones"
        className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-superficie p-5 hover:border-slate-300 md:p-6"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <BellIcon className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-900">Notificaciones</span>
          <span className="block text-sm text-slate-600">Actívalas en este dispositivo y elige qué avisos recibir.</span>
        </span>
        <ChevronDownIcon className="size-5 -rotate-90 text-slate-500" />
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-superficie p-5 md:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Sesión</h2>
        <p className="mt-1 text-sm text-slate-600">Cierra la sesión en este dispositivo. En los demás seguirá abierta.</p>
        <Button variant="secondary" onClick={logout} className="mt-4">
          <LogoutIcon className="size-5" />
          Cerrar sesión
        </Button>
      </section>

      <CambiarDatoModal
        dato={cambiando}
        user={user}
        onClose={() => setCambiando(null)}
        onSaved={(guardado) => {
          setUser(guardado)
          setCambiando(null)
        }}
      />
    </div>
  )
}

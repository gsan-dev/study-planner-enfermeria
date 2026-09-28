import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '../../services/api'
import { getPreferencias, guardarPreferencias } from '../../services/notificacionesService'
import type { PreferenciasNotificaciones } from '../../types/models'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Field'
import { FormError } from '../ui/FormError'
import { Spinner } from '../ui/Spinner'

type Interruptor = Exclude<keyof PreferenciasNotificaciones, 'horaDiaria' | 'zonaHoraria'>

const OPCIONES: { campo: Interruptor; titulo: string; texto: string }[] = [
  { campo: 'examenes', titulo: 'Exámenes', texto: 'A 7 días, a 3 días y el día antes de cada examen.' },
  { campo: 'planDiario', titulo: 'Plan del día', texto: 'Qué temas toca estudiar hoy según tu plan.' },
  { campo: 'retraso', titulo: 'Retrasos', texto: 'Si tienes sesiones sin hacer de días anteriores.' },
  { campo: 'logros', titulo: 'Logros', texto: 'Cuando completas el plan de un examen.' },
]

/** Qué avisos recibir y a qué hora llegan los diarios. */
export function PreferenciasForm() {
  const [valores, setValores] = useState<PreferenciasNotificaciones | null>(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    getPreferencias().then(setValores, (err) => setError(getErrorMessage(err)))
  }, [])

  const guardar = async (event: FormEvent) => {
    event.preventDefault()
    if (!valores) return
    setGuardando(true)
    setError('')
    try {
      // La zona horaria sale del dispositivo desde el que se guarda.
      const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone
      setValores(await guardarPreferencias({ ...valores, zonaHoraria }))
      toast.success('Preferencias guardadas')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section aria-labelledby="que-avisos" className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
      <h3 id="que-avisos" className="font-semibold text-slate-900">
        Qué avisos quieres recibir
      </h3>
      {!valores ? (
        error ? (
          <FormError message={error} />
        ) : (
          <div className="flex justify-center py-4 text-slate-400">
            <Spinner />
          </div>
        )
      ) : (
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <ul className="-mx-2 flex flex-col">
            {OPCIONES.map(({ campo, titulo, texto }) => {
              const activo = valores[campo]
              return (
                <li key={campo}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={activo}
                    onClick={() => setValores({ ...valores, [campo]: !activo })}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900">{titulo}</span>
                      <span className="block text-sm text-slate-600">{texto}</span>
                    </span>
                    <span
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${activo ? 'bg-brand-700' : 'bg-slate-300'}`}
                      aria-hidden="true"
                    >
                      <span
                        className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] ${activo ? 'left-[1.375rem]' : 'left-0.5'}`}
                      />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <TextField
            label="Hora de los avisos diarios"
            type="time"
            value={valores.horaDiaria}
            onChange={(e) => e.target.value && setValores({ ...valores, horaDiaria: e.target.value })}
            hint={`Hora de ${valores.zonaHoraria.replace('_', ' ')}.`}
            wrapperClassName="sm:max-w-56"
          />
          <FormError message={error} />
          <Button type="submit" loading={guardando} className="self-start">
            Guardar preferencias
          </Button>
        </form>
      )}
    </section>
  )
}

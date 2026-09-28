import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { activarPush, desactivarPush, esIOS, estadoPush, type EstadoPush } from '../../lib/push'
import { getErrorMessage } from '../../services/api'
import { contarDispositivos, enviarPrueba } from '../../services/notificacionesService'
import { useNotificaciones } from '../../hooks/notificacionesContext'
import { BellIcon } from '../icons'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'

/** Pasos para instalar la app en el iPhone (requisito de Apple para recibir notificaciones). */
function PasosIOS() {
  return (
    <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-slate-700">
      <li>
        Abre esta web en <strong>Safari</strong>.
      </li>
      <li>
        Toca el botón <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba).
      </li>
      <li>
        Elige <strong>«Añadir a pantalla de inicio»</strong> y toca <strong>Añadir</strong>.
      </li>
      <li>
        Abre Study Planner <strong>desde su icono</strong> y vuelve a esta pantalla para activar las notificaciones.
      </li>
    </ol>
  )
}

/** Activar o desactivar las notificaciones push en este dispositivo. */
export function DispositivoPush() {
  const { recargar } = useNotificaciones()
  const [estado, setEstado] = useState<EstadoPush | null>(null)
  const [dispositivos, setDispositivos] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [probando, setProbando] = useState(false)

  useEffect(() => {
    estadoPush().then(setEstado, () => setEstado('no-soportado'))
    contarDispositivos().then(setDispositivos, () => {})
  }, [])

  const cambiar = async (accion: () => Promise<EstadoPush>) => {
    setOcupado(true)
    try {
      const nuevo = await accion()
      setEstado(nuevo)
      if (nuevo === 'activo') toast.success('Notificaciones activadas en este dispositivo')
      if (nuevo === 'bloqueado') toast.error('Has bloqueado las notificaciones para esta web')
      setDispositivos(await contarDispositivos())
    } catch (err) {
      // Errores del propio navegador al suscribirse (p. ej. en ventanas privadas no hay push).
      toast.error(
        err instanceof DOMException
          ? 'Este navegador no ha podido activar las notificaciones. Si estás en una ventana privada, abre la app en una normal.'
          : getErrorMessage(err),
      )
    } finally {
      setOcupado(false)
    }
  }

  const probar = async () => {
    setProbando(true)
    try {
      const n = await enviarPrueba()
      toast.success(n > 0 ? `Enviada a ${n} ${n === 1 ? 'dispositivo' : 'dispositivos'}` : 'Creada (solo en la app: no hay dispositivos activados)')
      recargar()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setProbando(false)
    }
  }

  return (
    <section aria-labelledby="este-dispositivo" className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
          <BellIcon className="size-6" />
        </span>
        <div className="min-w-0">
          <h3 id="este-dispositivo" className="font-semibold text-slate-900">
            Notificaciones en este dispositivo
          </h3>
          <p className="text-sm text-slate-600">Te llegan aunque la app esté cerrada, como las de cualquier otra app.</p>
        </div>
      </div>

      {estado === null && (
        <div className="flex justify-center py-2 text-slate-400">
          <Spinner />
        </div>
      )}

      {estado === 'activo' && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          <span className="size-2 rounded-full bg-emerald-600" aria-hidden="true" />
          Activadas en este dispositivo
        </p>
      )}
      {estado === 'inactivo' && (
        <p className="text-sm text-slate-600">
          Actívalas para recibir los avisos de exámenes, lo que toca estudiar cada día y si te retrasas en el plan.
        </p>
      )}
      {estado === 'bloqueado' && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Las notificaciones están bloqueadas para esta web.{' '}
          {esIOS()
            ? 'Actívalas en Ajustes del iPhone › Notificaciones › Study Planner.'
            : 'Permítelas desde el icono del candado junto a la dirección, en los ajustes del sitio.'}
        </p>
      )}
      {estado === 'instalar-ios' && (
        <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">En el iPhone, primero añade la app a la pantalla de inicio:</p>
          <PasosIOS />
          <p className="text-xs text-slate-500">Apple solo permite notificaciones a las webs instaladas así (iOS 16.4 o posterior).</p>
        </div>
      )}
      {estado === 'sin-https' && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Las notificaciones necesitan que la web se abra con <strong>https://</strong>. Configura el dominio con HTTPS en el servidor.
        </p>
      )}
      {estado === 'no-soportado' && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Este navegador no admite notificaciones push. Prueba con Chrome, Edge, Firefox o Safari actualizados.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {estado === 'inactivo' && (
          <Button onClick={() => cambiar(activarPush)} loading={ocupado}>
            <BellIcon className="size-5" />
            Activar notificaciones
          </Button>
        )}
        {estado === 'activo' && (
          <Button variant="secondary" onClick={() => cambiar(desactivarPush)} loading={ocupado}>
            Desactivar en este dispositivo
          </Button>
        )}
        <Button variant="secondary" onClick={probar} loading={probando}>
          Enviar una de prueba
        </Button>
      </div>

      {dispositivos !== null && dispositivos > 0 && (
        <p className="text-xs text-slate-500">
          Recibes avisos en {dispositivos} {dispositivos === 1 ? 'dispositivo' : 'dispositivos'}.
        </p>
      )}
    </section>
  )
}

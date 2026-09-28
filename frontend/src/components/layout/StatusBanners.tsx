import { useServiceWorkerState } from '../../hooks/serviceWorkerContext'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { WifiOffIcon } from '../icons'

/** Avisos globales: sin conexión y nueva versión de la app disponible. */
export function StatusBanners() {
  const online = useOnlineStatus()
  const { updateAvailable, applyUpdate } = useServiceWorkerState()

  return (
    <div aria-live="polite">
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
          <WifiOffIcon className="size-4" />
          Sin conexión. Algunos datos pueden no estar actualizados.
        </div>
      )}
      {updateAvailable && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primario px-4 py-2 text-sm text-white">
          <span>Hay una nueva versión disponible.</span>
          <button
            type="button"
            onClick={applyUpdate}
            className="min-h-11 cursor-pointer rounded-lg bg-white/15 px-3 font-semibold hover:bg-white/25"
          >
            Actualizar
          </button>
        </div>
      )}
    </div>
  )
}

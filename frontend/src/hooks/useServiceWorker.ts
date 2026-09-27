import { useCallback, useEffect, useState } from 'react'

/**
 * Registra /service-worker.js (solo en producción: en desarrollo la caché
 * interferiría con el hot reload) y avisa cuando hay una versión nueva
 * esperando para activarse.
 */
export function useServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    let updateInterval: number | undefined
    let refreshing = false
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting)
        }
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          installing?.addEventListener('statechange', () => {
            // Solo es "actualización" si ya había un SW controlando la página.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(installing)
            }
          })
        })
        // Comprueba si hay versión nueva cada hora (la app puede quedarse abierta días).
        updateInterval = window.setInterval(() => registration.update(), 60 * 60 * 1000)
      })
      .catch((err) => console.error('Error registrando el service worker', err))

    return () => {
      window.clearInterval(updateInterval)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    waiting?.postMessage({ type: 'SKIP_WAITING' })
  }, [waiting])

  return { updateAvailable: waiting !== null, applyUpdate }
}

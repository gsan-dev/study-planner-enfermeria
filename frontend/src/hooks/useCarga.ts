import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../services/api'

/**
 * Pide datos cada vez que cambia `clave` (y con `recargar()`), cancelando la
 * petición anterior. Mientras llega la nueva se conservan los datos que ya
 * había, para que la página no parpadee.
 */
export function useCarga<T>(clave: string, cargar: (signal: AbortSignal) => Promise<T>) {
  const [estado, setEstado] = useState<{ clave: string; data: T | null; error: string }>({ clave: '', data: null, error: '' })
  const [recargas, setRecargas] = useState(0)
  const cargarRef = useRef(cargar)
  useEffect(() => {
    cargarRef.current = cargar
  })

  useEffect(() => {
    const controller = new AbortController()
    cargarRef
      .current(controller.signal)
      .then((data) => setEstado({ clave, data, error: '' }))
      .catch((err) => {
        if (!controller.signal.aborted) setEstado((e) => ({ ...e, clave, error: getErrorMessage(err) }))
      })
    return () => controller.abort()
  }, [clave, recargas])

  const recargar = useCallback(() => setRecargas((n) => n + 1), [])

  return { data: estado.data, error: estado.error, cargando: estado.clave !== clave, recargar }
}

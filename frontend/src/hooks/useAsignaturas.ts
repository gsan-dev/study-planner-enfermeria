import { useCallback, useEffect, useState } from 'react'
import { listAsignaturas, type FiltroArchivadas } from '../services/asignaturasService'
import { getErrorMessage } from '../services/api'
import type { Asignatura, ResumenTemas } from '../types/models'

const porNombre = (a: Asignatura, b: Asignatura) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })

/** Lista de asignaturas con helpers para actualizarla tras cada cambio sin recargar. */
export function useAsignaturas(filtro: FiltroArchivadas) {
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  // Qué petición terminó por última vez: si no coincide con la actual, está cargando.
  const [loaded, setLoaded] = useState<{ key: string; error: string } | null>(null)
  const requestKey = `${filtro}:${reloadKey}`

  useEffect(() => {
    const controller = new AbortController()
    listAsignaturas(filtro, controller.signal)
      .then((data) => {
        setAsignaturas(data)
        setLoaded({ key: requestKey, error: '' })
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoaded({ key: requestKey, error: getErrorMessage(err) })
      })
    return () => controller.abort()
  }, [filtro, requestKey])

  const status = loaded?.key !== requestKey ? 'loading' : loaded.error ? 'error' : 'ready'

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  /** Inserta o reemplaza; si ya no encaja en el filtro actual (p. ej. archivada), la quita. */
  const upsert = useCallback(
    (asignatura: Asignatura) => {
      const encaja = filtro === 'todas' || String(asignatura.archivada) === filtro
      setAsignaturas((prev) => {
        const sin = prev.filter((a) => a._id !== asignatura._id)
        return encaja ? [...sin, asignatura].sort(porNombre) : sin
      })
    },
    [filtro],
  )

  const remove = useCallback((id: string) => {
    setAsignaturas((prev) => prev.filter((a) => a._id !== id))
  }, [])

  const updateResumen = useCallback((id: string, resumenTemas: ResumenTemas) => {
    setAsignaturas((prev) => prev.map((a) => (a._id === id ? { ...a, resumenTemas } : a)))
  }, [])

  /** Sustituye la lista completa (p. ej. tras guardar el horario). */
  const replaceAll = useCallback((next: Asignatura[]) => setAsignaturas([...next].sort(porNombre)), [])

  return { asignaturas, status, error: loaded?.error ?? '', reload, upsert, remove, updateResumen, replaceAll }
}

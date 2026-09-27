import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../services/api'
import { listExamenes } from '../services/examenesService'
import type { ExamenConResumen } from '../types/api'

/** Fecha y hora ascendentes (los exámenes sin hora, primero en su día). */
const porFecha = (a: ExamenConResumen, b: ExamenConResumen) =>
  a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? '')

/** Todos los exámenes del usuario, con helpers para actualizar la lista sin recargar. */
export function useExamenes() {
  const [examenes, setExamenes] = useState<ExamenConResumen[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const [loaded, setLoaded] = useState<{ key: number; error: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listExamenes(controller.signal)
      .then((data) => {
        setExamenes([...data].sort(porFecha))
        setLoaded({ key: reloadKey, error: '' })
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoaded({ key: reloadKey, error: getErrorMessage(err) })
      })
    return () => controller.abort()
  }, [reloadKey])

  const status = loaded?.key !== reloadKey ? 'loading' : loaded.error ? 'error' : 'ready'

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const upsert = useCallback((examen: ExamenConResumen) => {
    setExamenes((prev) => [...prev.filter((e) => e._id !== examen._id), examen].sort(porFecha))
  }, [])

  const remove = useCallback((id: string) => {
    setExamenes((prev) => prev.filter((e) => e._id !== id))
  }, [])

  return { examenes, status, error: loaded?.error ?? '', reload, upsert, remove }
}

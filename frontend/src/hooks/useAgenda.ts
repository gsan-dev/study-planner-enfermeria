import { useCallback, useEffect, useState } from 'react'
import { diaKey } from '../lib/fechas'
import { getAgenda } from '../services/agendaService'
import { getErrorMessage } from '../services/api'
import type { AgendaResponse } from '../types/api'
import type { EntradaDiario, Tarea } from '../types/models'

const porFechaYHora = (a: Tarea, b: Tarea) =>
  a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? '') || a.createdAt.localeCompare(b.createdAt)

/**
 * Agenda de un rango de días (el mes que se ve en el calendario), con
 * helpers para actualizarla tras cada cambio sin volver a pedirla.
 */
export function useAgenda(desde: string, hasta: string, hoy: string) {
  const [data, setData] = useState<AgendaResponse | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; error: string } | null>(null)
  const requestKey = `${desde}:${hasta}:${hoy}:${reloadKey}`

  useEffect(() => {
    const controller = new AbortController()
    getAgenda(desde, hasta, hoy, controller.signal)
      .then((res) => {
        setData(res)
        setLoaded({ key: requestKey, error: '' })
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoaded({ key: requestKey, error: getErrorMessage(err) })
      })
    return () => controller.abort()
  }, [desde, hasta, hoy, requestKey])

  const status = loaded?.key !== requestKey ? 'loading' : loaded.error ? 'error' : 'ready'
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  /** Inserta o reemplaza una tarea (y la quita de pendientes si ya no lo está). */
  const upsertTarea = useCallback(
    (tarea: Tarea) =>
      setData((d) => {
        if (!d) return d
        const dia = diaKey(tarea.fecha)
        const enRango = dia >= desde && dia <= hasta
        const pendiente = !tarea.hecho && dia < hoy
        return {
          ...d,
          tareas: [...d.tareas.filter((t) => t._id !== tarea._id), ...(enRango ? [tarea] : [])].sort(porFechaYHora),
          pendientes: [...d.pendientes.filter((t) => t._id !== tarea._id), ...(pendiente ? [tarea] : [])].sort(
            porFechaYHora,
          ),
        }
      }),
    [desde, hasta, hoy],
  )

  const removeTarea = useCallback(
    (id: string) =>
      setData((d) =>
        d ? { ...d, tareas: d.tareas.filter((t) => t._id !== id), pendientes: d.pendientes.filter((t) => t._id !== id) } : d,
      ),
    [],
  )

  const setDiario = useCallback(
    (dia: string, entrada: EntradaDiario | null) =>
      setData((d) =>
        d ? { ...d, diario: [...d.diario.filter((e) => diaKey(e.fecha) !== dia), ...(entrada ? [entrada] : [])] } : d,
      ),
    [],
  )

  const setSesionCompletada = useCallback(
    (id: string, completado: boolean) =>
      setData((d) => (d ? { ...d, sesiones: d.sesiones.map((s) => (s._id === id ? { ...s, completado } : s)) } : d)),
    [],
  )

  return { data, status, error: loaded?.error ?? '', reload, upsertTarea, removeTarea, setDiario, setSesionCompletada }
}

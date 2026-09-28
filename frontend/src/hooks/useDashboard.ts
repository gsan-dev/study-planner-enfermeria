import { useCallback, useEffect, useState } from 'react'
import { hoyKey } from '../lib/fechas'
import { getErrorMessage } from '../services/api'
import { getDashboard } from '../services/dashboardService'
import type { DashboardResponse } from '../types/api'

/**
 * Datos de la página de inicio. `refresh()` vuelve a pedirlos sin quitar los
 * que ya se ven (tras completar una sesión, para recalcular el cumplimiento).
 */
export function useDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getDashboard(hoyKey(), controller.signal)
      .then((res) => {
        setData(res)
        setError('')
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(getErrorMessage(err))
      })
    return () => controller.abort()
  }, [refreshKey])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { data, setData, error, refresh }
}

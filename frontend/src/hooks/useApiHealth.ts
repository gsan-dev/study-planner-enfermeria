import { useEffect, useState } from 'react'
import { getHealth } from '../services/healthService'
import type { HealthResponse } from '../types/api'

type State =
  | { status: 'loading' }
  | { status: 'ok'; data: HealthResponse }
  | { status: 'error' }

export function useApiHealth(): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    getHealth(controller.signal)
      .then((data) => setState({ status: 'ok', data }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [])

  return state
}

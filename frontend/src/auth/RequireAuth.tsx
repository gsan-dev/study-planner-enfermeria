import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './authContext'

/** Solo deja pasar con sesión iniciada; si no, manda a /login y recuerda a dónde iba. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

/** Para /login y /registro: con sesión iniciada no tiene sentido verlas. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  if (user) return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  return children
}

import { createContext, useContext } from 'react'
import type { User } from '../types/api'

export interface AuthState {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (nombre: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Actualiza el usuario en memoria y en localStorage tras editar el perfil. */
  setUser: (user: User) => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

/** Para páginas protegidas: el usuario siempre existe (lo garantiza RequireAuth). */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser requiere una sesión iniciada')
  return user
}

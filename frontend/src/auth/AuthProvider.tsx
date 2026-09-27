import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import * as authService from '../services/authService'
import { tokenStorage } from '../services/tokenStorage'
import type { User } from '../types/api'
import { AuthContext, type AuthState } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  // Se arranca con el usuario guardado: la app abre al instante (y sin red).
  const [user, setUserState] = useState<User | null>(() =>
    tokenStorage.getRefreshToken() ? tokenStorage.getUser() : null,
  )

  const setUser = useCallback((next: User) => {
    tokenStorage.setUser(next)
    setUserState(next)
  }, [])

  // Revalida la sesión en segundo plano (el interceptor renueva el token si caducó).
  useEffect(() => {
    if (!tokenStorage.getRefreshToken()) return
    authService
      .getMe()
      .then(setUser)
      .catch(() => {
        // Sesión inválida → el interceptor ya avisa con notifyExpired; sin red → se sigue.
      })
  }, [setUser])

  // Sesión caducada durante el uso.
  useEffect(
    () =>
      tokenStorage.onExpired(() => {
        setUserState(null)
        toast.info('Tu sesión ha caducado. Vuelve a iniciar sesión.')
      }),
    [],
  )

  // Login/logout en otra pestaña.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== tokenStorage.sessionKey) return
      setUserState(tokenStorage.getRefreshToken() ? tokenStorage.getUser() : null)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      setUser,
      async login(email, password) {
        const session = await authService.login({ email, password })
        tokenStorage.setSession(session)
        setUserState(session.user)
      },
      async register(nombre, email, password) {
        const session = await authService.register({ nombre, email, password })
        tokenStorage.setSession(session)
        setUserState(session.user)
      },
      async logout() {
        const refreshToken = tokenStorage.getRefreshToken()
        tokenStorage.clear()
        setUserState(null)
        await authService.logout(refreshToken)
      },
    }),
    [user, setUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

import type { AuthResponse, User } from '../types/api'

/**
 * Sesión guardada en localStorage (sobrevive a cerrar la app y funciona en la
 * PWA instalada). El access token dura 15 min; el refresh token se rota en
 * cada renovación y se invalida en el servidor al cerrar sesión. La CSP de
 * Caddy impide cargar scripts de terceros, que es el riesgo principal de
 * guardar tokens en localStorage.
 */
const KEYS = {
  access: 'sp.accessToken',
  refresh: 'sp.refreshToken',
  user: 'sp.user',
} as const

type Listener = () => void
const listeners = new Set<Listener>()

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Almacenamiento bloqueado (modo privado estricto): la sesión dura lo que la pestaña.
  }
}

export const tokenStorage = {
  getAccessToken: () => read(KEYS.access),
  getRefreshToken: () => read(KEYS.refresh),

  getUser(): User | null {
    const raw = read(KEYS.user)
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  },

  setSession({ accessToken, refreshToken, user }: AuthResponse) {
    write(KEYS.access, accessToken)
    write(KEYS.refresh, refreshToken)
    write(KEYS.user, JSON.stringify(user))
  },

  setUser(user: User) {
    write(KEYS.user, JSON.stringify(user))
  },

  clear() {
    write(KEYS.access, null)
    write(KEYS.refresh, null)
    write(KEYS.user, null)
  },

  /** Avisa de que la sesión ha caducado y no se ha podido renovar. */
  notifyExpired() {
    listeners.forEach((listener) => listener())
  },

  onExpired(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  /** Clave a vigilar (evento `storage`) para detectar logins/logouts en otras pestañas. */
  sessionKey: KEYS.refresh,
}

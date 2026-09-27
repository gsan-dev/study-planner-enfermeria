import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { config } from '../config'
import type { ApiErrorBody, AuthResponse } from '../types/api'
import { tokenStorage } from './tokenStorage'

export const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Añade el access token a todas las peticiones.
api.interceptors.request.use((request) => {
  const token = tokenStorage.getAccessToken()
  if (token) request.headers.Authorization = `Bearer ${token}`
  return request
})

let refreshPromise: Promise<string> | null = null

/**
 * Renueva el access token. Si varias peticiones caducan a la vez, todas
 * esperan a la misma renovación (el refresh token solo vale una vez).
 */
function refreshAccessToken(): Promise<string> {
  refreshPromise ??= (async () => {
    const usedRefreshToken = tokenStorage.getRefreshToken()
    if (!usedRefreshToken) throw new Error('Sin sesión')
    try {
      // axios "pelado": sin los interceptores de `api` para no entrar en bucle.
      const { data } = await axios.post<AuthResponse>(`${config.apiUrl}/auth/refresh-token`, {
        refreshToken: usedRefreshToken,
      })
      tokenStorage.setSession(data)
      return data.accessToken
    } catch (error) {
      // Otra pestaña pudo renovar a la vez con el mismo token: usa el suyo.
      const current = tokenStorage.getRefreshToken()
      const access = tokenStorage.getAccessToken()
      if (current && current !== usedRefreshToken && access) return access
      throw error
    }
  })().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

const retried = new WeakSet<InternalAxiosRequestConfig>()

api.interceptors.response.use(undefined, async (error: AxiosError<ApiErrorBody>) => {
  const request = error.config
  const code = error.response?.data?.error?.code
  const sentAuth = Boolean(request?.headers?.Authorization)

  if (error.response?.status !== 401 || !request || !sentAuth) throw error

  if (code === 'TOKEN_EXPIRED' && !retried.has(request)) {
    retried.add(request)
    try {
      const token = await refreshAccessToken()
      request.headers.Authorization = `Bearer ${token}`
      return api(request)
    } catch (refreshError) {
      // Sin red no se puede saber si la sesión sigue viva: no se cierra.
      if (refreshError instanceof AxiosError && !refreshError.response) throw error
    }
  }

  // Token inválido o sesión caducada: hay que volver a iniciar sesión.
  tokenStorage.clear()
  tokenStorage.notifyExpired()
  throw error
})

/** Extrae un mensaje legible de cualquier error de una petición. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined
    if (body?.error?.message) return body.error.message
    if (!error.response) return 'No se pudo conectar con el servidor'
  }
  if (error instanceof Error) return error.message
  return 'Ha ocurrido un error inesperado'
}

/** Errores por campo que devuelve el API en validaciones (400). */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined
    return body?.error?.details ?? {}
  }
  return {}
}

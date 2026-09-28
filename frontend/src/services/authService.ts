import axios from 'axios'
import { config } from '../config'
import type { AuthResponse, User } from '../types/api'
import { api } from './api'

export async function register(input: { nombre: string; email: string; password: string }) {
  const { data } = await api.post<AuthResponse>('/auth/register', input)
  return data
}

export async function login(input: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>('/auth/login', input)
  return data
}

/** Invalida el refresh token en el servidor. No falla si no hay red. */
export async function logout(refreshToken: string | null) {
  if (!refreshToken) return
  try {
    await axios.post(`${config.apiUrl}/auth/logout`, { refreshToken }, { timeout: 5000 })
  } catch {
    // El token caducará solo; la sesión local se borra igualmente.
  }
}

export async function getMe() {
  const { data } = await api.get<{ user: User }>('/auth/me')
  return data.user
}

export async function updateMe(input: Pick<User, 'horasEstudioDiarias'>) {
  const { data } = await api.patch<{ user: User }>('/auth/me', input)
  return data.user
}

/** Cambia el nombre; pide la contraseña de la cuenta. */
export async function cambiarNombre(nombre: string, password: string) {
  const { data } = await api.patch<{ user: User }>('/auth/me/nombre', { nombre, password })
  return data.user
}

/** Cambia el email de acceso; pide la contraseña de la cuenta. */
export async function cambiarEmail(email: string, password: string) {
  const { data } = await api.patch<{ user: User }>('/auth/me/email', { email, password })
  return data.user
}

/** Foto de perfil como data URL (ver lib/imagen). */
export async function cambiarFoto(foto: string) {
  const { data } = await api.put<{ user: User }>('/auth/me/foto', { foto })
  return data.user
}

export async function quitarFoto() {
  const { data } = await api.delete<{ user: User }>('/auth/me/foto')
  return data.user
}

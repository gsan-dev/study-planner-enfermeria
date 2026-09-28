import type { Notificacion, PreferenciasNotificaciones } from '../types/models'
import { api } from './api'

export async function listNotificaciones(opciones: { limite?: number; soloNoLeidas?: boolean } = {}, signal?: AbortSignal) {
  const { data } = await api.get<{ notificaciones: Notificacion[]; noLeidas: number }>('/notificaciones', {
    params: { limite: opciones.limite ?? 30, soloNoLeidas: opciones.soloNoLeidas ? 'true' : 'false' },
    signal,
  })
  return data
}

export async function marcarLeida(id: string, leida = true) {
  const { data } = await api.patch<{ notificacion: Notificacion }>(`/notificaciones/${id}/leer`, { leida })
  return data.notificacion
}

export async function marcarTodasLeidas() {
  await api.patch('/notificaciones/leer-todas')
}

export async function borrarNotificacion(id: string) {
  await api.delete(`/notificaciones/${id}`)
}

export async function crearRecordatorio(input: { titulo: string; mensaje: string; url?: string }) {
  const { data } = await api.post<{ notificacion: Notificacion }>('/notificaciones', input)
  return data.notificacion
}

/** Envía una notificación de prueba; devuelve a cuántos dispositivos. */
export async function enviarPrueba() {
  const { data } = await api.post<{ dispositivos: number }>('/notificaciones/prueba')
  return data.dispositivos
}

export async function getPreferencias() {
  const { data } = await api.get<{ preferencias: PreferenciasNotificaciones }>('/notificaciones/preferencias')
  return data.preferencias
}

export async function guardarPreferencias(preferencias: PreferenciasNotificaciones) {
  const { data } = await api.put<{ preferencias: PreferenciasNotificaciones }>('/notificaciones/preferencias', preferencias)
  return data.preferencias
}

// --- Push

export async function getClavePublica() {
  const { data } = await api.get<{ clavePublica: string }>('/notificaciones/push/clave')
  return data.clavePublica
}

export async function guardarSuscripcion(suscripcion: PushSubscriptionJSON, dispositivo: string, zonaHoraria: string) {
  await api.post('/notificaciones/push/suscripciones', { ...suscripcion, dispositivo, zonaHoraria })
}

export async function borrarSuscripcion(endpoint: string) {
  await api.delete('/notificaciones/push/suscripciones', { data: { endpoint } })
}

export async function contarDispositivos() {
  const { data } = await api.get<{ suscripciones: unknown[] }>('/notificaciones/push/suscripciones')
  return data.suscripciones.length
}

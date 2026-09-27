import type { AgendaResponse } from '../types/api'
import type { Animo, EntradaDiario, Tarea } from '../types/models'
import { api } from './api'

/** Todo lo de un rango de días (YYYY-MM-DD). Con `hoy`, también las tareas pendientes de antes. */
export async function getAgenda(desde: string, hasta: string, hoy?: string, signal?: AbortSignal) {
  const { data } = await api.get<AgendaResponse>('/agenda', { params: { desde, hasta, hoy }, signal })
  return data
}

export async function crearTarea(input: { fecha: string; texto: string; hora?: string }) {
  const { data } = await api.post<{ tarea: Tarea }>('/agenda/tareas', input)
  return data.tarea
}

/** `hora: ''` quita la hora. */
export async function actualizarTarea(
  id: string,
  cambios: Partial<{ fecha: string; texto: string; hora: string; hecho: boolean }>,
) {
  const { data } = await api.patch<{ tarea: Tarea }>(`/agenda/tareas/${id}`, cambios)
  return data.tarea
}

export async function borrarTarea(id: string) {
  await api.delete(`/agenda/tareas/${id}`)
}

/** Guarda la entrada del diario del día; sin texto ni ánimo se borra (devuelve null). */
export async function guardarDiario(fecha: string, texto: string, animo: Animo | null) {
  const { data } = await api.put<{ entrada: EntradaDiario | null }>(`/agenda/diario/${fecha}`, { texto, animo })
  return data.entrada
}

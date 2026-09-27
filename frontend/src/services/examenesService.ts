import type { ExamenConResumen, ExamenDetalles, ExamenInput } from '../types/api'
import { api } from './api'

export async function listExamenes(signal?: AbortSignal) {
  // Se piden todos (próximos y pasados): la página los separa y el calendario los necesita todos.
  const { data } = await api.get<{ examenes: ExamenConResumen[] }>('/examenes', {
    params: { estado: 'todos' },
    signal,
  })
  return data.examenes
}

export async function getExamenDetalles(id: string, signal?: AbortSignal) {
  const { data } = await api.get<ExamenDetalles>(`/examenes/${id}/detalles`, { signal })
  return data
}

export async function createExamen(input: ExamenInput) {
  const { data } = await api.post<{ examen: ExamenConResumen }>('/examenes', input)
  return data.examen
}

export async function updateExamen(id: string, input: ExamenInput) {
  const { data } = await api.put<{ examen: ExamenConResumen }>(`/examenes/${id}`, input)
  return data.examen
}

export async function setTemasExamen(id: string, temas: string[]) {
  const { data } = await api.post<{ examen: ExamenConResumen }>(`/examenes/${id}/temas`, { temas })
  return data.examen
}

export async function deleteExamen(id: string) {
  await api.delete(`/examenes/${id}`)
}

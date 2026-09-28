import type { Asignatura, AsignaturaInput, Tema, TemaInput } from '../types/api'
import { api } from './api'

export type FiltroArchivadas = 'false' | 'true' | 'todas'

export async function listAsignaturas(archivadas: FiltroArchivadas = 'false', signal?: AbortSignal) {
  const { data } = await api.get<{ asignaturas: Asignatura[] }>('/asignaturas', {
    params: { archivadas },
    signal,
  })
  return data.asignaturas
}

export async function getAsignatura(id: string, signal?: AbortSignal) {
  const { data } = await api.get<{ asignatura: Asignatura }>(`/asignaturas/${id}`, { signal })
  return data.asignatura
}

export async function createAsignatura(input: AsignaturaInput) {
  const { data } = await api.post<{ asignatura: Asignatura }>('/asignaturas', input)
  return data.asignatura
}

export async function updateAsignatura(id: string, input: AsignaturaInput) {
  const { data } = await api.put<{ asignatura: Asignatura }>(`/asignaturas/${id}`, input)
  return data.asignatura
}

export async function archivarAsignatura(id: string, archivada: boolean) {
  const { data } = await api.patch<{ asignatura: Asignatura }>(`/asignaturas/${id}/archivar`, { archivada })
  return data.asignatura
}

export async function deleteAsignatura(id: string) {
  await api.delete(`/asignaturas/${id}`)
}

// --- Temario

export async function listTemas(asignaturaId: string, signal?: AbortSignal) {
  const { data } = await api.get<{ temas: Tema[] }>(`/asignaturas/${asignaturaId}/temas`, { signal })
  return data.temas
}

export async function createTema(asignaturaId: string, input: TemaInput) {
  const { data } = await api.post<{ tema: Tema }>(`/asignaturas/${asignaturaId}/temas`, input)
  return data.tema
}

export async function updateTema(id: string, input: TemaInput) {
  const { data } = await api.put<{ tema: Tema }>(`/temas/${id}`, input)
  return data.tema
}

export async function marcarTemaEstudiado(id: string, estudiado: boolean) {
  const { data } = await api.patch<{ tema: Tema }>(`/temas/${id}/marcar-estudiado`, { estudiado })
  return data.tema
}

export async function deleteTema(id: string) {
  await api.delete(`/temas/${id}`)
}

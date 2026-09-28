import type {
  EstadisticasTema,
  EvolucionDia,
  PeriodoProgreso,
  PrediccionExamen,
  ProgresoAsignatura,
  RegistrarHorasInput,
  RegistroProgreso,
  ResumenProgreso,
  SemanaEstadisticas,
} from '../types/api'
import { api } from './api'

export async function registrarHoras(input: RegistrarHorasInput) {
  const { data } = await api.post<{ registro: RegistroProgreso }>('/progreso/registrar-horas', input)
  return data.registro
}

export async function listRegistros(limite = 20, signal?: AbortSignal) {
  const { data } = await api.get<{ registros: RegistroProgreso[] }>('/progreso', { params: { limite }, signal })
  return data.registros
}

export async function borrarRegistro(id: string) {
  await api.delete(`/progreso/${id}`)
}

export async function getResumenProgreso(hoy: string, signal?: AbortSignal) {
  const { data } = await api.get<ResumenProgreso>('/progreso/resumen', { params: { hoy }, signal })
  return data
}

export async function getProgresoPorAsignatura(periodo: PeriodoProgreso, hoy: string, signal?: AbortSignal) {
  const { data } = await api.get<{ asignaturas: ProgresoAsignatura[]; horasTotales: number }>('/progreso/por-asignatura', {
    params: { periodo, hoy },
    signal,
  })
  return data
}

/** Semana (lunes a domingo) que contiene `dia`. */
export async function getSemanaEstadisticas(dia: string, signal?: AbortSignal) {
  const { data } = await api.get<SemanaEstadisticas>('/estadisticas/semana-actual', { params: { hoy: dia }, signal })
  return data
}

export async function getEstadisticasPorTema(asignaturaId: string, signal?: AbortSignal) {
  const { data } = await api.get<{ temas: EstadisticasTema[]; horasSinTema: number }>('/estadisticas/por-tema', {
    params: { asignaturaId },
    signal,
  })
  return data
}

export async function getEvolucion(desde: string, hasta: string, signal?: AbortSignal) {
  const { data } = await api.get<{ dias: EvolucionDia[] }>('/estadisticas/evolucion', { params: { desde, hasta }, signal })
  return data.dias
}

export async function getPrediccion(hoy: string, signal?: AbortSignal) {
  const { data } = await api.get<{ examenes: PrediccionExamen[] }>('/estadisticas/prediccion', { params: { hoy }, signal })
  return data.examenes
}

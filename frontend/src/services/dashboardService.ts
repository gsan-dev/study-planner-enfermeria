import type { CalendarioMes, DashboardResponse } from '../types/api'
import { api } from './api'

export async function getDashboard(hoy: string, signal?: AbortSignal) {
  const { data } = await api.get<DashboardResponse>('/dashboard', { params: { hoy }, signal })
  return data
}

/** Información por día de la cuadrícula del mes (`mes` = "YYYY-MM"). */
export async function getCalendarioMes(mes: string, signal?: AbortSignal) {
  const { data } = await api.get<CalendarioMes>('/calendario/mes', { params: { mes }, signal })
  return data
}

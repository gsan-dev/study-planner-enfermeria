import type { ParametrosPlan, PlanPreview, PlanResumenLista, ResumenPlan, SesionInput } from '../types/api'
import type { DiaPlan, ID, PlanEstudio } from '../types/models'
import { api } from './api'

export async function listPlanes(signal?: AbortSignal) {
  const { data } = await api.get<{ planes: PlanResumenLista[] }>('/plan-estudio', { signal })
  return data.planes
}

export async function getPlan(examenId: string, signal?: AbortSignal) {
  const { data } = await api.get<{ plan: PlanEstudio | null }>(`/plan-estudio/${examenId}`, { signal })
  return data.plan
}

/** Vista previa del plan automático (no guarda nada). */
export async function generarPlan(examenId: string, parametros: ParametrosPlan) {
  const { data } = await api.post<{ plan: PlanPreview; resumen: ResumenPlan }>('/plan-estudio/generar-automatico', {
    examenId,
    ...parametros,
    guardar: false,
  })
  return data
}

/** Guarda un plan (hecho a mano o la vista previa del generador). Sustituye al anterior. */
export async function guardarPlan(
  examenId: string,
  input: ParametrosPlan & { tipo: PlanEstudio['tipo']; diasPlan: SesionInput[] },
) {
  const { data } = await api.post<{ plan: PlanEstudio }>('/plan-estudio/crear-manual', { examenId, ...input })
  return data.plan
}

export async function actualizarSesion(
  planId: string,
  diaId: string,
  cambios: Partial<Pick<DiaPlan, 'completado' | 'horas' | 'tipo' | 'notas'>> & { temaId?: ID; fecha?: string },
) {
  const { data } = await api.put<{ plan: PlanEstudio; temaEstudiado: ID | null }>(`/plan-estudio/${planId}/dia`, {
    diaId,
    ...cambios,
  })
  return data
}

export async function deletePlan(planId: string) {
  await api.delete(`/plan-estudio/${planId}`)
}

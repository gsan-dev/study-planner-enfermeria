import type { HealthResponse } from '../types/api'
import { api } from './api'

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health', { signal })
  return data
}

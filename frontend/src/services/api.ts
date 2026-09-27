import axios, { AxiosError } from 'axios'
import { config } from '../config'
import type { ApiErrorBody } from '../types/api'

export const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
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

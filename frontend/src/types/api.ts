import type { Asignatura, Horario, Tema, User } from './models'

export interface ApiErrorBody {
  error: {
    message: string
    code: string
    details?: Record<string, string>
  }
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  database: 'connected' | 'disconnected'
  uptime: number
  startedAt: string
  version: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface AsignaturaInput {
  nombre: string
  profesor?: string
  creditos?: number | null
  horarios: Horario[]
  color: string
}

export interface TemaInput {
  nombre: string
  dificultad: Tema['dificultad']
  horasEstimadas: number
}

export type { Asignatura, Tema, User }

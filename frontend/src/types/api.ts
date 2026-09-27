import type { Asignatura, Examen, Horario, ID, Tema, TipoExamen, User } from './models'

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

export interface ExamenInput {
  asignaturaId: ID
  tipo: TipoExamen
  titulo?: string
  fecha: string // YYYY-MM-DD
  hora?: string
  peso?: number | null
  temas?: ID[]
  aula?: string
  notas?: string
}

/** Examen tal como lo devuelve el API: con su asignatura y cuántos temas están estudiados. */
export interface ExamenConResumen extends Examen {
  asignatura: Pick<Asignatura, '_id' | 'nombre' | 'color' | 'archivada'> | null
  resumenTemas: { total: number; estudiados: number }
}

export interface ExamenDetalles {
  examen: ExamenConResumen
  asignatura: Asignatura
  /** Temas que entran, en el orden del temario. */
  temas: Tema[]
  /** Temario completo de la asignatura. */
  temario: Tema[]
}

export type { Asignatura, Examen, Tema, User }

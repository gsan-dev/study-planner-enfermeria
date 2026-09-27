import type { Asignatura, DiaPlan, DiaSemana, Examen, Horario, ID, PlanEstudio, Tema, TipoExamen, TipoSesion, User } from './models'

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

export interface ParametrosPlan {
  horasPorDia?: number
  fechaInicio?: string // YYYY-MM-DD
  diasDescanso?: DiaSemana[]
  repaso?: boolean
  incluirEstudiados?: boolean
}

export interface ResumenPlan {
  dias: number
  diasConEstudio: number
  horasNecesarias: number
  horasDisponibles: number
  horasPlanificadas: number
  temasEstudio: number
  temasRepaso: number
  avisos: string[]
}

/** Vista previa del generador: aún sin guardar (las sesiones nuevas no tienen _id). */
export type SesionPreview = Omit<DiaPlan, '_id'> & { _id?: ID }
export type PlanPreview = Omit<PlanEstudio, '_id' | 'userId' | 'diasPlan' | 'porcentajeCompletado' | 'createdAt' | 'updatedAt'> & {
  diasPlan: SesionPreview[]
}

export interface SesionInput {
  fecha: string // YYYY-MM-DD
  temaId: ID
  horas: number
  tipo: TipoSesion
  completado?: boolean
  notas?: string
}

export interface PlanResumenLista {
  _id: ID
  examenId: ID
  tipo: PlanEstudio['tipo']
  horasPorDia?: number
  sesiones: number
  porcentajeCompletado: number
  horasTotales: number
  horasCompletadas: number
  proximaSesion: string | null
  sesionesAtrasadas: number
  updatedAt: string
}

export type { Asignatura, Examen, PlanEstudio, Tema, User }

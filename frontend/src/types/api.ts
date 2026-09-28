import type {
  Asignatura,
  DiaPlan,
  DiaSemana,
  EntradaDiario,
  Examen,
  Horario,
  ID,
  PlanEstudio,
  Tarea,
  Tema,
  TipoExamen,
  TipoSesion,
  User,
} from './models'

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

/** Sesión de un plan de estudio vista desde la agenda. */
export interface SesionAgenda extends DiaPlan {
  planId: ID
  examenId: ID
  tema: string
  asignatura: Pick<Asignatura, '_id' | 'nombre' | 'color'> | null
}

export interface AgendaResponse {
  tareas: Tarea[]
  diario: EntradaDiario[]
  examenes: ExamenConResumen[]
  sesiones: SesionAgenda[]
  /** Tareas sin hacer de días anteriores a `hoy` (solo si se pide). */
  pendientes: Tarea[]
}

export interface ResumenPlanExamen {
  _id: ID
  porcentaje: number
  horasTotales: number
  horasCompletadas: number
}

export interface DiaSemanaResumen {
  fecha: string
  horasPlanificadas: number
  horasCompletadas: number
}

export interface DashboardResponse {
  resumen: { asignaturas: number; temas: number; examenesProximos: number; planes: number }
  proximosExamenes: (ExamenConResumen & { plan: ResumenPlanExamen | null })[]
  hoy: { fecha: string; sesiones: SesionAgenda[]; tareas: Tarea[]; tareasAtrasadas: number }
  semana: {
    desde: string
    hasta: string
    dias: DiaSemanaResumen[]
    horasPlanificadas: number
    horasCompletadas: number
    /** % de sesiones de la semana que ya tocaban y están hechas (null si aún no tocaba ninguna). */
    cumplimiento: number | null
  }
  /** Cumplimiento de todos los planes de exámenes pendientes. */
  cumplimiento: { porcentaje: number | null; atrasadas: number }
}

export interface BloqueEstudio {
  asignatura: Pick<Asignatura, '_id' | 'nombre' | 'color'> | null
  horas: number
  horasCompletadas: number
  sesiones: { _id: ID; planId: ID; examenId: ID; tema: string; horas: number; tipo: TipoSesion; completado: boolean }[]
}

export interface DiaCalendario {
  fecha: string // YYYY-MM-DD
  examenes: ExamenConResumen[]
  estudio: BloqueEstudio[]
  tareas: { total: number; hechas: number }
  diario: { animo: number | null } | null
}

export interface CalendarioMes {
  mes: string // YYYY-MM
  desde: string
  hasta: string
  dias: DiaCalendario[]
  asignaturas: Pick<Asignatura, '_id' | 'nombre' | 'color'>[]
}

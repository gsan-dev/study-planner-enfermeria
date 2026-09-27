// Tipos que reflejan los modelos de MongoDB del backend (backend/src/models).
// Las fechas llegan del API como strings ISO 8601.

export type ID = string
export type ISODate = string

interface Timestamps {
  createdAt: ISODate
  updatedAt: ISODate
}

export interface User extends Timestamps {
  _id: ID
  email: string
  nombre: string
  horasEstudioDiarias: number
}

/** 0 = domingo ... 6 = sábado */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Horario {
  dia: DiaSemana
  horaInicio: string // HH:mm
  horaFin: string // HH:mm
  aula?: string
}

export interface ResumenTemas {
  total: number
  estudiados: number
  horasEstimadas: number
}

export interface Asignatura extends Timestamps {
  _id: ID
  userId: ID
  nombre: string
  profesor?: string
  creditos?: number
  horarios: Horario[]
  color: string // #rrggbb
  archivada: boolean
  /** Calculado por el API al listar/obtener. */
  resumenTemas: ResumenTemas
}

export type Dificultad = 1 | 2 | 3 | 4 | 5

export interface Tema extends Timestamps {
  _id: ID
  userId: ID
  asignaturaId: ID
  nombre: string
  dificultad: Dificultad
  horasEstimadas: number
  estudiado: boolean
  fechaEstudiado?: ISODate
  orden: number
}

export type TipoExamen = 'parcial' | 'final' | 'practico' | 'oral' | 'test' | 'otro'

export interface Examen extends Timestamps {
  _id: ID
  userId: ID
  asignaturaId: ID
  tipo: TipoExamen
  titulo?: string
  fecha: ISODate
  hora?: string // HH:mm
  peso?: number // 0-100
  temas: ID[]
  aula?: string
  notas?: string
}

export type TipoSesion = 'estudio' | 'repaso'

export interface DiaPlan {
  _id: ID
  fecha: ISODate
  temaId: ID
  horas: number
  /** Primera vuelta al tema o repaso final. */
  tipo: TipoSesion
  completado: boolean
  completadoEn?: ISODate
  notas?: string
}

export interface PlanEstudio extends Timestamps {
  _id: ID
  userId: ID
  examenId: ID
  tipo: 'automatico' | 'manual'
  horasPorDia?: number
  fechaInicio?: ISODate
  /** 0 = domingo ... 6 = sábado */
  diasDescanso: DiaSemana[]
  repaso: boolean
  incluirEstudiados: boolean
  diasPlan: DiaPlan[]
  porcentajeCompletado: number
}

export interface Progreso extends Timestamps {
  _id: ID
  userId: ID
  fecha: ISODate
  horasEstudiadas: number
  temasEstudiados: ID[]
  asignaturaId?: ID
  planEstudioId?: ID
  notas?: string
}

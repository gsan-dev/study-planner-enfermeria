import type { DiaSemana, Horario } from '../types/models'

export const toMinutes = (hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

export const fromMinutes = (minutos: number) => {
  const clamped = Math.max(0, Math.min(minutos, 23 * 60 + 59))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

export const solapan = (a: Pick<Horario, 'dia' | 'horaInicio' | 'horaFin'>, b: Pick<Horario, 'dia' | 'horaInicio' | 'horaFin'>) =>
  a.dia === b.dia && a.horaInicio < b.horaFin && b.horaInicio < a.horaFin

/** Bloque que pinta la tabla del horario. */
export interface GridEntry {
  id: string
  dia: DiaSemana
  horaInicio: string
  horaFin: string
  titulo: string
  detalle?: string
  color: string
  /** Contexto de solo lectura (p. ej. otras asignaturas al editar una). */
  muted?: boolean
}

export interface PositionedEntry extends GridEntry {
  lane: number
  lanes: number
}

/**
 * Reparte en columnas ("carriles") los bloques que se solapan en un mismo día,
 * como hace un calendario: cada grupo de solapes se divide el ancho.
 */
export function layoutDia(entries: GridEntry[]): PositionedEntry[] {
  const sorted = [...entries].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio) || b.horaFin.localeCompare(a.horaFin))
  const result: PositionedEntry[] = []
  let grupo: PositionedEntry[] = []
  let finGrupo = ''

  const cerrarGrupo = () => {
    const lanes = Math.max(1, ...grupo.map((e) => e.lane + 1))
    grupo.forEach((e) => (e.lanes = lanes))
    result.push(...grupo)
    grupo = []
  }

  for (const entry of sorted) {
    if (grupo.length > 0 && entry.horaInicio >= finGrupo) cerrarGrupo()
    const ocupados = new Set(grupo.filter((e) => e.horaFin > entry.horaInicio).map((e) => e.lane))
    let lane = 0
    while (ocupados.has(lane)) lane += 1
    grupo.push({ ...entry, lane, lanes: 1 })
    finGrupo = grupo.length === 1 || entry.horaFin > finGrupo ? entry.horaFin : finGrupo
  }
  if (grupo.length > 0) cerrarGrupo()
  return result
}

const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'a', 'al', 'para'])

/** Abreviatura para bloques muy estrechos: "Enfermería Comunitaria" → "EC", "Farmacología" → "Far". */
export function abreviar(nombre: string): string {
  const palabras = nombre.split(/\s+/).filter((p) => p && !PALABRAS_VACIAS.has(p.toLowerCase()))
  if (palabras.length <= 1) return (palabras[0] ?? nombre).slice(0, 3)
  return palabras
    .slice(0, 3)
    .map((p) => (/^[IVX]+$|^\d+$/.test(p) ? p : p[0].toUpperCase()))
    .join('')
}

/** Normaliza un nombre para compararlo: sin tildes, mayúsculas ni signos. */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Busca la asignatura existente que mejor encaja con un nombre escaneado:
 * igual, o uno contenido en el otro ("Anatomía" ↔ "Anatomía Humana I").
 */
export function emparejarAsignatura<T extends { nombre: string }>(nombre: string, candidatas: T[]): T | undefined {
  const buscado = normalizarNombre(nombre)
  if (!buscado) return undefined
  const exacta = candidatas.find((c) => normalizarNombre(c.nombre) === buscado)
  if (exacta) return exacta
  return candidatas.find((c) => {
    const n = normalizarNombre(c.nombre)
    return n.length >= 4 && buscado.length >= 4 && (n.includes(buscado) || buscado.includes(n))
  })
}

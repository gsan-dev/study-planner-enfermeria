import { addDays } from 'date-fns'
import type { Tema, TipoSesion } from '../types/models'
import { diaKey, diaLocal, toDiaKey } from './fechas'

/** Igual que el backend (services/planGenerator.js): horas estimadas × dificultad. */
const FACTOR_DIFICULTAD: Record<number, number> = { 1: 0.7, 2: 0.85, 3: 1, 4: 1.25, 5: 1.5 }

/** Horas de estudio recomendadas para un tema (redondeadas a 15 min). */
export function horasRecomendadas(tema: Pick<Tema, 'horasEstimadas' | 'dificultad'>): number {
  const horas = Math.max(0.5, tema.horasEstimadas) * (FACTOR_DIFICULTAD[tema.dificultad] ?? 1)
  return Math.round(horas * 4) / 4
}

export const TIPO_SESION: Record<TipoSesion, string> = { estudio: 'Estudio', repaso: 'Repaso' }

interface ConFecha {
  fecha: string
}

/** Agrupa sesiones por día ("YYYY-MM-DD"), en orden. */
export function agruparPorDia<T extends ConFecha>(sesiones: T[]): { dia: string; sesiones: T[] }[] {
  const grupos = new Map<string, T[]>()
  for (const s of [...sesiones].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const dia = diaKey(s.fecha)
    const lista = grupos.get(dia) ?? []
    lista.push(s)
    grupos.set(dia, lista)
  }
  return [...grupos].map(([dia, lista]) => ({ dia, sesiones: lista }))
}

/** Días desde `inicio` (incluido) hasta `fin` (excluido), como "YYYY-MM-DD". */
export function rangoDias(inicio: string, fin: string): string[] {
  const dias: string[] = []
  for (let d = diaLocal(inicio); toDiaKey(d) < fin; d = addDays(d, 1)) dias.push(toDiaKey(d))
  return dias
}

export const sumaHoras = (sesiones: { horas: number }[]) => sesiones.reduce((a, s) => a + s.horas, 0)

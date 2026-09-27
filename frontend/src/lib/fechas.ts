import { differenceInCalendarDays, format } from 'date-fns'

// Las fechas de examen son días de calendario: el API las guarda a medianoche
// UTC ("2026-10-15T00:00:00.000Z") y aquí se tratan como "2026-10-15", sin
// zona horaria, para que el día no cambie según dónde esté el navegador.

/** "YYYY-MM-DD" de una fecha del API. */
export const diaKey = (iso: string) => iso.slice(0, 10)

/** "YYYY-MM-DD" de una fecha local (p. ej. hoy). */
export const toDiaKey = (date: Date) => format(date, 'yyyy-MM-dd')

export const hoyKey = () => toDiaKey(new Date())

/** Fecha del API o "YYYY-MM-DD" → Date local a medianoche de ese día. */
export function diaLocal(isoOrKey: string): Date {
  const [y, m, d] = isoOrKey.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Días de calendario desde hoy (0 = hoy, negativo = ya pasó). */
export const diasHasta = (isoOrKey: string) => differenceInCalendarDays(diaLocal(isoOrKey), new Date())

export function cuentaAtras(dias: number): string {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias === -1) return 'Ayer'
  return dias > 0 ? `En ${dias} días` : `Hace ${-dias} días`
}

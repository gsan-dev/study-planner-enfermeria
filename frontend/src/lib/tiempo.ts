import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'

/** "ahora", "hace 5 minutos", "hace 2 días"… */
export function haceTiempo(iso: string): string {
  const fecha = new Date(iso)
  if (Date.now() - fecha.getTime() < 60_000) return 'ahora'
  return formatDistanceToNowStrict(fecha, { locale: es, addSuffix: true })
}

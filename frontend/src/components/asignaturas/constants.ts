import type { TemaFormValues } from '../../schemas/tema'
import type { DiaSemana, Dificultad, Horario } from '../../types/models'

/** Días en orden de semana europea (lunes primero). 0 = domingo, como Date#getDay. */
export const DIAS: { value: DiaSemana; label: string; short: string }[] = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
]

const diaShort = new Map(DIAS.map((d) => [d.value, d.short]))
const diaOrden = new Map(DIAS.map((d, i) => [d.value, i]))

export function ordenarHorarios(horarios: Horario[]): Horario[] {
  return [...horarios].sort(
    (a, b) => (diaOrden.get(a.dia) ?? 0) - (diaOrden.get(b.dia) ?? 0) || a.horaInicio.localeCompare(b.horaInicio),
  )
}

export function formatHorario(h: Horario): string {
  return `${diaShort.get(h.dia)} ${h.horaInicio}–${h.horaFin}`
}

export const COLORES = [
  { value: '#0d9488', label: 'Verde azulado' },
  { value: '#059669', label: 'Esmeralda' },
  { value: '#65a30d', label: 'Lima' },
  { value: '#d97706', label: 'Ámbar' },
  { value: '#ea580c', label: 'Naranja' },
  { value: '#e11d48', label: 'Rosa intenso' },
  { value: '#db2777', label: 'Rosa' },
  { value: '#7c3aed', label: 'Violeta' },
  { value: '#4f46e5', label: 'Índigo' },
  { value: '#0284c7', label: 'Azul' },
  { value: '#475569', label: 'Pizarra' },
] as const

export const DIFICULTADES: { value: Dificultad; label: string }[] = [
  { value: 1, label: '1 · Muy fácil' },
  { value: 2, label: '2 · Fácil' },
  { value: 3, label: '3 · Media' },
  { value: 4, label: '4 · Difícil' },
  { value: 5, label: '5 · Muy difícil' },
]

export const emptyTema = (): TemaFormValues => ({ nombre: '', dificultad: '3', horasEstimadas: '2' })

export function formatHoras(horas: number): string {
  // Hasta 2 decimales: los planes van de 15 en 15 minutos (1,25 h).
  const texto = String(Math.round(horas * 100) / 100).replace('.', ',')
  return `${texto} h`
}

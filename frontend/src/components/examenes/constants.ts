import type { TipoExamen } from '../../types/models'

export const TIPOS_EXAMEN: { value: TipoExamen; label: string }[] = [
  { value: 'parcial', label: 'Parcial' },
  { value: 'final', label: 'Final' },
  { value: 'practico', label: 'Práctico' },
  { value: 'oral', label: 'Oral' },
  { value: 'test', label: 'Test' },
  { value: 'otro', label: 'Otro' },
]

const tipoLabel = new Map(TIPOS_EXAMEN.map((t) => [t.value, t.label]))

export const labelTipo = (tipo: TipoExamen) => tipoLabel.get(tipo) ?? tipo

/** Título a mostrar: el propio, o "Parcial de Anatomía". */
export function nombreExamen(examen: { tipo: TipoExamen; titulo?: string }, asignatura?: string): string {
  if (examen.titulo) return examen.titulo
  const tipo = labelTipo(examen.tipo)
  if (examen.tipo === 'otro') return asignatura ? `Examen de ${asignatura}` : 'Examen'
  return asignatura ? `${tipo} de ${asignatura}` : tipo
}

/** Estilo de la cuenta atrás según lo cerca que esté el examen. */
export function urgencia(dias: number): string {
  if (dias < 0) return 'bg-slate-100 text-slate-500'
  if (dias <= 3) return 'bg-rose-100 text-rose-700'
  if (dias <= 7) return 'bg-amber-100 text-amber-800'
  return 'bg-brand-50 text-brand-800'
}

import type { TipoNotificacion } from '../../types/models'
import { BellIcon, CalendarIcon, CheckIcon, ChecklistIcon, ClockIcon } from '../icons'

const ESTILO: Record<TipoNotificacion, { Icono: typeof BellIcon; clase: string }> = {
  examen_7d: { Icono: CalendarIcon, clase: 'bg-brand-50 text-brand-700' },
  examen_3d: { Icono: CalendarIcon, clase: 'bg-amber-50 text-amber-700' },
  examen_1d: { Icono: CalendarIcon, clase: 'bg-rose-50 text-rose-700' },
  plan_diario: { Icono: ChecklistIcon, clase: 'bg-brand-50 text-brand-700' },
  plan_retraso: { Icono: ClockIcon, clase: 'bg-amber-50 text-amber-700' },
  plan_completado: { Icono: CheckIcon, clase: 'bg-emerald-50 text-emerald-700' },
  prueba: { Icono: BellIcon, clase: 'bg-slate-100 text-slate-600' },
  general: { Icono: BellIcon, clase: 'bg-slate-100 text-slate-600' },
}

/** Icono redondo según el tipo de aviso. */
export function IconoTipo({ tipo }: { tipo: TipoNotificacion }) {
  const { Icono, clase } = ESTILO[tipo] ?? ESTILO.general
  return (
    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${clase}`} aria-hidden="true">
      <Icono className="size-5" />
    </span>
  )
}

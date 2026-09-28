import type { ComponentType, SVGProps } from 'react'
import {
  BookIcon,
  CalendarMonthIcon,
  CalendarIcon,
  ChartIcon,
  ChecklistIcon,
  HomeIcon,
  NotebookIcon,
  SettingsIcon,
  TableIcon,
} from '../icons'

export interface NavItem {
  to: string
  label: string
  /** Etiqueta corta para la barra inferior del móvil. */
  shortLabel?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** No cabe en la barra inferior del móvil (sigue en el menú lateral). */
  hideInBottomNav?: boolean
}

/** Secciones principales: aparecen en sidebar y (salvo excepciones) en la barra inferior del móvil. */
export const primaryNav: NavItem[] = [
  { to: '/', label: 'Inicio', icon: HomeIcon },
  { to: '/agenda', label: 'Agenda', icon: NotebookIcon },
  { to: '/calendario', label: 'Calendario', icon: CalendarMonthIcon, hideInBottomNav: true },
  { to: '/asignaturas', label: 'Asignaturas', icon: BookIcon },
  { to: '/horario', label: 'Horario', icon: TableIcon, hideInBottomNav: true },
  { to: '/examenes', label: 'Exámenes', icon: CalendarIcon },
  { to: '/plan', label: 'Plan de estudio', shortLabel: 'Plan', icon: ChecklistIcon },
  // En la barra inferior solo caben 5: Progreso queda en el menú lateral.
  { to: '/progreso', label: 'Progreso', icon: ChartIcon, hideInBottomNav: true },
]

/** Secciones secundarias: solo en sidebar y en el menú lateral del móvil. */
export const secondaryNav: NavItem[] = [{ to: '/ajustes', label: 'Ajustes', icon: SettingsIcon }]

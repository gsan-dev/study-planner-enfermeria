import type { ComponentType, SVGProps } from 'react'
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ChecklistIcon,
  HomeIcon,
  SettingsIcon,
} from '../icons'

export interface NavItem {
  to: string
  label: string
  /** Etiqueta corta para la barra inferior del móvil. */
  shortLabel?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

/** Secciones principales: aparecen en sidebar y en la barra inferior del móvil. */
export const primaryNav: NavItem[] = [
  { to: '/', label: 'Inicio', icon: HomeIcon },
  { to: '/asignaturas', label: 'Asignaturas', icon: BookIcon },
  { to: '/examenes', label: 'Exámenes', icon: CalendarIcon },
  { to: '/plan', label: 'Plan de estudio', shortLabel: 'Plan', icon: ChecklistIcon },
  { to: '/progreso', label: 'Progreso', icon: ChartIcon },
]

/** Secciones secundarias: solo en sidebar y en el menú lateral del móvil. */
export const secondaryNav: NavItem[] = [{ to: '/ajustes', label: 'Ajustes', icon: SettingsIcon }]

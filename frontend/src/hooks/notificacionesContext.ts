import { createContext, useContext } from 'react'
import type { Notificacion } from '../types/models'

export interface NotificacionesState {
  /** Las más recientes (para la campana). */
  recientes: Notificacion[]
  noLeidas: number
  recargar: () => void
  marcarLeida: (id: string) => Promise<void>
  marcarTodas: () => Promise<void>
  /** Marca como leída y va a su pantalla. */
  abrir: (notificacion: Notificacion) => void
}

export const NotificacionesContext = createContext<NotificacionesState>({
  recientes: [],
  noLeidas: 0,
  recargar: () => {},
  marcarLeida: async () => {},
  marcarTodas: async () => {},
  abrir: () => {},
})

export const useNotificaciones = () => useContext(NotificacionesContext)

import { createContext, useContext } from 'react'

export interface ServiceWorkerState {
  updateAvailable: boolean
  applyUpdate: () => void
}

export const ServiceWorkerContext = createContext<ServiceWorkerState>({
  updateAvailable: false,
  applyUpdate: () => {},
})

export const useServiceWorkerState = () => useContext(ServiceWorkerContext)

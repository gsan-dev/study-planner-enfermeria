import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { ServiceWorkerContext } from './hooks/serviceWorkerContext'
import { useServiceWorker } from './hooks/useServiceWorker'
import { DashboardPage } from './pages/DashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AjustesPage, AsignaturasPage, ExamenesPage, PlanPage, ProgresoPage } from './pages/sections'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'asignaturas', element: <AsignaturasPage /> },
      { path: 'examenes', element: <ExamenesPage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'progreso', element: <ProgresoPage /> },
      { path: 'ajustes', element: <AjustesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  // Registro del service worker (PWA / offline).
  const serviceWorker = useServiceWorker()

  return (
    <ServiceWorkerContext value={serviceWorker}>
      <RouterProvider router={router} />
    </ServiceWorkerContext>
  )
}

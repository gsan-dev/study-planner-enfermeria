import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth/AuthProvider'
import { RedirectIfAuthenticated, RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/layout/AppLayout'
import { ServiceWorkerContext } from './hooks/serviceWorkerContext'
import { useServiceWorker } from './hooks/useServiceWorker'
import { AgendaPage } from './pages/AgendaPage'
import { AjustesPage } from './pages/AjustesPage'
import { AsignaturaPage } from './pages/AsignaturaPage'
import { AsignaturasPage } from './pages/AsignaturasPage'
import { CalendarioPage } from './pages/CalendarioPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExamenesPage } from './pages/ExamenesPage'
import { HorarioPage } from './pages/HorarioPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { PlanExamenPage } from './pages/PlanExamenPage'
import { PlanPage } from './pages/PlanPage'
import { ProgresoPage } from './pages/sections'

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RedirectIfAuthenticated>
        <LoginPage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: '/registro',
    element: (
      <RedirectIfAuthenticated>
        <RegisterPage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'agenda', element: <AgendaPage /> },
      { path: 'asignaturas', element: <AsignaturasPage /> },
      { path: 'asignaturas/:id', element: <AsignaturaPage /> },
      { path: 'calendario', element: <CalendarioPage /> },
      { path: 'horario', element: <HorarioPage /> },
      { path: 'examenes', element: <ExamenesPage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'plan/:examenId', element: <PlanExamenPage /> },
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
      <AuthProvider>
        <RouterProvider router={router} />
        {/* Arriba en móvil para no tapar la barra de navegación inferior. */}
        <Toaster position="top-center" richColors closeButton offset={16} mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }} />
      </AuthProvider>
    </ServiceWorkerContext>
  )
}

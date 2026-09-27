import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth/AuthProvider'
import { RedirectIfAuthenticated, RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/layout/AppLayout'
import { ServiceWorkerContext } from './hooks/serviceWorkerContext'
import { useServiceWorker } from './hooks/useServiceWorker'
import { AjustesPage } from './pages/AjustesPage'
import { AsignaturasPage } from './pages/AsignaturasPage'
import { DashboardPage } from './pages/DashboardPage'
import { HorarioPage } from './pages/HorarioPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { ExamenesPage, PlanPage, ProgresoPage } from './pages/sections'

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
      { path: 'asignaturas', element: <AsignaturasPage /> },
      { path: 'horario', element: <HorarioPage /> },
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
      <AuthProvider>
        <RouterProvider router={router} />
        {/* Arriba en móvil para no tapar la barra de navegación inferior. */}
        <Toaster position="top-center" richColors closeButton offset={16} mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }} />
      </AuthProvider>
    </ServiceWorkerContext>
  )
}

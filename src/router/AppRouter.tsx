import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AppLayout } from '../components/AppLayout'
import { CenteredLoader } from '../components/LoadingSkeleton'

// ✅ OPTIMIZACIÓN: Lazy loading de todas las páginas
// Auth Pages (críticas, se cargan inmediatamente)
import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'

// Pages con lazy loading
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'))
const ClientsPage = lazy(() => import('../pages/ClientsPage'))
const StaffPage = lazy(() => import('../pages/StaffPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))
const OrganizationsPage = lazy(() => import('../pages/admin/OrganizationsPage'))
const OrganizationDetailsPage = lazy(() => import('../pages/admin/OrganizationDetailsPage'))
const ServicesPage = lazy(() => import('../pages/ServicesPage'))
const CalendarPage = lazy(() => import('../pages/CalendarPage'))
const FinancePage = lazy(() => import('../pages/FinancePage'))
const ClassesPage = lazy(() => import('../pages/ClassesPage'))

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Cargando sistema...</div>
      </div>
    )
  }

  return (
    <Routes>
      {/* ========================================================= */}
      {/* 🔓 RUTAS PÚBLICAS (Sin Layout, Sin Protección)           */}
      {/* ========================================================= */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />}
      />

      {/* ========================================================= */}
      {/* 🛡️ RUTAS PRIVADAS (Layout Wrapper)                        */}
      {/* ========================================================= */}
      {/* Truco Pro: Usamos una ruta sin path que envuelve a las demás.
          Esto renderiza el Layout y la Protección UNA SOLA VEZ para todos los hijos.
          <Outlet /> es donde se pintarán las rutas hijas.
      */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout>
              {/* ✅ Suspense para lazy loading */}
              <Suspense fallback={<CenteredLoader message="Cargando página..." />}>
                <Outlet /> 
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        }
      >
        
        {/* 1. DASHBOARD (Switcher Automático) */}
        <Route 
          path="/dashboard" 
          element={profile?.role === 'super_admin' ? <AdminDashboard /> : <DashboardPage />} 
        />

        {/* 2. RUTAS COMUNES (Para todos los roles) */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/services" element={<ServicesPage />}/>
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/finance" element={<FinancePage />} />
        
        {/* 3. RUTAS OPERATIVAS (Owner & Staff) */}
        {/* Podrías agregar una validación extra aquí si el Super Admin no debe ver esto */}
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/staff" element={<StaffPage />} />


        {/* 4. RUTAS DE SUPER ADMIN */}
        {profile?.role === 'super_admin' && (
          <Route path="admin">
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="organizations/:id" element={<OrganizationDetailsPage />} />
            <Route path="subscriptions" element={<div className="p-8 text-zinc-400">🚧 Suscripciones</div>} />
          </Route>
        )}

      </Route> 
      {/* Fin del Wrapper Privado */}

      {/* Ruta por defecto (Catch-all) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
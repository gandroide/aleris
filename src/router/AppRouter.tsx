import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AppLayout } from '../components/AppLayout'

// Pages
import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'
import { DashboardPage } from '../pages/DashboardPage' // Owner/Staff
import { AdminDashboard } from '../pages/AdminDashboard' // Super Admin
import { ClientsPage } from '../pages/ClientsPage'
import { StaffPage } from '../pages/StaffPage'
import { SettingsPage } from '../pages/SettingsPage' // 👈 NUEVA PÁGINA
import { OrganizationsPage } from '../pages/admin/OrganizationsPage'
import { OrganizationDetailsPage } from '../pages/admin/OrganizationDetailsPage'
import { ServicesPage } from '../pages/ServicesPage'
import { CalendarPage } from '../pages/CalendarPage'
import { FinancePage } from '../pages/FinancePage'

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
              {/* Outlet renderiza el componente hijo correspondiente a la ruta */}
              <Outlet /> 
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
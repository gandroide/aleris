import { useAuth } from '../contexts/AuthContext'
import { AdminDashboard } from '../pages/AdminDashboard'
import { DashboardPage } from '../pages/DashboardPage'


export function DashboardSwitcher() {
  const { profile, loading } = useAuth()

  if (loading) return null // O tu spinner de carga

  // SI ES SUPER ADMIN -> Panel de Control SaaS
  if (profile?.role === 'super_admin') {
    return <AdminDashboard />
  }

  // SI ES CUALQUIER OTRO -> Dashboard del Estudio
  return <DashboardPage />
}
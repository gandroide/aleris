import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Menu, X, LogOut, 
  // Iconos Generales
  Home, Settings, Tag, Calendar, Wallet, // 👈 Agregamos Wallet
  // Iconos para Estudio (Owner/Staff)
  Users, UserCog, 
  // Iconos para Super Admin
  Building2, CreditCard 
} from 'lucide-react'

interface AppLayoutProps {
  readonly children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const location = useLocation()

  // 1. LÓGICA DE MENÚ POR ROLES 🧠
  const getMenuItems = () => {
    // A) SUPER ADMIN (Tu vista SaaS)
    if (profile?.role === 'super_admin') {
      return [
        { icon: Home, label: 'Dashboard SaaS', path: '/dashboard' },
        { icon: Building2, label: 'Organizaciones', path: '/admin/organizations' }, 
        { icon: CreditCard, label: 'Suscripciones', path: '/admin/subscriptions' }, 
        { icon: Settings, label: 'Config. Global', path: '/admin/settings' },
      ]
    }

    // B) STAFF / ADMINISTRATIVO (Vista Operativa Limitada)
    if ((profile?.role as any) === 'staff') {
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Calendar, label: 'Agenda', path: '/calendar' }, 
        { icon: Wallet, label: 'Caja / Finanzas', path: '/finance' }, // 👈 NUEVO: Acceso a Caja
        { icon: Users, label: 'Alumnos / Clientes', path: '/clients' },
        { icon: UserCog, label: 'Profesores', path: '/staff' }, 
        { icon: Tag, label: 'Ventas y Servicios', path: '/services' },
      ]
    }

    // C) OWNER (Dueño del Negocio - Vista Completa)
    return [
      { icon: Home, label: 'Dashboard', path: '/dashboard' },
      { icon: Calendar, label: 'Agenda', path: '/calendar' }, 
      { icon: Wallet, label: 'Tesorería', path: '/finance' }, // 👈 NUEVO: Acceso a Finanzas
      { icon: Users, label: 'Clientes', path: '/clients' },
      { icon: UserCog, label: 'Personal', path: '/staff' },
      { icon: Tag, label: 'Servicios', path: '/services' },
      { icon: Settings, label: 'Configuración', path: '/settings' },
    ]
  }

  const menuItems = getMenuItems()
  const isActive = (path: string) => location.pathname === path

  // Helper para mostrar rol bonito
  const formatRole = (role?: string) => {
    if (role === 'super_admin') return '👑 Super Admin'
    if (role === 'owner') return '⭐ Dueño / Gerente'
    if ((role as any) === 'staff') return '🛡️ Administrativo'
    return role
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar Desktop (oculto en móvil) */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 bg-zinc-900 border-r border-zinc-800">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-white tracking-wider">
              {profile?.role === 'super_admin' ? 'ALERIS.admin' : 'ALERIS.ops'}
            </h1>
          </div>
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-2 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-zinc-800 text-white border-l-4 border-emerald-500' 
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive(item.path) ? 'text-emerald-500' : 'text-zinc-500 group-hover:text-white'}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          
          {/* Perfil Footer */}
          <div className="flex-shrink-0 flex border-t border-zinc-800 p-4 bg-zinc-900/50">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || profile?.email || 'Usuario'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate capitalize">
                    {formatRole(profile?.role)}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="ml-2 p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-full hover:bg-zinc-800"
                  aria-label="Cerrar sesión"
                  title="Cerrar Sesión"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Header Mobile */}
        <header className="md:hidden bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <h1 className="text-lg font-bold text-white">
             {profile?.role === 'super_admin' ? 'ALERIS.admin' : 'ALERIS.ops'}
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Menú"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Sidebar Mobile (overlay) */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 md:hidden shadow-2xl">
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <div className="flex items-center justify-between px-4 mb-5">
                  <h1 className="text-xl font-bold text-white">Menú</h1>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <nav className="flex-1 px-2 space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center px-2 py-3 text-sm font-medium rounded-md transition-colors ${
                          isActive(item.path)
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
                <div className="flex-shrink-0 flex border-t border-zinc-800 p-4">
                  <div className="flex items-center w-full">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                           {profile?.full_name || profile?.email}
                        </p>
                        <p className="text-xs text-zinc-500 capitalize">
                           {formatRole(profile?.role)}
                        </p>
                      </div>
                      <button onClick={signOut}>
                        <LogOut className="h-5 w-5 text-zinc-400" />
                      </button>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Área de contenido */}
        <main className="flex-1 overflow-y-auto bg-zinc-950">
          <div className="py-6 pb-24 md:pb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>

        {/* Bottom Tab Bar Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 safe-area-inset-bottom z-30">
          <div className="flex justify-around items-center h-16 px-2">
            {menuItems.slice(0, 4).map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center flex-1 min-h-[44px] transition-colors ${
                    isActive(item.path)
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${isActive(item.path) ? 'text-emerald-500' : ''}`} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
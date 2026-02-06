import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
 X, LogOut, 
  Home, Settings, Tag, Calendar, CalendarDays, Wallet, 
  Users, UserCog, Building2, CreditCard, MoreHorizontal 
} from 'lucide-react'

interface AppLayoutProps {
  readonly children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const location = useLocation()

  // 1. LÓGICA DE MENÚ POR ROLES
  const getMenuItems = () => {
    if (profile?.role === 'super_admin') {
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Building2, label: 'Orgs', path: '/admin/organizations' }, 
        { icon: CreditCard, label: 'Subs', path: '/admin/subscriptions' }, 
        { icon: Settings, label: 'Config', path: '/admin/settings' },
      ]
    }

    if ((profile?.role as any) === 'staff') {
      return [
        { icon: Home, label: 'Inicio', path: '/dashboard' },
        { icon: Calendar, label: 'Agenda', path: '/calendar' }, 
        { icon: CalendarDays, label: 'Clases', path: '/classes' },
        { icon: Wallet, label: 'Caja', path: '/finance' },
        { icon: Users, label: 'Alumnos', path: '/clients' },
        { icon: UserCog, label: 'Profesores', path: '/staff' }, 
        { icon: Tag, label: 'Servicios', path: '/services' },
      ]
    }

    // Owner (Default)
    return [
      { icon: Home, label: 'Inicio', path: '/dashboard' },
      { icon: Calendar, label: 'Agenda', path: '/calendar' }, 
      { icon: CalendarDays, label: 'Clases', path: '/classes' },
      { icon: Wallet, label: 'Tesorería', path: '/finance' },
      { icon: Users, label: 'Clientes', path: '/clients' },
      { icon: UserCog, label: 'Personal', path: '/staff' },
      { icon: Tag, label: 'Servicios', path: '/services' },
      { icon: Settings, label: 'Config', path: '/settings' },
    ]
  }

  const menuItems = getMenuItems()
  // 🟢 Para móvil: Tomamos solo los 3 primeros + botón menú
  const mobilePrimaryItems = menuItems.slice(0, 3) 

  const isActive = (path: string) => location.pathname === path

  const formatRole = (role?: string) => {
    if (role === 'super_admin') return '👑 Super Admin'
    if (role === 'owner') return '⭐ Dueño / Gerente'
    if ((role as any) === 'staff') return '🛡️ Administrativo'
    return role
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      
      {/* 🖥️ SIDEBAR ESCRITORIO (Fijo a la izquierda) */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 bg-zinc-900 border-r border-zinc-800 z-50">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6 mb-4">
            <h1 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
              <span className="bg-indigo-600 h-6 w-6 rounded flex items-center justify-center text-xs">AO</span>
              {profile?.role === 'super_admin' ? 'ALERIS.admin' : 'ALERIS.ops'}
            </h1>
          </div>
          
          <nav className="flex-1 px-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-zinc-800 text-white shadow-sm border-l-2 border-indigo-500' 
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive(item.path) ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          
          {/* Perfil Footer Desktop */}
          <div className="border-t border-zinc-800 p-4 bg-zinc-900">
            <div className="flex items-center">
                <div className="h-9 w-9 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/20">
                    {profile?.full_name?.[0] || 'U'}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || 'Usuario'}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate uppercase tracking-wider">
                    {formatRole(profile?.role)}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="ml-auto p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded-md hover:bg-zinc-800"
                  title="Cerrar Sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 📱 SIDEBAR MÓVIL (Drawer / Overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop oscuro con animación */}
            <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" 
                onClick={() => setSidebarOpen(false)}
            />
            
            {/* Panel lateral mejorado */}
            <aside className="fixed inset-y-0 right-0 w-72 bg-zinc-900 shadow-2xl border-l border-zinc-800 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="bg-indigo-600 h-7 w-7 rounded flex items-center justify-center text-xs">AO</span>
                        Menú
                    </h2>
                    <button 
                        onClick={() => setSidebarOpen(false)} 
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-custom">
                    {menuItems.map((item, index) => {
                        const Icon = item.icon
                        const active = isActive(item.path)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    active
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30' 
                                    : 'text-zinc-300 hover:bg-zinc-800/80 active:bg-zinc-800'
                                }`}
                                style={{
                                    animation: `slideInFromRight 0.3s ease-out ${index * 0.05}s both`
                                }}
                            >
                                <Icon className={`mr-3 h-5 w-5 ${active ? 'text-white' : 'text-zinc-400'}`} />
                                {item.label}
                            </Link>
                        )
                    })}
                </div>

                {/* Footer con perfil y logout */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-950 space-y-3">
                    <div className="flex items-center gap-3 px-2">
                        <div className="h-10 w-10 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/20">
                            {profile?.full_name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {profile?.full_name || 'Usuario'}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                                {formatRole(profile?.role)}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={signOut}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-lg font-medium hover:bg-red-500/20 transition-all active:scale-95 border border-red-500/20"
                    >
                        <LogOut size={18} /> Cerrar Sesión
                    </button>
                </div>
            </aside>
        </div>
      )}

      {/* 📄 CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen relative">
        <main className="flex-1 bg-zinc-950 pb-24 md:pb-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>

        {/* 📱 BOTTOM NAVIGATION BAR (Solo Móvil) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 z-40 pb-safe">
          <div className="flex justify-around items-center h-16">
            
            {/* 1. Ítems Principales (Solo los 3 primeros) */}
            {mobilePrimaryItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                    active ? 'text-indigo-400' : 'text-zinc-500 active:text-zinc-300'
                  }`}
                >
                  <div className={`p-1 rounded-full transition-all ${active ? 'bg-indigo-500/10' : ''}`}>
                    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}

            {/* 2. Botón "Más" (Abre el Sidebar) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 text-zinc-500 active:text-white ${sidebarOpen ? 'text-white' : ''}`}
            >
              <div className="p-1">
                <MoreHorizontal size={20} />
              </div>
              <span className="text-[10px] font-medium">Menú</span>
            </button>

          </div>
        </nav>
      </div>
    </div>
  )
}
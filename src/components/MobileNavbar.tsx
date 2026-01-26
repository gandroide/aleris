import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Calendar, Wallet, Menu } from 'lucide-react'

interface MobileNavbarProps {
  onOpenMenu: () => void
}

export function MobileNavbar({ onOpenMenu }: MobileNavbarProps) {
  const location = useLocation()
  const path = location.pathname

  // Solo las acciones de ALTA FRECUENCIA
  const mainLinks = [
    { icon: LayoutDashboard, label: 'Inicio', to: '/dashboard' },
    { icon: Calendar, label: 'Agenda', to: '/calendar' },
    { icon: Wallet, label: 'Caja', to: '/finance' },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 pb-safe md:hidden">
      <div className="flex items-center justify-around h-16">
        
        {/* 1. Enlaces Principales */}
        {mainLinks.map((link) => {
          const isActive = path === link.to
          return (
            <Link 
              key={link.to} 
              to={link.to}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          )
        })}

        {/* 2. Botón para abrir el RESTO del menú */}
        <button 
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-zinc-500 hover:text-white"
        >
          <Menu size={20} />
          <span className="text-[10px] font-medium">Menú</span>
        </button>

      </div>
    </div>
  )
}
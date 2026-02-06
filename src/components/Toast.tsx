import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, X, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 200) // Wait for exit animation
  }

  // Configuración visual según el tipo
  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          styles: 'bg-emerald-500/10 border-emerald-500/50 backdrop-blur-md',
          iconColor: 'text-emerald-400',
          iconBg: 'bg-emerald-500/10',
          progressColor: 'bg-emerald-500'
        }
      case 'error':
        return {
          icon: XCircle,
          styles: 'bg-red-500/10 border-red-500/50 backdrop-blur-md',
          iconColor: 'text-red-400',
          iconBg: 'bg-red-500/10',
          progressColor: 'bg-red-500'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          styles: 'bg-amber-500/10 border-amber-500/50 backdrop-blur-md',
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-500/10',
          progressColor: 'bg-amber-500'
        }
      default:
        return {
          icon: Info,
          styles: 'bg-blue-500/10 border-blue-500/50 backdrop-blur-md',
          iconColor: 'text-blue-400',
          iconBg: 'bg-blue-500/10',
          progressColor: 'bg-blue-500'
        }
    }
  }

  const config = getConfig()
  const Icon = config.icon

  return (
    <div
      className={`
        relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl w-80 
        transition-all duration-300
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${config.styles}
      `}
      role="alert"
    >
      {/* Progress bar */}
      <div 
        className={`absolute bottom-0 left-0 h-1 ${config.progressColor}`}
        style={{
          animation: `shrink ${duration}ms linear`,
          transformOrigin: 'left'
        }}
      />
      
      {/* Icon with background */}
      <div className={`${config.iconBg} p-2 rounded-lg`}>
        <Icon className={`h-5 w-5 ${config.iconColor} shrink-0`} />
      </div>
      
      <p className="text-sm font-medium flex-1 text-white">{message}</p>
      
      <button
        onClick={handleClose}
        className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/10 active:scale-95"
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          className="pointer-events-auto"
          style={{
            animation: `slideInFromRight 0.3s ease-out ${index * 0.1}s both`
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onClose(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

// Add keyframes to CSS
const style = document.createElement('style')
style.textContent = `
  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
  
  @keyframes slideInFromRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`
if (typeof document !== 'undefined') {
  document.head.appendChild(style)
}


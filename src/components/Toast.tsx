import { useEffect } from 'react'
import { CheckCircle, XCircle, X, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  // Configuración visual según el tipo
  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          styles: 'bg-zinc-900 border-emerald-500/50 text-white',
          iconColor: 'text-emerald-500'
        }
      case 'error':
        return {
          icon: XCircle,
          styles: 'bg-zinc-900 border-red-500/50 text-white',
          iconColor: 'text-red-500'
        }
      default:
        return {
          icon: Info,
          styles: 'bg-zinc-900 border-blue-500/50 text-white',
          iconColor: 'text-blue-500'
        }
    }
  }

  const config = getConfig()
  const Icon = config.icon

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl w-80 
        animate-in slide-in-from-right-full fade-in duration-300 
        ${config.styles}
      `}
      role="alert"
    >
      <Icon className={`h-5 w-5 ${config.iconColor} shrink-0`} />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="p-1 text-zinc-500 hover:text-white transition-colors rounded hover:bg-white/10"
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
  // El contenedor es fijo abajo a la derecha
  // pointer-events-none permite hacer clic "a través" de los espacios vacíos
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        // Reactivamos los eventos del mouse solo para las tarjetas
        <div key={toast.id} className="pointer-events-auto">
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

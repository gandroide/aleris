import { Fragment, useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly title: string
  readonly children: ReactNode
  readonly size?: 'sm' | 'md' | 'lg'
}

export function Drawer({ isOpen, onClose, title, children, size = 'md' }: DrawerProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl'
  }

  return (
    <Fragment>
      {/* Overlay with fade animation */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Cerrar"
      />

      {/* Drawer with slide animation */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full ${sizeClasses[size]} bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header with glass effect */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 shrink-0 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-10">
          <h2 id="drawer-title" className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all rounded-lg active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar panel lateral"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content with custom scrollbar */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-custom">
          {children}
        </div>
      </div>
    </Fragment>
  )
}


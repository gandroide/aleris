import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly title: string
  readonly children: ReactNode
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  if (!isOpen) return null

  return (
    <Fragment>
      {/* Overlay */}
      <button
        type="button"
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity w-full h-full border-0 p-0 cursor-pointer"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose()
          }
        }}
        aria-label="Cerrar"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-md active:bg-zinc-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {children}
        </div>
      </div>
    </Fragment>
  )
}


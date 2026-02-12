import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  readonly icon: LucideIcon
  readonly title: string
  readonly description?: string
  readonly actionLabel?: string
  readonly onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in duration-500">
      <div className="p-5 bg-zinc-800/40 rounded-3xl mb-5 border border-zinc-700/30">
        <Icon size={48} className="text-zinc-600" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-zinc-300 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-5">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-indigo-400 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

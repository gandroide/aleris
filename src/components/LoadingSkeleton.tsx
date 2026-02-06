import { memo } from 'react'

// ✅ Loading Skeleton Components - Optimizados con React.memo
export const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-12 w-12 rounded-full bg-zinc-800"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
          <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2 pt-4 border-t border-zinc-800">
        <div className="h-3 bg-zinc-800 rounded w-full"></div>
        <div className="h-3 bg-zinc-800 rounded w-5/6"></div>
      </div>
    </div>
  )
})

export const TableRowSkeleton = memo(function TableRowSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-full bg-zinc-800"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
            <div className="h-3 bg-zinc-800 rounded w-1/4"></div>
          </div>
        </div>
        <div className="h-8 w-20 bg-zinc-800 rounded"></div>
      </div>
    </div>
  )
})

export const MetricCardSkeleton = memo(function MetricCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-10 w-10 rounded-lg bg-zinc-800"></div>
        <div className="h-4 w-4 bg-zinc-800 rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-zinc-800 rounded w-1/2"></div>
        <div className="h-3 bg-zinc-800 rounded w-3/4"></div>
      </div>
    </div>
  )
})

export const ListSkeleton = memo(function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  )
})

export const GridSkeleton = memo(function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
})

export const MetricsGridSkeleton = memo(function MetricsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  )
})

// Full Page Loading with Shimmer Effect
export const PageLoadingSkeleton = memo(function PageLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 bg-zinc-800 rounded w-48 shimmer"></div>
          <div className="h-4 bg-zinc-800 rounded w-64 shimmer"></div>
        </div>
        <div className="h-10 w-32 bg-zinc-800 rounded shimmer"></div>
      </div>
      
      <div className="h-12 bg-zinc-800 rounded shimmer"></div>
      
      <GridSkeleton count={6} />
    </div>
  )
})

// Inline Loading Spinner
export const LoadingSpinner = memo(function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }
  
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin`}></div>
    </div>
  )
})

// Centered Page Loader
export const CenteredLoader = memo(function CenteredLoader({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-zinc-400 text-sm animate-pulse">{message}</p>
    </div>
  )
})

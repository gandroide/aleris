import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 rounded-lg'

    const variantClasses = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40',
      secondary: 'bg-zinc-800 text-white hover:bg-zinc-700 focus:ring-zinc-600 shadow-lg shadow-zinc-900/50',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-500/20 hover:shadow-red-500/40',
      ghost: 'bg-transparent text-zinc-300 hover:bg-zinc-800 focus:ring-zinc-600',
      outline: 'bg-transparent border-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 focus:ring-zinc-600'
    }

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-2.5 text-base min-h-[44px]',
      lg: 'px-6 py-3 text-lg min-h-[52px]'
    }

    const widthClass = fullWidth ? 'w-full' : ''

    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={combinedClasses}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Cargando...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'


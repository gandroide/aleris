import type { InputHTMLAttributes, ReactNode } from 'react'
import {forwardRef, useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  showPasswordToggle?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      showPasswordToggle = false,
      type = 'text',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const inputType = showPasswordToggle && showPassword ? 'text' : type

    const baseInputClasses = 'w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 transition-all duration-200 focus:outline-none min-h-[44px] backdrop-blur-sm'
    
    const stateClasses = error
      ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : success
      ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
      : 'hover:border-zinc-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'

    const paddingClasses = leftIcon ? 'pl-12' : rightIcon || showPasswordToggle ? 'pr-12' : ''

    const combinedInputClasses = `${baseInputClasses} ${stateClasses} ${paddingClasses} ${className}`

    return (
      <div className={`${fullWidth ? 'w-full' : ''} space-y-2`}>
        {label && (
          <label
            htmlFor={inputId}
            className={`block text-sm font-semibold transition-colors ${
              isFocused
                ? error
                  ? 'text-red-400'
                  : success
                  ? 'text-emerald-400'
                  : 'text-indigo-400'
                : 'text-zinc-300'
            }`}
          >
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={combinedInputClasses}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${inputId}-error`
                : success
                ? `${inputId}-success`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            {...props}
          />

          {/* Right Icon or Password Toggle */}
          {(rightIcon || showPasswordToggle) && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {showPasswordToggle ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-zinc-500 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800 active:scale-95"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              ) : (
                <div className="text-zinc-500">{rightIcon}</div>
              )}
            </div>
          )}

          {/* Status Icons */}
          {error && !rightIcon && !showPasswordToggle && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400">
              <AlertCircle size={18} />
            </div>
          )}
          {success && !rightIcon && !showPasswordToggle && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400">
              <CheckCircle size={18} />
            </div>
          )}
        </div>

        {/* Helper/Error/Success Text */}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
        {success && !error && (
          <p id={`${inputId}-success`} className="text-sm text-emerald-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle size={14} />
            {success}
          </p>
        )}
        {helperText && !error && !success && (
          <p id={`${inputId}-helper`} className="text-sm text-zinc-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'


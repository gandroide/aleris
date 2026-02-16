import React, { useState, useEffect } from 'react'
import { X, Lock, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type SecurityPinModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title?: string
  description?: string
}

export function SecurityPinModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  title = "Confirmación de Seguridad",
  description = "Esta acción requiere autorización. Ingresa el PIN de seguridad de la organización."
}: SecurityPinModalProps) {
  const [pin, setPin] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', ''])
      setError(null)
      setLoading(false)
      // Focus first input
      setTimeout(() => {
        document.getElementById('pin-input-0')?.focus()
      }, 100)
    }
  }, [isOpen])

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent multiple chars
    
    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)
    setError(null)

    // Auto-focus next input
    if (value !== '' && index < 3) {
      document.getElementById(`pin-input-${index + 1}`)?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && pin[index] === '' && index > 0) {
      document.getElementById(`pin-input-${index - 1}`)?.focus()
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const pinCode = pin.join('')
    if (pinCode.length !== 4) {
      setError("El PIN debe tener 4 dígitos")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Get current user's org info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      // 2. Fetch org pin
      // We assume user_metadata has organization_id or we fetch it from profile
      // Ideally we should cache this or use a secure RPC, but for this requirement:
      // "verify PIN against organizations table"
      
      // Let's first get the user profile to be sure of the Org ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (!profile?.organization_id) throw new Error("Sin organización asignada")

      // 3. Verify PIN
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('security_pin')
        .eq('id', profile.organization_id)
        .single()

      if (orgError || !org) throw new Error("Error verificando PIN")

      if (org.security_pin !== pinCode) {
        throw new Error("PIN Incorrecto")
      }

      // 4. Success
      onSuccess()
      onClose()

    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error de validación")
      // Clear PIN on error for retry
      setPin(['', '', '', ''])
      document.getElementById('pin-input-0')?.focus()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500">
                <Lock size={24} />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-xs text-zinc-500 mt-1">Acceso Restringido</p>
             </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          {description}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-3 mb-6">
            {pin.map((digit, index) => (
              <input
                key={index}
                id={`pin-input-${index}`}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                className="w-12 h-14 bg-zinc-950 border border-zinc-700 rounded-lg text-center text-2xl font-bold text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50"
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold justify-center mb-4 bg-red-500/10 py-2 rounded-lg border border-red-500/20">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || pin.join('').length !== 4}
              className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Autorizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

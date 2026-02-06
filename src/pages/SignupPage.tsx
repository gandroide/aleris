import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, Loader2, Building2, User, Mail, Lock } from 'lucide-react'

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!email || !password || !fullName) {
      setError('Por favor completa los campos obligatorios')
      setLoading(false)
      return
    }

    if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres')
        setLoading(false)
        return
    }

    try {
        const { error } = await signUp(email, password, {
            data: {
                full_name: fullName,
                organization_name: organizationName || 'Mi Organización'
            }
        })

        if (error) throw error
        
        navigate('/dashboard')
        
    } catch (err: any) {
        setError(err.message || 'Error al crear la cuenta')
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full"></div>
            <img 
              src="/aleris-logo.svg" 
              alt="ALERIS.ops Logo" 
              className="h-20 w-auto mb-4 relative z-10"
              style={{ filter: 'brightness(1.2) drop-shadow(0 0 20px rgba(16, 185, 129, 0.3))' }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 text-gradient">ALERIS.ops</h1>
          <p className="text-zinc-400">Crea tu cuenta y empieza a gestionar</p>
        </div>

        <form className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom duration-500" style={{ animationDelay: '0.1s' }} onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 backdrop-blur-sm animate-in fade-in slide-in-from-bottom duration-300">
              <div className="bg-red-500/20 p-1 rounded-lg">
                <UserPlus size={16} />
              </div>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            {/* NOMBRE COMPLETO */}
            <div className="group">
              <label htmlFor="fullName" className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                <User size={16} className="text-emerald-400" />
                Nombre Completo *
              </label>
              <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input w-full bg-zinc-900/50 border-zinc-800 backdrop-blur-sm hover:border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500/20"
                  placeholder="Juan Pérez"
              />
            </div>

            {/* EMAIL */}
            <div className="group">
              <label htmlFor="email" className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                <Mail size={16} className="text-emerald-400" />
                Correo Electrónico *
              </label>
              <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full bg-zinc-900/50 border-zinc-800 backdrop-blur-sm hover:border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500/20"
                  placeholder="tu@email.com"
              />
            </div>

            {/* PASSWORD */}
            <div className="group">
              <label htmlFor="password" className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                <Lock size={16} className="text-emerald-400" />
                Contraseña *
              </label>
              <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input w-full bg-zinc-900/50 border-zinc-800 backdrop-blur-sm hover:border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500/20"
                  placeholder="Mínimo 6 caracteres"
              />
              <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-1">
                Usa al menos 6 caracteres para mayor seguridad
              </p>
            </div>

            {/* ORGANIZACIÓN (OPCIONAL) */}
            <div className="group">
              <label htmlFor="organizationName" className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                <Building2 size={16} className="text-emerald-400" />
                Organización 
                <span className="text-zinc-500 text-xs font-normal">(Opcional)</span>
              </label>
              <input
                  id="organizationName"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="input w-full bg-zinc-900/50 border-zinc-800 backdrop-blur-sm hover:border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500/20"
                  placeholder="Ej. Barbería Elite"
              />
              <p className="text-xs text-zinc-500 mt-1.5">
                Déjalo vacío si recibiste una invitación por correo
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn w-full bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-95"
            >
              {loading ? (
                <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Procesando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  <span>Crear Cuenta</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-zinc-950/50 text-zinc-500 backdrop-blur-sm">¿Ya tienes cuenta?</span>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-all group"
            >
              <span>Volver al inicio de sesión</span>
              <span className="font-semibold text-emerald-400 group-hover:text-emerald-300">Entrar →</span>
            </Link>
          </div>
        </form>

        {/* Footer info */}
        <div className="text-center text-xs text-zinc-600 mt-8">
          <p>Al registrarte, aceptas nuestros términos de servicio</p>
          <p className="mt-1">© 2026 ALERIS.ops - Sistema Seguro</p>
        </div>
      </div>
    </div>
  )
}
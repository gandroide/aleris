import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, Loader2, User, Lock } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message || 'Error al iniciar sesión')
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        
        {/* HEADER CON LOGO SVG */}
        <div className="text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
            <img 
              src="/aleris-logo.svg" 
              alt="ALERIS.ops Logo" 
              className="h-24 w-auto mb-4 relative z-10"
              style={{ filter: 'brightness(1.2) drop-shadow(0 0 20px rgba(99, 102, 241, 0.3))' }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 text-gradient">ALERIS.ops</h1>
          <p className="text-zinc-400">Bienvenido de vuelta</p>
        </div>

        <form className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom duration-500" style={{ animationDelay: '0.1s' }} onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 backdrop-blur-sm animate-in fade-in slide-in-from-bottom duration-300">
              <div className="bg-red-500/20 p-1 rounded-lg">
                <LogIn size={16} />
              </div>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div className="group">
              <label htmlFor="email" className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                <User size={16} className="text-indigo-400" />
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input w-full bg-zinc-900/50 border-zinc-800 backdrop-blur-sm hover:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500/20"
                    placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="group">
              <label htmlFor="password" className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                <Lock size={16} className="text-indigo-400" />
                Contraseña
              </label>
              <div className="relative">
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input w-full bg-zinc-900/50 border-zinc-800 backdrop-blur-sm hover:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500/20"
                    placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all"
            >
              {loading ? (
                <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Iniciando...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-zinc-950/50 text-zinc-500 backdrop-blur-sm">¿No tienes cuenta?</span>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-all group"
            >
              <span>Crear cuenta nueva</span>
              <span className="font-semibold text-indigo-400 group-hover:text-indigo-300">Regístrate →</span>
            </Link>
          </div>
        </form>

        {/* Footer info */}
        <div className="text-center text-xs text-zinc-600 mt-8">
          <p>Sistema de Gestión Operativa Multi-Tenant</p>
          <p className="mt-1">© 2026 ALERIS.ops - Powered by Supabase</p>
        </div>
      </div>
    </div>
  )
}
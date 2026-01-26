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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* HEADER CON LOGO SVG */}
        <div className="text-center flex flex-col items-center">
          <img 
            src="/aleris-logo.svg" 
            alt="ALERIS.ops Logo" 
            // 🟢 CAMBIOS AQUÍ:
            // 1. h-24: Logo más grande.
            // 2. filter: brightness(1.2): Aumenta el brillo un 20%.
            className="h-24 w-auto mb-4"
            style={{ filter: 'brightness(1.2)' }}
          />
          <p className="text-zinc-400">Inicia sesión en tu cuenta</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                    placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                    placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] active:bg-zinc-600"
            >
              {loading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Iniciando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Iniciar sesión
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/signup"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              ¿No tienes cuenta? <span className="font-medium text-indigo-400">Regístrate</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
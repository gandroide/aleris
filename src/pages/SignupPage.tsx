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

    // CAMBIO 1: Ya no obligamos a tener organizationName
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
        // Enviamos los datos. Si organizationName está vacío, enviamos string vacío.
        // El Trigger de SQL se encargará del resto.
        const { error } = await signUp(email, password, {
            data: {
                full_name: fullName,
                organization_name: organizationName || 'Mi Organización' // Fallback solo si es dueño
            }
        })

        if (error) throw error
        
        // Éxito
        navigate('/dashboard')
        
    } catch (err: any) {
        setError(err.message || 'Error al crear la cuenta')
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">AXIS.ops</h1>
          <p className="text-zinc-400">Gestiona tu negocio o únete a tu equipo</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm flex items-center gap-2">
               <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <div className="space-y-4">
            {/* NOMBRE COMPLETO */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-zinc-300 mb-2">
                Nombre Completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                    placeholder="Juan Pérez"
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                    placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                Contraseña *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                    placeholder="••••••••"
                />
              </div>
            </div>

            {/* ORGANIZACIÓN (OPCIONAL) */}
            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-zinc-300 mb-2">
                Nombre de la Organización <span className="text-zinc-500 text-xs font-normal">(Opcional si eres empleado)</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    id="organizationName"
                    type="text"
                    // CAMBIO 2: Quitamos el 'required'
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                    placeholder="Ej. Barbería Elite"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Déjalo vacío si recibiste una invitación por correo.
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              {loading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Registrarse
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              ¿Ya tienes cuenta? <span className="font-medium text-indigo-400">Inicia sesión</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext' // 🟢 1. Importamos Auth
import { ArrowLeft, Building2, MapPin, Users, Loader2, AlertCircle, Clock } from 'lucide-react'

// Definimos tipos básicos para orden
type OrganizationDetail = {
  id: string
  name: string
  industry: string
  created_at: string
}

type Branch = {
  id: string
  name: string
  address: string | null
  timezone: string
}

export function OrganizationDetailsPage() {
  const { loading: authLoading } = useAuth() // 🟢 2. Control de carga de sesión
  const { id } = useParams() 
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<OrganizationDetail | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [staffCount, setStaffCount] = useState(0)

  // 🟢 3. EFFECT OPTIMIZADO
  useEffect(() => {
    // Bloqueamos la ejecución hasta que tengamos ID y la sesión esté lista
    if (authLoading || !id) return

    const loadDetails = async () => {
      setLoading(true)
      try {
        // 🟢 4. CARGA PARALELA (Mucho más rápida que una por una)
        const [orgRes, branchRes, staffRes] = await Promise.all([
            // A. Datos de la Organización
            supabase.from('organizations').select('*').eq('id', id).single(),
            // B. Lista de Sedes
            supabase.from('branches').select('*').eq('organization_id', id),
            // C. Conteo de Personal (Para usar el icono Users)
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', id)
        ])

        if (orgRes.error) throw orgRes.error
        
        setOrg(orgRes.data)
        setBranches(branchRes.data || [])
        setStaffCount(staffRes.count || 0)

      } catch (err) {
        console.error("Error cargando detalles:", err)
      } finally {
        setLoading(false)
      }
    }
    loadDetails()
  }, [id, authLoading]) // Dependencias estables

  // 5. Loader de Auth y Datos unificado visualmente
  if (authLoading || loading) return (
    <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
       <Loader2 className="h-10 w-10 text-zinc-500 animate-spin" />
       <p className="text-zinc-500 font-mono text-sm">Cargando información corporativa...</p>
    </div>
  )

  if (!org) return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
        <AlertCircle className="h-12 w-12 text-red-500 mb-2"/>
        <p className="text-lg font-bold text-white">Organización no encontrada</p>
        <button onClick={() => navigate('/admin/organizations')} className="mt-4 text-indigo-400 hover:underline">
            Volver al listado
        </button>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <button 
          onClick={() => navigate('/admin/organizations')}
          className="flex items-center text-zinc-400 hover:text-white mb-6 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Organizaciones
        </button>
        
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-700 shadow-xl">
            <span className="text-3xl font-black text-white tracking-tighter">
                {org.name.substring(0,2).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{org.name}</h1>
            <div className="flex items-center gap-3 mt-2">
                <code className="text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-500 font-mono">
                    ID: {org.id}
                </code>
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Clock size={12}/> Reg: {new Date(org.created_at).toLocaleDateString()}
                </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition-colors">
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Industria</h3>
            <p className="text-white text-xl font-medium capitalize flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-500"/> {org.industry || 'No definida'}
            </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition-colors">
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Infraestructura</h3>
            <p className="text-white text-xl font-medium capitalize flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-500"/> {branches.length} {branches.length === 1 ? 'Sede' : 'Sedes'}
            </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition-colors">
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Equipo Registrado</h3>
            <p className="text-white text-xl font-medium capitalize flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500"/> {staffCount} Usuarios
            </p>
        </div>
      </div>

      {/* Lista de Sedes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="text-zinc-500" size={18}/>
                Sedes Operativas
            </h2>
        </div>
        
        {branches.length === 0 ? (
            <div className="text-center py-10 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl text-zinc-500 italic">
                Esta organización aún no ha configurado sedes.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branches.map(branch => (
                    <div key={branch.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-800/50 transition-colors group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-white font-bold group-hover:text-indigo-400 transition-colors">{branch.name}</h4>
                                <p className="text-zinc-500 text-sm mt-1 flex items-start gap-1">
                                    <MapPin size={14} className="mt-0.5 shrink-0"/> 
                                    {branch.address || 'Dirección no registrada'}
                                </p>
                            </div>
                            <span className="text-[10px] font-bold bg-zinc-950 text-zinc-400 border border-zinc-800 px-2 py-1 rounded uppercase tracking-wider">
                                {branch.timezone}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  )
}
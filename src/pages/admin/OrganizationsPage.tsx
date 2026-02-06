import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase' 
import { useAuth } from '../../contexts/AuthContext'
import { Building2, Search, ArrowRight, Loader2, Calendar, Globe } from 'lucide-react'
import type { Organization } from '../../lib/supabase'

export default function OrganizationsPage() {
  const { loading: authLoading } = useAuth() // 🟢 1. Importamos estado de auth
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // 🟢 2. EFFECT OPTIMIZADO
  useEffect(() => {
    // Si auth está cargando, esperamos (evita disparos falsos)
    if (authLoading) return

    const loadOrgs = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        setOrgs(data || [])
      } catch (err) {
        console.error('Error cargando organizaciones:', err)
      } finally {
        setLoading(false)
      }
    }
    loadOrgs()
  }, [authLoading]) // 🟢 Solo depende de la carga de auth

  const filteredOrgs = orgs.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 3. Loader de Auth
  if (authLoading) return (
    <div className="flex h-[80vh] items-center justify-center">
       <Loader2 className="h-10 w-10 text-zinc-500 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="text-emerald-500"/> Organizaciones
          </h1>
          <p className="text-zinc-400 mt-1">Gestión de empresas registradas en el ecosistema.</p>
        </div>
        <div className="bg-zinc-900 px-3 py-1 rounded border border-zinc-800 text-xs font-mono text-zinc-500">
            Total: {orgs.length}
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-emerald-500"/>
              <p>Sincronizando base de datos...</p>
           </div>
        ) : filteredOrgs.length === 0 ? (
           <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 text-zinc-500">
              <Building2 className="mx-auto h-12 w-12 opacity-20 mb-2"/>
              No se encontraron organizaciones.
           </div>
        ) : (
          <div className="grid gap-3">
            {filteredOrgs.map((org) => (
              <div 
                key={org.id}
                onClick={() => navigate(`/admin/organizations/${org.id}`)}
                className="group bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between hover:border-emerald-500/30 hover:bg-zinc-800/80 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-emerald-500/20 transition-colors">
                    <span className="text-lg font-black text-emerald-600">
                        {org.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg group-hover:text-emerald-400 transition-colors">
                        {org.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                        <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 capitalize border border-zinc-700">
                            {org.industry || 'General'}
                        </span>
                        <span className="font-mono opacity-50">ID: {org.id.split('-')[0]}...</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Registro</p>
                        <p className="text-xs text-zinc-400 font-mono flex items-center justify-end gap-1">
                            <Calendar size={10}/>
                            {new Date(org.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="bg-zinc-950 p-2 rounded-full border border-zinc-800 text-zinc-600 group-hover:text-white group-hover:border-zinc-600 transition-all">
                        <ArrowRight size={16} />
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
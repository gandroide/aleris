import { useEffect, useState } from 'react'
// import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  AlertCircle, Building2, Activity, ArrowRight, 
  CreditCard, GraduationCap, BarChart3, Globe,
  Calendar, DollarSign, Loader2
} from 'lucide-react'
import type { Organization } from '../lib/supabase'

export function AdminDashboard() {
  // 🟢 OPTIMIZACIÓN: Extraemos loading para usarlo como control
  const {  loading: authLoading } = useAuth()
  // const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalStudents: 0,
    totalAppointments: 0,
    globalVolume: 0,
    activeSubscriptions: 0
  })
  
  const [recentOrgs, setRecentOrgs] = useState<Organization[]>([])

  // 🟢 EFFECT BLINDADO: Solo corre cuando la autenticación se estabiliza
  useEffect(() => {
    // Si auth está cargando, esperamos.
    if (authLoading) return

    const loadSaaSData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const [
            orgsRes, 
            studentsRes, 
            apptsRes, 
            financeRes
        ] = await Promise.all([
          // 1. Organizaciones
          supabase.from('organizations').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
          // 2. Alumnos Totales
          supabase.from('students').select('id', { count: 'exact', head: true }),
          // 3. Citas Globales
          supabase.from('appointments').select('id', { count: 'exact', head: true }),
          // 4. Volumen Financiero
          supabase.from('transactions').select('amount')
        ])
          
        if (orgsRes.error) throw orgsRes.error

        const totalMoney = financeRes.data 
            ? financeRes.data.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
            : 0

        setStats({
          totalOrgs: orgsRes.count || 0,
          totalStudents: studentsRes.count || 0,
          totalAppointments: apptsRes.count || 0,
          globalVolume: totalMoney,
          activeSubscriptions: orgsRes.count || 0 
        })

        setRecentOrgs(orgsRes.data || [])

      } catch (err: any) {
        console.error('Error cargando métricas SaaS:', err)
        setError(err.message || 'Error cargando datos del sistema')
      } finally {
        setLoading(false)
      }
    }

    loadSaaSData()
  }, [authLoading]) // 👈 Dependencia única y estable

  // Formateador de dinero compacto
  const formatCompactMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(amount)
  }

  // 1. Loader de Auth (Pantalla completa o spinner centrado)
  if (authLoading) return (
    <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
       <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
    </div>
  )

  // 2. Loader de Datos
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin" />
        <Globe className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-indigo-500" size={20} />
      </div>
      <p className="text-zinc-400 font-mono text-sm animate-pulse">MONITORIZANDO ECOSISTEMA...</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 bg-red-500/5 rounded-xl p-10 border border-red-500/10">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-2">Error de Telemetría</h3>
        <p className="text-zinc-400">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* HEADER SUPER ADMIN */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="text-indigo-500" size={28}/>
            ALERIS <span className="text-zinc-500">Master Console</span>
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Monitorización global de infraestructura y adopción.</p>
        </div>
        <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Estado del Sistema</p>
                <p className="text-emerald-500 font-bold text-xs flex items-center gap-1 justify-end">
                    <Activity size={10}/> OPERATIVO
                </p>
             </div>
             <div className="h-8 w-8 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center justify-center animate-pulse">
                <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
             </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: ORGANIZACIONES */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
              <Building2 className="h-6 w-6 text-indigo-400" />
            </div>
            <span className="text-xs font-mono text-zinc-600 bg-zinc-950 px-2 py-1 rounded">ACTIVOS</span>
          </div>
          <div>
            <p className="text-3xl font-bold text-white tracking-tight">{stats.totalOrgs}</p>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">Estudios Registrados</p>
          </div>
        </div>

        {/* KPI 2: ALUMNOS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
              <GraduationCap className="h-6 w-6 text-amber-400" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-white tracking-tight">{stats.totalStudents}</p>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">Alumnos Gestionados</p>
          </div>
        </div>

        {/* KPI 3: CITAS GLOBALES */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <Calendar className="h-6 w-6 text-blue-400" />
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-700 -rotate-45 group-hover:text-blue-500 transition-colors"/>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-bold text-white tracking-tight">{stats.totalAppointments}</p>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">Citas Agendadas (Global)</p>
          </div>
          <Calendar className="absolute -right-4 -bottom-4 text-zinc-800/30 h-24 w-24 group-hover:scale-110 transition-transform"/>
        </div>

        {/* KPI 4: VOLUMEN FINANCIERO */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
              <DollarSign className="h-6 w-6 text-emerald-400" />
            </div>
            <CreditCard className="h-4 w-4 text-zinc-700 group-hover:text-emerald-500 transition-colors"/>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-bold text-white tracking-tight">{formatCompactMoney(stats.globalVolume)}</p>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">Volumen Procesado</p>
          </div>
          <DollarSign className="absolute -right-4 -bottom-4 text-zinc-800/30 h-24 w-24 group-hover:scale-110 transition-transform"/>
        </div>
      </div>

      {/* SECCIÓN: CLIENTES RECIENTES */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-zinc-400" />
                Nuevas Organizaciones
            </h2>
            <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline flex items-center gap-1 transition-colors">
                Ver Base de Datos <ArrowRight size={12}/>
            </button>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          {recentOrgs.length === 0 ? (
             <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
                <Building2 size={40} className="mb-2 opacity-20"/>
                <p className="italic">No hay organizaciones registradas recientemente.</p>
             </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {recentOrgs.map((org) => (
                <div 
                  key={org.id} 
                  className="p-4 flex items-center justify-between hover:bg-zinc-800/60 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-zinc-950 flex items-center justify-center border border-zinc-800 group-hover:border-indigo-500/30 transition-all">
                      <span className="text-indigo-400 font-black text-sm">
                        {org.name ? org.name.substring(0, 2).toUpperCase() : 'OR'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold group-hover:text-indigo-400 transition-colors text-sm">{org.name}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                        <span className="font-mono opacity-70">ID: {org.id.split('-')[0]}</span>
                        • <span className="text-zinc-400">{org.industry || 'Sin Rubro'}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Fecha Alta</p>
                      <p className="text-xs text-zinc-400 font-mono">
                        {new Date(org.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-white transition-transform transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
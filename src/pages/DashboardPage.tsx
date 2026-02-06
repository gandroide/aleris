import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  AlertCircle, TrendingUp, Users, Briefcase, 
  ArrowUpRight, Activity, MapPin, Calendar, CheckCircle2,
  DollarSign, Wallet, ArrowRight
} from 'lucide-react'

interface ExtendedProfile {
  organization_id?: string
  assigned_branch_id?: string
  role?: string
  full_name?: string
  email?: string
  base_salary?: number
}

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth()
  
  // 🟢 OPTIMIZACIÓN: Extraer primitivos para evitar recargas innecesarias
  const user = profile as unknown as ExtendedProfile
  const orgId = user?.organization_id
  const branchId = user?.assigned_branch_id
  const userRole = user?.role
  const userName = user?.full_name

  // ESTADOS
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    solvencyRate: 0,
    totalStaff: 0,
    todayAppointments: 0,
    monthlyIncome: 0,
    estimatedPayroll: 0
  })

  const [nextClass, setNextClass] = useState<{ time: string, student: string } | null>(null)

  // 🟢 EFFECT OPTIMIZADO: Depende solo de IDs y Strings, no del objeto profile
  useEffect(() => {
    if (authLoading || !orgId) return

    const loadData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // ✅ OPTIMIZACIÓN: Paralelizar todas las queries independientes
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const startMonth = startOfMonth(new Date()).toISOString()
        const endMonth = endOfMonth(new Date()).toISOString()

        // Construir queries
        let studentsQuery = supabase.from('student_solvency_view').select('*').eq('organization_id', orgId)
        if (userRole === 'staff' && branchId) studentsQuery = studentsQuery.eq('branch_id', branchId)

        let agendaQuery = supabase
          .from('appointments')
          .select('id, start_time, students!fk_appointments_student(first_name, last_name)')
          .eq('organization_id', orgId)
          .gte('start_time', `${todayStr}T00:00:00`)
          .lte('start_time', `${todayStr}T23:59:59`)
          .order('start_time', { ascending: true })
        if (userRole === 'staff' && branchId) agendaQuery = agendaQuery.eq('branch_id', branchId)

        let financeQuery = supabase
          .from('transactions')
          .select('amount')
          .eq('organization_id', orgId)
          .gte('created_at', startMonth)
          .lte('created_at', endMonth)
        if (userRole === 'staff' && branchId) financeQuery = financeQuery.eq('branch_id', branchId)

        const staffQuery = userRole === 'staff' && branchId
          ? supabase.from('branch_staff').select('profile_id').eq('branch_id', branchId)
          : supabase.from('staff_details_view').select('base_salary').eq('organization_id', orgId).neq('role', 'owner')

        // ✅ EJECUTAR TODAS EN PARALELO
        const [
          { data: students, error: stError },
          { data: staffData },
          { data: appointments, error: aptError },
          { data: transactions }
        ] = await Promise.all([
          studentsQuery,
          staffQuery,
          agendaQuery,
          financeQuery
        ])

        if (stError) throw stError
        if (aptError) throw aptError

        // Calcular staff
        const staffCount = staffData?.length || 0
        const payrollSum = userRole === 'staff' && branchId 
          ? 0 
          : (staffData?.reduce((acc: number, curr: any) => acc + (curr.base_salary || 0), 0) || 0)

        const totalIncome = transactions ? transactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) : 0

        // CÁLCULOS
        const total = students?.length || 0
        const solventes = students?.filter(s => s.status_label === 'solvente').length || 0
        
        const now = new Date()
        const next = appointments?.find(a => new Date(a.start_time) > now)
        if (next && next.students) {
            const stName = Array.isArray(next.students) 
                ? `${next.students[0].first_name}` 
                : `${(next.students as any).first_name} ${(next.students as any).last_name}`
            setNextClass({ time: format(new Date(next.start_time), 'HH:mm'), student: stName })
        }

        setStats({
          totalStudents: total,
          solvencyRate: total > 0 ? Math.round((solventes / total) * 100) : 0,
          totalStaff: staffCount,
          todayAppointments: appointments?.length || 0,
          monthlyIncome: totalIncome,
          estimatedPayroll: payrollSum
        })

      } catch (err: any) {
        console.error('Error cargando Dashboard:', err)
        if (!err.message?.includes('does not exist')) {
            setError(err.message || 'Error de conexión')
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [authLoading, orgId, branchId, userRole]) // 🟢 Dependencias estables

  // Helper para formato de dinero
  const formatMoney = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)

  if (authLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin" />
          <div className="w-16 h-16 border-4 border-zinc-800 border-t-purple-500 rounded-full animate-spin absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '1s' }} />
        </div>
        <p className="text-zinc-500 font-mono text-sm animate-pulse">Iniciando ALERIS...</p>
      </div>
    )
  }

  if (!profile) return null

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-zinc-800 rounded w-64 shimmer"></div>
            <div className="h-4 bg-zinc-800 rounded w-48 shimmer"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 rounded-lg bg-zinc-800"></div>
                <div className="h-4 w-4 bg-zinc-800 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-8 bg-zinc-800 rounded w-1/2"></div>
                <div className="h-3 bg-zinc-800 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-lg flex items-center gap-4">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <div>
          <h3 className="text-white font-bold">Aviso del Sistema</h3>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-in slide-in-from-bottom duration-500">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Dashboard {userRole === 'owner' ? 'Gerencial' : 'Operativo'}
            <span className="text-xs bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/10">
                ALERIS.ops
            </span>
          </h1>
          <p className="text-zinc-400 mt-2 flex items-center gap-2 text-sm">
            Hola, <span className="text-white font-semibold">{userName || 'Usuario'}</span>
            {branchId && (
                <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-emerald-500/20">
                    <MapPin size={10} /> Sede Activa
                </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 px-4 py-2.5 rounded-xl border border-zinc-800 backdrop-blur-sm animate-in slide-in-from-bottom duration-500" style={{ animationDelay: '0.1s' }}>
            <Activity size={14} className="text-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Sistema Operativo </span>
            <span className="text-white font-mono font-semibold">v1.3</span>
        </div>
      </div>

      {/* GRID DE MÉTRICAS (KPIs) - Mejorado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: ALUMNOS */}
        <div 
          className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300 group relative overflow-hidden card-hover animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 ring-2 ring-blue-500/20"><Users size={24}/></div>
              <ArrowUpRight className="h-5 w-5 text-zinc-600 group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white tracking-tight">{stats.totalStudents}</p>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Alumnos Activos</p>
            </div>
          </div>
        </div>

        {/* KPI 2: SOLVENCIA */}
        <div 
          className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 group relative overflow-hidden card-hover animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: '0.15s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 ring-2 ring-emerald-500/20"><TrendingUp size={24}/></div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white tracking-tight">{stats.solvencyRate}%</p>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Tasa de Solvencia</p>
            </div>
          </div>
        </div>

        {/* KPI 3: CLASES HOY */}
        <Link 
          to="/calendar" 
          className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 group relative overflow-hidden cursor-pointer card-hover animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 ring-2 ring-indigo-500/20"><Calendar size={24}/></div>
              <ArrowUpRight className="h-5 w-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white tracking-tight">{stats.todayAppointments}</p>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider group-hover:text-indigo-300 transition-colors">Clases para Hoy</p>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Calendar size={100} />
          </div>
        </Link>

        {/* KPI 4: STAFF */}
        <div 
          className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all duration-300 group relative overflow-hidden card-hover animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: '0.25s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 ring-2 ring-amber-500/20"><Briefcase size={24}/></div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white tracking-tight">{stats.totalStaff}</p>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Staff Operativo</p>
            </div>
          </div>
        </div>

      </div>

      {/* SECCIÓN INFERIOR: ACCESOS RÁPIDOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ACCESO A AGENDA (RESUMEN) - Mejorado */}
          <Link 
            to="/calendar" 
            className="block group animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="h-full bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 relative overflow-hidden flex flex-col justify-between card-hover">
                {/* Background pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Calendar size={120} className="text-indigo-500 rotate-12" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg ring-2 ring-indigo-500/20">
                                <Calendar size={20} className="text-indigo-400"/>
                            </div>
                            Agenda del Día
                        </h3>
                        <ArrowUpRight className="h-5 w-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    
                    {stats.todayAppointments > 0 ? (
                        <div className="space-y-3">
                            <p className="text-zinc-400 text-sm">
                                Tienes <span className="text-white font-bold px-2 py-0.5 bg-white/5 rounded">{stats.todayAppointments} clases</span> programadas
                            </p>
                            {nextClass ? (
                                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-4 flex items-center gap-3 backdrop-blur-sm">
                                    <div className="bg-indigo-500 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg shadow-indigo-500/50">
                                        {nextClass.time}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Próxima Clase</p>
                                        <p className="text-white font-semibold">{nextClass.student}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-400"/>
                                    <p className="text-sm text-emerald-400 font-medium">Todas las clases completadas</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                            <p className="text-zinc-500 text-sm">No hay actividades programadas</p>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-zinc-800 relative z-10">
                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2 group-hover:gap-3 transition-all">
                        Ver Calendario Completo <ArrowUpRight size={14}/>
                    </div>
                </div>
            </div>
          </Link>

          {/* 💰 WIDGET FINANCIERO - Mejorado */}
          <Link 
            to="/finance" 
            className="block group animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: '0.35s' }}
          >
            <div className="h-full bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 relative overflow-hidden flex flex-col justify-between card-hover">
                {/* Background pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <DollarSign size={120} className="text-emerald-500 -rotate-12" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg ring-2 ring-emerald-500/20">
                                <Wallet size={20} className="text-emerald-400"/>
                            </div>
                            Finanzas
                        </h3>
                        <ArrowUpRight className="h-5 w-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-semibold">
                        {format(new Date(), 'MMMM yyyy', { locale: es })}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent p-4 rounded-xl border border-emerald-500/20 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Ingresos</p>
                            </div>
                            <p className="text-2xl font-mono font-bold text-emerald-400">{formatMoney(stats.monthlyIncome)}</p>
                        </div>
                        <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 backdrop-blur-sm">
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2">Nómina Est.</p>
                            <p className="text-2xl font-mono font-bold text-zinc-400">{formatMoney(stats.estimatedPayroll)}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800 relative z-10">
                    <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2 group-hover:gap-3 transition-all">
                        Ir a Tesorería <ArrowRight size={14}/>
                    </div>
                </div>
            </div>
          </Link>

      </div>
    </div>
  )
}
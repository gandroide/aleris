import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  AlertCircle, TrendingUp, Users, Briefcase, 
  ArrowUpRight, Activity, MapPin, Calendar, CheckCircle2,
  DollarSign, Wallet, ArrowRight, Loader2 
} from 'lucide-react'

interface ExtendedProfile {
  organization_id?: string
  assigned_branch_id?: string
  role?: string
  full_name?: string
  email?: string
  base_salary?: number
}

export function DashboardPage() {
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
        // --- 1. ALUMNOS ---
        let studentsQuery = supabase.from('student_solvency_view').select('*').eq('organization_id', orgId)
        if (userRole === 'staff' && branchId) studentsQuery = studentsQuery.eq('branch_id', branchId)
        const { data: students, error: stError } = await studentsQuery
        if (stError) throw stError

        // --- 2. STAFF ---
        let staffCount = 0
        let payrollSum = 0

        if (userRole === 'staff' && branchId) {
          const { data: staffData } = await supabase
            .from('branch_staff')
            .select('profile_id')
            .eq('branch_id', branchId)
          staffCount = staffData?.length || 0
        } else {
          // Buscamos en la vista maestra para tener el conteo real (Staff + Externos)
          const { data: staffProfiles } = await supabase
            .from('staff_details_view')
            .select('base_salary')
            .eq('organization_id', orgId)
            .neq('role', 'owner')
          
          staffCount = staffProfiles?.length || 0
          payrollSum = staffProfiles?.reduce((acc, curr) => acc + (curr.base_salary || 0), 0) || 0
        }

        // --- 3. AGENDA DE HOY ---
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        let agendaQuery = supabase
          .from('appointments')
          .select('id, start_time, students(first_name, last_name)')
          .eq('organization_id', orgId)
          .gte('start_time', `${todayStr}T00:00:00`)
          .lte('start_time', `${todayStr}T23:59:59`)
          .order('start_time', { ascending: true })
        
        if (userRole === 'staff' && branchId) agendaQuery = agendaQuery.eq('branch_id', branchId)
        const { data: appointments, error: aptError } = await agendaQuery
        if (aptError) throw aptError

        // --- 4. FINANZAS ---
        const startMonth = startOfMonth(new Date()).toISOString()
        const endMonth = endOfMonth(new Date()).toISOString()

        let financeQuery = supabase
          .from('transactions')
          .select('amount')
          .eq('organization_id', orgId)
          .gte('created_at', startMonth)
          .lte('created_at', endMonth)
        
        if (userRole === 'staff' && branchId) financeQuery = financeQuery.eq('branch_id', branchId)
        
        const { data: transactions } = await financeQuery
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
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-zinc-500 font-mono text-sm animate-pulse">Iniciando ALERIS...</p>
      </div>
    )
  }

  if (!profile) return null

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-zinc-400">Actualizando métricas operativas...</p>
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
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Dashboard {userRole === 'owner' ? 'Gerencial' : 'Operativo'}
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-full font-bold uppercase tracking-widest">
                ALERIS.ops
            </span>
          </h1>
          <p className="text-zinc-400 mt-1 flex items-center gap-2 text-sm">
            Hola, <span className="text-white font-medium">{userName || 'Usuario'}</span>
            {branchId && (
                <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 rounded text-[10px] font-bold uppercase">
                    <MapPin size={10} /> Sede Activa
                </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 px-3 py-2 rounded-lg border border-zinc-800">
            <Activity size={14} className="text-emerald-500" />
            <span className="hidden sm:inline">Sistema Operativo </span>
            <span className="text-white font-mono">v1.3</span>
        </div>
      </div>

      {/* GRID DE MÉTRICAS (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: ALUMNOS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all group relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Users size={20}/></div>
            <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="mt-2">
             <p className="text-2xl font-bold text-white">{stats.totalStudents}</p>
             <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Alumnos Activos</p>
          </div>
        </div>

        {/* KPI 2: SOLVENCIA */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all group relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><TrendingUp size={20}/></div>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mt-1"></div>
          </div>
          <div className="mt-2">
             <p className="text-2xl font-bold text-white">{stats.solvencyRate}%</p>
             <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Tasa de Solvencia</p>
          </div>
        </div>

        {/* KPI 3: CLASES HOY */}
        <Link to="/calendar" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-indigo-500/50 hover:bg-zinc-800/80 transition-all group relative overflow-hidden cursor-pointer">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Calendar size={20}/></div>
            <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
          </div>
          <div className="mt-2">
             <p className="text-2xl font-bold text-white">{stats.todayAppointments}</p>
             <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide group-hover:text-indigo-300">Clases para Hoy</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Calendar size={80} />
          </div>
        </Link>

        {/* KPI 4: STAFF */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all group relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Briefcase size={20}/></div>
          </div>
          <div className="mt-2">
             <p className="text-2xl font-bold text-white">{stats.totalStaff}</p>
             <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Staff Operativo</p>
          </div>
        </div>

      </div>

      {/* SECCIÓN INFERIOR: ACCESOS RÁPIDOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ACCESO A AGENDA (RESUMEN) */}
          <Link to="/calendar" className="block group">
            <div className="h-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-indigo-500/30 transition-all relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Calendar size={100} className="text-indigo-500 rotate-12" />
                </div>
                
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                        <Calendar size={18} className="text-indigo-500"/>
                        Agenda del Día
                    </h3>
                    
                    {stats.todayAppointments > 0 ? (
                        <div className="relative z-10">
                            <p className="text-zinc-400 text-sm mb-4">
                                Tienes <strong className="text-white">{stats.todayAppointments} clases</strong> programadas para hoy.
                            </p>
                            {nextClass ? (
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 inline-flex items-center gap-3">
                                    <div className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded">
                                        {nextClass.time}
                                    </div>
                                    <span className="text-sm text-indigo-200">
                                        Próxima: <strong>{nextClass.student}</strong>
                                    </span>
                                </div>
                            ) : (
                                <p className="text-sm text-emerald-400 flex items-center gap-2">
                                    <CheckCircle2 size={16}/> Todas las clases completadas.
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-zinc-500 text-sm italic relative z-10">
                            No hay actividades programadas.
                        </p>
                    )}
                </div>
                
                <div className="mt-4 text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                    Ver Calendario Completo <ArrowUpRight size={12}/>
                </div>
            </div>
          </Link>

          {/* 💰 WIDGET FINANCIERO */}
          <Link to="/finance" className="block group">
            <div className="h-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-emerald-500/30 transition-all relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <DollarSign size={100} className="text-emerald-500 -rotate-12" />
                </div>

                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <Wallet size={18} className="text-emerald-500"/>
                        Finanzas ({format(new Date(), 'MMMM', { locale: es })})
                    </h3>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Ingresos Brutos</p>
                            <p className="text-xl font-mono text-white">{formatMoney(stats.monthlyIncome)}</p>
                        </div>
                        <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Nómina Fija (Est.)</p>
                            <p className="text-xl font-mono text-zinc-400">{formatMoney(stats.estimatedPayroll)}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                    Ir a Tesorería <ArrowRight size={12}/>
                </div>
            </div>
          </Link>

      </div>
    </div>
  )
}
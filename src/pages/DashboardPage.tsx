import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { AttendanceDrawer } from '../components/AttendanceDrawer'
import { EnrollStudentDrawer } from '../components/EnrollStudentDrawer'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import { 
  AlertCircle, Users, 
  ArrowUpRight, Activity, MapPin, Calendar, CheckCircle2,
  DollarSign, Wallet, ArrowRight, Banknote, UserPlus, ClipboardCheck,
  Sparkles, TrendingUp
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
  const { toasts, showToast, removeToast } = useToast()
  
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
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false)

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

  // Helper para obtener saludo según hora del día
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

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
            <div className="h-8 bg-zinc-800 rounded-xl w-72 shimmer"></div>
            <div className="h-5 bg-zinc-800 rounded-lg w-56 shimmer"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-zinc-800"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-zinc-800 rounded w-3/4"></div>
                  <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <div>
          <h3 className="text-white font-bold">Aviso del Sistema</h3>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Datos de las acciones rápidas
  const quickActions = [
    {
      title: 'Registrar Pago',
      description: 'Registra un ingreso o cobro rápido',
      icon: Banknote,
      to: '/finance',
      gradient: 'from-emerald-500/15 to-emerald-600/5',
      hoverBorder: 'hover:border-emerald-500/40',
      hoverShadow: 'hover:shadow-emerald-500/10',
      iconBg: 'bg-emerald-500/15 ring-emerald-500/25',
      iconColor: 'text-emerald-400',
      labelColor: 'text-emerald-400',
    },
    {
      title: 'Inscribir Alumno',
      description: 'Agrega un nuevo alumno a tu academia',
      icon: UserPlus,
      onClick: () => setIsEnrollOpen(true),
      gradient: 'from-indigo-500/15 to-indigo-600/5',
      hoverBorder: 'hover:border-indigo-500/40',
      hoverShadow: 'hover:shadow-indigo-500/10',
      iconBg: 'bg-indigo-500/15 ring-indigo-500/25',
      iconColor: 'text-indigo-400',
      labelColor: 'text-indigo-400',
    },
    {
      title: 'Pasar Asistencia',
      description: 'Registra la asistencia de tu clase',
      icon: ClipboardCheck,
      onClick: () => setIsAttendanceOpen(true),
      gradient: 'from-amber-500/15 to-amber-600/5',
      hoverBorder: 'hover:border-amber-500/40',
      hoverShadow: 'hover:shadow-amber-500/10',
      iconBg: 'bg-amber-500/15 ring-amber-500/25',
      iconColor: 'text-amber-400',
      labelColor: 'text-amber-400',
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER PERSONALIZADO */}
      <div className="animate-in slide-in-from-bottom duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500 font-medium mb-1 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              {getGreeting()}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Hola, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{userName?.split(' ')[0] || 'Usuario'}</span>.
              <br className="md:hidden" />
              <span className="text-zinc-400 font-normal text-2xl md:text-3xl"> ¿Qué vamos a bailar hoy?</span>
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-sm text-zinc-500 capitalize">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</span>
              {branchId && (
                <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-emerald-500/20">
                  <MapPin size={10} /> Sede Activa
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 px-4 py-2.5 rounded-xl border border-zinc-800 backdrop-blur-sm">
            <Activity size={14} className="text-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">ALERIS </span>
            <span className="text-white font-mono font-semibold">v1.3</span>
          </div>
        </div>
      </div>

      {/* 🎯 HERO: ACCIONES RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {quickActions.map((action, index) => {
          const Icon = action.icon
          const commonClasses = `group relative overflow-hidden bg-gradient-to-br ${action.gradient} border border-zinc-800 ${action.hoverBorder} rounded-2xl p-6 md:p-7 transition-all duration-300 hover:shadow-xl ${action.hoverShadow} hover:-translate-y-0.5 card-hover animate-in slide-in-from-bottom duration-500`

          const content = (
            <>
              {/* Glow effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.02] to-transparent" />
              
              <div className="relative z-10 flex items-start gap-4">
                <div className={`p-3.5 ${action.iconBg} rounded-2xl ring-2 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={26} className={action.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white group-hover:text-white/90 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                    {action.description}
                  </p>
                </div>
                <ArrowUpRight className={`h-5 w-5 text-zinc-600 group-hover:${action.iconColor} transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 mt-1`} />
              </div>

              {/* Decorative bg icon */}
              <div className="absolute -right-4 -bottom-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500">
                <Icon size={100} />
              </div>
            </>
          )

          // Use button for onClick actions, Link for navigation
          if ('onClick' in action && action.onClick) {
            return (
              <button
                key={action.title}
                onClick={action.onClick}
                className={`${commonClasses} text-left`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {content}
              </button>
            )
          }

          return (
            <Link
              key={action.title}
              to={(action as any).to}
              className={commonClasses}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {content}
            </Link>
          )
        })}
      </div>

      {/* 📊 RESUMEN SIMPLE: 2 MÉTRICAS + AGENDA DEL DÍA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in slide-in-from-bottom duration-500" style={{ animationDelay: '0.25s' }}>
        
        {/* MÉTRICA: Alumnos Activos */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 hover:border-indigo-500/30 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 ring-2 ring-indigo-500/20">
              <Users size={22}/>
            </div>
            <div>
              <p className="text-2xl font-bold text-white tracking-tight">{stats.totalStudents}</p>
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Alumnos Activos</p>
            </div>
            {stats.solvencyRate > 0 && (
              <div className="ml-auto text-right">
                <p className={`text-lg font-bold ${stats.solvencyRate >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {stats.solvencyRate}%
                </p>
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Solvencia</p>
              </div>
            )}
          </div>
        </div>

        {/* MÉTRICA: Ingresos del Mes */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 ring-2 ring-emerald-500/20">
              <TrendingUp size={22}/>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">{formatMoney(stats.monthlyIncome)}</p>
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Ingresos · {format(new Date(), 'MMM yyyy', { locale: es })}</p>
            </div>
          </div>
        </div>

        {/* MINI: Clases Hoy */}
        <button 
          onClick={() => setIsAttendanceOpen(true)}
          className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 hover:border-amber-500/30 transition-all duration-300 group relative overflow-hidden text-left"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 ring-2 ring-amber-500/20">
              <Calendar size={22}/>
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-white tracking-tight">{stats.todayAppointments}</p>
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Clases para Hoy</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
          </div>
        </button>
      </div>

      {/* SECCIÓN INFERIOR: AGENDA + FINANZAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
        {/* ACCESO A AGENDA (RESUMEN) */}
        <div 
          onClick={() => setIsAttendanceOpen(true)}
          className="block group animate-in slide-in-from-bottom duration-500 cursor-pointer"
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
                      <div className="text-center py-6 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                          <Calendar className="mx-auto text-zinc-700 mb-2" size={32} />
                          <p className="text-zinc-500 text-sm">Día libre. ¡A practicar los pasos! 💃</p>
                      </div>
                  )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-zinc-800 relative z-10">
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2 group-hover:gap-3 transition-all">
                      Ver Calendario Completo <ArrowUpRight size={14}/>
                  </div>
              </div>
          </div>
        </div>

        {/* 💰 WIDGET FINANCIERO */}
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
                          Caja
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
                      Ver Movimientos <ArrowRight size={14}/>
                  </div>
              </div>
          </div>
        </Link>

      </div>

      {/* DRAWERS */}
      <AttendanceDrawer
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        onSuccess={(msg) => showToast(msg, 'success')}
      />
      <EnrollStudentDrawer
        isOpen={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
        onSuccess={(msg) => showToast(msg, 'success')}
      />
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
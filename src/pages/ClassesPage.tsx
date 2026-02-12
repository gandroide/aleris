import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  isToday, eachDayOfInterval, getDay
} from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  CalendarDays, ChevronLeft, ChevronRight, Clock, User,
  Shield, CreditCard, Loader2, RefreshCw, Filter,
  LayoutGrid, List, CalendarRange, Users, Zap
} from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { AttendanceDrawer } from '../components/AttendanceDrawer'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

// --- TYPES ---
type ViewMode = 'day' | 'week' | 'month'

interface ClassItem {
  id: string
  start_time: string
  price_at_booking: number
  is_private_class: boolean
  status: string
  student_id: string
  service_id: string
  profile_id: string | null
  professional_id: string | null
  students?: { first_name: string; last_name: string } | null
  profiles?: { full_name: string } | null
  professionals?: { full_name: string } | null
  services?: { name: string } | null
}

interface ServiceOption { id: string; name: string }
interface TeacherOption { id: string; full_name: string; type: string }

interface ExtendedProfile {
  organization_id?: string
  assigned_branch_id?: string
}

// --- HELPER: Badge de membresía ---
function MembershipBadge({ price }: { price: number }) {
  if (price === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
        <Shield size={10} /> Membresía
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
      <CreditCard size={10} /> Pago
    </span>
  )
}

// --- CARD de Clase Individual ---
function ClassCard({ item, onClick }: { item: ClassItem, onClick: () => void }) {
  // Logic: Title is ALWAYS service name. Never student name.
  const serviceName = item.services?.name || 'Clase'
  const teacherName = item.profiles?.full_name || item.professionals?.full_name || 'Sin asignar'
  const timeStr = format(new Date(item.start_time), 'HH:mm')
  
  const hasStudent = !!item.students
  const studentName = item.students 
    ? `${item.students.first_name} ${item.students.last_name}`
    : null

  return (
    <div 
      onClick={onClick}
      className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-4 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group cursor-pointer"
    >
      <div className="flex items-start gap-3">
        {/* Time badge */}
        <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 px-3 py-2 rounded-lg border border-indigo-500/30 text-indigo-300 font-mono font-bold text-sm flex-shrink-0 group-hover:border-indigo-500/50 transition-colors">
          {timeStr}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* TITLE: Service Name */}
          <h4 className="text-white font-bold text-sm truncate group-hover:text-indigo-300 transition-colors flex items-center gap-2">
            {serviceName}
          </h4>
          
          {/* SUBTITLE: Teacher */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <User size={11} className="text-zinc-500" /> {teacherName}
            </span>
          </div>

          {/* STUDENT INFO (Badge style, not title) */}
          <div className="mt-2">
            {hasStudent ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                👤 {studentName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                 Cupo Disponible
              </span>
            )}
          </div>
        </div>

        {/* Status badges (Top Right) */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <MembershipBadge price={item.price_at_booking} />
          {item.is_private_class && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
              Privada
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---
export default function ClassesPage() {
  const { profile, loading: authLoading } = useAuth()
  const user = profile as unknown as ExtendedProfile
  const orgId = user?.organization_id
  const branchId = user?.assigned_branch_id
  const { toasts, showToast, removeToast } = useToast()

  // --- STATE ---
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false)

  // Filters
  const [services, setServices] = useState<ServiceOption[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [filterService, setFilterService] = useState('')
  const [filterTeacher, setFilterTeacher] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // --- DATE RANGE CALCULATION ---
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return { start: currentDate, end: currentDate }
      case 'week':
        return { 
          start: startOfWeek(currentDate, { weekStartsOn: 1 }), 
          end: endOfWeek(currentDate, { weekStartsOn: 1 }) 
        }
      case 'month':
        return { 
          start: startOfMonth(currentDate), 
          end: endOfMonth(currentDate) 
        }
    }
  }, [viewMode, currentDate])

  // --- LOAD CLASSES ---
  const loadClasses = useCallback(async (isRefresh = false) => {
    if (!orgId) return
    
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const startStr = format(dateRange.start, 'yyyy-MM-dd')
      const endStr = format(dateRange.end, 'yyyy-MM-dd')

      let query = supabase
        .from('appointments')
        .select(`
          id, start_time, price_at_booking, is_private_class, status,
          student_id, service_id, profile_id, professional_id,
          students!fk_appointments_student (first_name, last_name),
          profiles!fk_appointments_profile (full_name),
          professionals!fk_appointments_professional (full_name),
          services!fk_appointments_service (name)
        `)
        .eq('organization_id', orgId)
        .gte('start_time', `${startStr}T00:00:00`)
        .lte('start_time', `${endStr}T23:59:59`)
        .order('start_time', { ascending: true })

      if (branchId) query = query.eq('branch_id', branchId)
      if (filterService) query = query.eq('service_id', filterService)

      const { data, error } = await query
      if (error) throw error
      
      let filtered = (data || []) as unknown as ClassItem[]
      
      // Filter by teacher (needs client-side since teacher is in two columns)
      if (filterTeacher) {
        filtered = filtered.filter(c => 
          c.profile_id === filterTeacher || c.professional_id === filterTeacher
        )
      }

      setClasses(filtered)
    } catch (err) {
      console.error('Error cargando clases:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [orgId, branchId, dateRange, filterService, filterTeacher])

  // --- LOAD FILTERS DATA ---
  useEffect(() => {
    if (!orgId) return
    const loadFilters = async () => {
      const [sRes, tRes] = await Promise.all([
        supabase.from('services').select('id, name').eq('organization_id', orgId).order('name'),
        supabase.from('available_teachers_view').select('id, full_name, type').eq('organization_id', orgId)
      ])
      if (sRes.data) setServices(sRes.data)
      if (tRes.data) setTeachers(tRes.data)
    }
    loadFilters()
  }, [orgId])

  // --- LOAD CLASSES ON DATE/FILTER CHANGE ---
  useEffect(() => {
    if (!authLoading && orgId) loadClasses()
  }, [authLoading, orgId, loadClasses])

  // --- NAVIGATION ---
  const navigate = (direction: 'prev' | 'next') => {
    const fn = direction === 'prev' 
      ? { day: subDays, week: subWeeks, month: subMonths }
      : { day: addDays, week: addWeeks, month: addMonths }
    setCurrentDate(prev => fn[viewMode](prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  // --- STATS ---
  const stats = useMemo(() => {
    const total = classes.length
    const byMembership = classes.filter(c => c.price_at_booking === 0).length
    const paid = total - byMembership
    const uniqueStudents = new Set(classes.map(c => c.student_id)).size
    return { total, byMembership, paid, uniqueStudents }
  }, [classes])

  // --- GROUP CLASSES BY DAY ---
  const classesByDay = useMemo(() => {
    const map = new Map<string, ClassItem[]>()
    
    // Initialize all days in range
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []))
    
    // Fill with classes
    classes.forEach(c => {
      const dayKey = format(new Date(c.start_time), 'yyyy-MM-dd')
      const arr = map.get(dayKey) || []
      arr.push(c)
      map.set(dayKey, arr)
    })

    return map
  }, [classes, dateRange])

  // --- DATE LABEL ---
  const dateLabel = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
      case 'week': {
        const s = startOfWeek(currentDate, { weekStartsOn: 1 })
        const e = endOfWeek(currentDate, { weekStartsOn: 1 })
        return `${format(s, 'd MMM', { locale: es })} — ${format(e, "d MMM yyyy", { locale: es })}`
      }
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: es })
    }
  }, [viewMode, currentDate])

  // --- LOADING ---
  if (authLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando...
      </div>
    )
  }

  // --- RENDER: DAY VIEW ---
  const renderDayView = () => {
    const dayKey = format(currentDate, 'yyyy-MM-dd')
    const dayClasses = classesByDay.get(dayKey) || []

    if (dayClasses.length === 0) {
      return (
        <EmptyState
          icon={CalendarDays}
          title="Sin clases hoy"
          description="No hay actividades programadas para este día. ¡Un buen momento para planificar!"
        />
      )
    }

    // Group by hour
    const byHour = new Map<string, ClassItem[]>()
    dayClasses.forEach(c => {
      const hour = format(new Date(c.start_time), 'HH:00')
      const arr = byHour.get(hour) || []
      arr.push(c)
      byHour.set(hour, arr)
    })

    return (
      <div className="space-y-6">
        {Array.from(byHour.entries()).map(([hour, items]) => (
          <div key={hour}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-300 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                <Clock size={14} className="text-indigo-400" />
                {hour}
              </div>
              <div className="flex-1 h-px bg-zinc-800/50" />
              <span className="text-xs text-zinc-600">{items.length} {items.length === 1 ? 'clase' : 'clases'}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pl-2">
              {items.map(item => (
                <ClassCard 
                  key={item.id} 
                  item={item} 
                  onClick={() => setIsAttendanceOpen(true)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // --- RENDER: WEEK VIEW ---
  const renderWeekView = () => {
    const days = eachDayOfInterval({ 
      start: startOfWeek(currentDate, { weekStartsOn: 1 }), 
      end: endOfWeek(currentDate, { weekStartsOn: 1 }) 
    })

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
        {days.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayClasses = classesByDay.get(dayKey) || []
          const today = isToday(day)
          const dayOfWeek = getDay(day) // 0=Sun, 6=Sat
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

          return (
            <div 
              key={dayKey}
              className={`rounded-xl border transition-all ${
                today 
                  ? 'border-indigo-500/50 bg-indigo-500/5 shadow-lg shadow-indigo-500/10' 
                  : isWeekend
                    ? 'border-zinc-800/50 bg-zinc-950/50'
                    : 'border-zinc-800 bg-zinc-900/30'
              }`}
            >
              {/* Day header */}
              <div className={`px-3 py-2.5 border-b ${today ? 'border-indigo-500/30' : 'border-zinc-800/50'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${today ? 'text-indigo-400' : 'text-zinc-500'}`}>
                    {format(day, 'EEE', { locale: es })}
                  </span>
                  <span className={`text-lg font-bold ${today ? 'text-white bg-indigo-500 w-8 h-8 rounded-full flex items-center justify-center text-sm' : 'text-zinc-400'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
              </div>

              {/* Classes list */}
              <div className="p-2 space-y-1.5 min-h-[80px] max-h-[300px] overflow-y-auto scrollbar-custom">
                {dayClasses.length === 0 ? (
                  <p className="text-zinc-700 text-[10px] text-center py-4">Sin clases</p>
                ) : (
                  dayClasses.map(item => {
                    const timeStr = format(new Date(item.start_time), 'HH:mm')
                    const isMembership = item.price_at_booking === 0
                    return (
                      <div 
                        key={item.id}
                        className={`px-2.5 py-2 rounded-lg text-xs border transition-colors ${
                          isMembership 
                            ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' 
                            : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-mono font-bold ${isMembership ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {timeStr}
                          </span>
                          {isMembership 
                            ? <Shield size={10} className="text-emerald-500/60" /> 
                            : <CreditCard size={10} className="text-amber-500/60" />
                          }
                        </div>
                        <p className="text-zinc-300 font-medium truncate mt-0.5">
                          {item.students ? `${item.students.first_name} ${item.students.last_name?.charAt(0)}.` : '—'}
                        </p>
                        <p className="text-zinc-500 truncate">
                          {item.services?.name || '—'}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Day footer with count */}
              {dayClasses.length > 0 && (
                <div className={`px-3 py-1.5 border-t text-center ${today ? 'border-indigo-500/20' : 'border-zinc-800/50'}`}>
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                    {dayClasses.length} {dayClasses.length === 1 ? 'clase' : 'clases'}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // --- RENDER: MONTH VIEW ---
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayHeaders.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-wider py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {allDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayClasses = classesByDay.get(dayKey) || []
            const today = isToday(day)
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const membershipCount = dayClasses.filter(c => c.price_at_booking === 0).length
            const paidCount = dayClasses.length - membershipCount

            return (
              <div 
                key={dayKey}
                className={`rounded-lg border min-h-[90px] p-1.5 transition-all ${
                  today 
                    ? 'border-indigo-500/50 bg-indigo-500/5' 
                    : isCurrentMonth 
                      ? 'border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-900/40' 
                      : 'border-zinc-800/20 bg-zinc-950/30 opacity-40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${
                    today ? 'text-indigo-400' : isCurrentMonth ? 'text-zinc-400' : 'text-zinc-700'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>

                {dayClasses.length > 0 && (
                  <div className="space-y-0.5">
                    {membershipCount > 0 && (
                      <div className="flex items-center gap-1 text-[9px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="text-emerald-400 font-bold">{membershipCount}</span>
                        <span className="text-zinc-600 hidden sm:inline">memb</span>
                      </div>
                    )}
                    {paidCount > 0 && (
                      <div className="flex items-center gap-1 text-[9px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="text-amber-400 font-bold">{paidCount}</span>
                        <span className="text-zinc-600 hidden sm:inline">pago</span>
                      </div>
                    )}

                    {/* First 2 class previews */}
                    {dayClasses.slice(0, 2).map(item => (
                      <div key={item.id} className="text-[9px] text-zinc-500 truncate leading-tight">
                        <span className="text-zinc-400 font-mono">{format(new Date(item.start_time), 'HH:mm')}</span>{' '}
                        {item.services?.name || '—'}
                      </div>
                    ))}
                    {dayClasses.length > 2 && (
                      <p className="text-[9px] text-zinc-600 font-medium">+{dayClasses.length - 2} más</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* === HEADER === */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30">
              <CalendarDays size={24} className="text-indigo-400" />
            </div>
            Tablero de Clases
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Vista operativa de todas las actividades programadas</p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {([
            { mode: 'day' as ViewMode, icon: List, label: 'Día' },
            { mode: 'week' as ViewMode, icon: CalendarRange, label: 'Semana' },
            { mode: 'month' as ViewMode, icon: LayoutGrid, label: 'Mes' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                viewMode === mode
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* === STATS CARDS === */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <CalendarDays size={18} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{stats.total}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Clases</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Shield size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-400">{stats.byMembership}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Por Membresía</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Zap size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-amber-400">{stats.paid}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Clases Sueltas</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Users size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-purple-400">{stats.uniqueStudents}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Alumnos Únicos</p>
          </div>
        </div>
      </div>

      {/* === DATE NAVIGATION + FILTERS === */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('prev')} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white capitalize min-w-[200px] text-center">
              {dateLabel}
            </h2>
          </div>

          <button 
            onClick={() => navigate('next')} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-95"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={goToToday}
            className="ml-1 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20 transition-all active:scale-95"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
              showFilters || filterService || filterTeacher
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'text-zinc-500 bg-zinc-900 border-zinc-800 hover:text-white'
            }`}
          >
            <Filter size={14} />
            Filtros
            {(filterService || filterTeacher) && (
              <span className="bg-indigo-500 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center">
                {(filterService ? 1 : 0) + (filterTeacher ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={() => loadClasses(true)}
            disabled={refreshing}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            title="Recargar"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* === FILTER BAR (collapsible) === */}
      {showFilters && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Servicio</label>
            <select
              value={filterService}
              onChange={e => setFilterService(e.target.value)}
              className="w-full h-9 px-3 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Todos los servicios</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Profesor</label>
            <select
              value={filterTeacher}
              onChange={e => setFilterTeacher(e.target.value)}
              className="w-full h-9 px-3 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Todos los profesores</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>

          {(filterService || filterTeacher) && (
            <div className="flex items-end">
              <button
                onClick={() => { setFilterService(''); setFilterTeacher('') }}
                className="h-9 px-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}

      {/* === MAIN CONTENT === */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mr-3" />
          <span className="text-zinc-500">Cargando actividades...</span>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
        </div>
      )}

      {/* Attendance Drawer */}
      <AttendanceDrawer
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        date={currentDate}
        onSuccess={(msg) => {
          showToast(msg, 'success')
          loadClasses(true)
        }}
      />
    </div>
  )
}


import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { AttendanceDrawer } from '../components/AttendanceDrawer'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import {
  Loader2, Calendar, Clock, Users,
  ArrowRight, BookOpen, Star, Sparkles,
  ClipboardCheck, Coffee, Sun, Moon, Sunset
} from 'lucide-react'

interface ExtendedProfile {
  id?: string
  organization_id?: string
  assigned_branch_id?: string
  full_name?: string
}

interface TodayClass {
  id: string
  start_time: string
  service_id: string
  is_private_class: boolean
  service_name: string
  attendee_count: number
  profile_id?: string | null
  professional_id?: string | null
}

export default function TeacherDashboard() {
  const { profile, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()

  const user = profile as unknown as ExtendedProfile
  const orgId = user?.organization_id
  const userId = user?.id
  const userName = user?.full_name

  const [loading, setLoading] = useState(true)
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false)

  // --- Greeting ---
  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return { text: 'Buenos días', icon: <Sun size={20} className="text-amber-400" /> }
    if (h < 18) return { text: 'Buenas tardes', icon: <Sunset size={20} className="text-orange-400" /> }
    return { text: 'Buenas noches', icon: <Moon size={20} className="text-indigo-400" /> }
  }
  const greeting = getGreeting()

  // --- Load today's classes ---
  const loadTodayClasses = useCallback(async () => {
    if (!orgId || !userId) return
    setLoading(true)

    try {
      const today = format(new Date(), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, start_time, service_id, is_private_class,
          profile_id, professional_id,
          services!fk_appointments_service (name),
          appointment_attendees (student_id)
        `)
        .eq('organization_id', orgId)
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`)
        .or(`profile_id.eq.${userId},professional_id.eq.${userId}`)
        .order('start_time', { ascending: true })

      if (error) throw error

      setTodayClasses(
        (data || []).map((apt: any) => ({
          id: apt.id,
          start_time: apt.start_time,
          service_id: apt.service_id,
          is_private_class: apt.is_private_class,
          profile_id: apt.profile_id,
          professional_id: apt.professional_id,
          service_name: apt.services?.name || 'Clase',
          attendee_count: apt.appointment_attendees?.length || 0,
        }))
      )
    } catch (err) {
      console.error('Error loading teacher dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId, userId])

  useEffect(() => {
    if (!authLoading && orgId) loadTodayClasses()
  }, [authLoading, orgId, loadTodayClasses])

  // --- Next class (first class after now) ---
  const now = new Date()
  const nextClass = todayClasses.find(c => new Date(c.start_time) > now) || todayClasses[0] || null

  // --- Totals ---
  const totalClasses = todayClasses.length
  const totalStudents = todayClasses.reduce((sum, c) => sum + c.attendee_count, 0)

  // --- Loading / Auth ---
  if (authLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando...
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white animate-in fade-in duration-500">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* --- HEADER --- */}
      <div className="animate-in slide-in-from-bottom duration-500">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
          {greeting.icon}
          <span>{greeting.text}</span>
        </div>
        <h1 className="text-3xl font-bold text-white">
          {userName?.split(' ')[0] || 'Profesor'} <span className="text-zinc-500 font-normal text-xl">— tu día hoy</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-1 capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 animate-in fade-in duration-300">
          <Loader2 className="h-10 w-10 animate-spin mb-3 text-indigo-500" />
          <p className="font-medium">Cargando tu jornada...</p>
        </div>
      ) : (
        <>
          {/* --- HERO CARD: Próxima Clase --- */}
          {nextClass ? (
            <div
              className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-2xl shadow-indigo-500/20 animate-in slide-in-from-bottom duration-500"
              style={{ animationDelay: '0.1s' }}
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-indigo-200" />
                  <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Próxima Clase</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-white mb-1">{nextClass.service_name}</h2>
                    <div className="flex items-center gap-4 text-indigo-200 text-sm">
                      <span className="flex items-center gap-1.5 font-mono font-bold text-white text-lg">
                        <Clock size={16} />
                        {format(new Date(nextClass.start_time), 'HH:mm')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={14} />
                        {nextClass.attendee_count} alumno{nextClass.attendee_count !== 1 ? 's' : ''}
                      </span>
                      {nextClass.is_private_class && (
                        <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                          <Star size={10} fill="currentColor" /> Privada
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsAttendanceOpen(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-all shadow-lg active:scale-95 text-sm whitespace-nowrap"
                  >
                    <ClipboardCheck size={18} />
                    Pasar Asistencia
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 border border-zinc-800 border-dashed rounded-2xl py-12 text-center animate-in fade-in duration-300">
              <Coffee className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 font-bold text-lg">No tienes más clases hoy</p>
              <p className="text-zinc-600 text-sm mt-1">¡Buen trabajo! Descansa y recarga. 💪</p>
            </div>
          )}

          {/* --- STAT PILLS --- */}
          <div
            className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Calendar size={22} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-3xl font-black text-white">{totalClasses}</p>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Clases hoy</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Users size={22} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-black text-white">{totalStudents}</p>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Alumnos hoy</p>
              </div>
            </div>
          </div>

          {/* --- TODAY'S TIMELINE --- */}
          <div
            className="animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-400" />
                Mis Clases de Hoy
              </h3>
              <Link
                to="/calendar"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-semibold flex items-center gap-1"
              >
                Ver agenda completa <ArrowRight size={12} />
              </Link>
            </div>

            {todayClasses.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl py-8 text-center">
                <Calendar className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No hay clases programadas para hoy</p>
              </div>
            ) : (
              <div className="space-y-0">
                {todayClasses.map((cls, index) => {
                  const isPast = new Date(cls.start_time) < now
                  const isNext = cls.id === nextClass?.id

                  return (
                    <div key={cls.id} className="flex gap-4 group">
                      {/* Time column */}
                      <div className="w-14 flex-shrink-0 pt-3 text-right">
                        <span className={`text-lg font-black font-mono tracking-tight transition-colors ${
                          isPast ? 'text-zinc-600' : isNext ? 'text-indigo-400' : 'text-zinc-300'
                        }`}>
                          {format(new Date(cls.start_time), 'HH:mm')}
                        </span>
                      </div>

                      {/* Connector */}
                      <div className="relative pb-4 flex-1">
                        {index < todayClasses.length - 1 && (
                          <div className="absolute left-4 top-6 bottom-0 w-px bg-gradient-to-b from-zinc-700 to-zinc-800/30" />
                        )}
                        <div className={`absolute left-[10px] top-[14px] h-2.5 w-2.5 rounded-full ring-4 ring-zinc-950 z-10 ${
                          isPast ? 'bg-zinc-600' : isNext ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-500'
                        }`} />

                        {/* Card */}
                        <div className={`ml-9 rounded-xl border overflow-hidden transition-all duration-300 ${
                          isPast
                            ? 'bg-zinc-900/30 border-zinc-800/50 opacity-60'
                            : isNext
                            ? 'bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                            : 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}>
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                isNext ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'
                              }`}>
                                <BookOpen size={14} />
                              </div>
                              <div>
                                <p className={`text-sm font-bold ${isPast ? 'text-zinc-500' : 'text-white'}`}>
                                  {cls.service_name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                                    <Users size={10} /> {cls.attendee_count}
                                  </span>
                                  {cls.is_private_class && (
                                    <span className="text-[9px] font-bold text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">
                                      Privada
                                    </span>
                                  )}
                                  {isPast && (
                                    <span className="text-[9px] font-bold text-zinc-600 uppercase">Finalizada</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {!isPast && (
                              <button
                                onClick={() => setIsAttendanceOpen(true)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                                  isNext
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/20'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                }`}
                              >
                                Asistencia
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Attendance Drawer */}
      <AttendanceDrawer
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        onSuccess={(msg) => {
          showToast(msg, 'success')
          loadTodayClasses()
        }}
      />
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import {
  Loader2, Banknote, Calendar, Users,
  TrendingUp, DollarSign, BookOpen, Info
} from 'lucide-react'

interface ExtendedProfile {
  id?: string
  organization_id?: string
  assigned_branch_id?: string
  full_name?: string
  base_salary?: number
  commission_percentage?: number
}

interface ClassEntry {
  id: string
  date: string
  time: string
  service_name: string
  attendee_count: number
  is_private: boolean
}

export default function TeacherPayrollPage() {
  const { profile, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()

  const user = profile as unknown as ExtendedProfile
  const orgId = user?.organization_id
  const userId = user?.id
  const baseSalary = user?.base_salary || 0
  const commissionPct = user?.commission_percentage || 0

  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<ClassEntry[]>([])

  // --- Load this month's classes ---
  const loadPayroll = useCallback(async () => {
    if (!orgId || !userId) return
    setLoading(true)

    try {
      const now = new Date()
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, start_time, is_private_class,
          services!fk_appointments_service (name),
          appointment_attendees (student_id)
        `)
        .eq('organization_id', orgId)
        .gte('start_time', `${monthStart}T00:00:00`)
        .lte('start_time', `${monthEnd}T23:59:59`)
        .or(`profile_id.eq.${userId},professional_id.eq.${userId}`)
        .order('start_time', { ascending: true })

      if (error) throw error

      setClasses(
        (data || []).map((apt: any) => ({
          id: apt.id,
          date: format(new Date(apt.start_time), 'dd/MM'),
          time: format(new Date(apt.start_time), 'HH:mm'),
          service_name: apt.services?.name || 'Clase',
          attendee_count: apt.appointment_attendees?.length || 0,
          is_private: apt.is_private_class,
        }))
      )
    } catch (err) {
      console.error('Error loading payroll data:', err)
      showToast('Error cargando datos de nómina', 'error')
    } finally {
      setLoading(false)
    }
  }, [orgId, userId, showToast])

  useEffect(() => {
    if (!authLoading && orgId) loadPayroll()
  }, [authLoading, orgId, loadPayroll])

  // --- Calculations ---
  const totalHours = classes.length // 1 hour per class (simplification)
  const totalStudents = classes.reduce((sum, c) => sum + c.attendee_count, 0)
  const baseEarnings = baseSalary // Monthly base
  const commissionEarnings = totalStudents * (commissionPct / 100) * (baseSalary / 20) // Approximate per-student commission
  const totalEstimate = baseEarnings + commissionEarnings

  // --- Format money ---
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)

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
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl ring-2 ring-emerald-500/20">
            <Banknote size={24} className="text-emerald-400" />
          </div>
          Mis Pagos
        </h1>
        <p className="text-zinc-400 text-sm mt-2 capitalize">
          Estimado de {format(new Date(), 'MMMM yyyy', { locale: es })}
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 animate-in fade-in duration-300">
          <Loader2 className="h-10 w-10 animate-spin mb-3 text-emerald-500" />
          <p className="font-medium">Calculando tu nómina...</p>
        </div>
      ) : (
        <>
          {/* --- MONTHLY ESTIMATE CARD --- */}
          <div
            className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 shadow-2xl shadow-emerald-500/20 animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-emerald-200" />
                <span className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Estimado a cobrar este mes</span>
              </div>

              <p className="text-4xl font-black text-white font-mono mb-4">
                {formatMoney(totalEstimate)}
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <p className="text-lg font-black text-white">{totalHours}</p>
                  <p className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">Clases impartidas</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <p className="text-lg font-black text-white">{totalStudents}</p>
                  <p className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">Alumnos atendidos</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <p className="text-lg font-black text-white">{formatMoney(commissionEarnings)}</p>
                  <p className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">Comisiones</p>
                </div>
              </div>
            </div>
          </div>

          {/* --- BREAKDOWN CARDS --- */}
          <div
            className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-emerald-400" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Salario Base</span>
              </div>
              <p className="text-2xl font-black text-white font-mono">{formatMoney(baseEarnings)}</p>
              <p className="text-[10px] text-zinc-600 mt-1">Mensual fijo</p>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-indigo-400" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Comisión</span>
              </div>
              <p className="text-2xl font-black text-white font-mono">{formatMoney(commissionEarnings)}</p>
              <p className="text-[10px] text-zinc-600 mt-1">{commissionPct}% por alumno</p>
            </div>
          </div>

          {/* --- INFO BANNER --- */}
          <div
            className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: '0.18s' }}
          >
            <Info size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-0.5">Nota Importante</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Este es un <strong className="text-zinc-300">estimado</strong> basado en las clases registradas.
                El monto final puede variar. Confirma con administración.
              </p>
            </div>
          </div>

          {/* --- MONTHLY HISTORY TABLE --- */}
          <div
            className="animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: '0.2s' }}
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-indigo-400" />
              Detalle de Clases del Mes
            </h3>

            {classes.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl py-8 text-center">
                <Calendar className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">Sin clases registradas este mes</p>
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-zinc-800/50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                  <div className="col-span-2">Fecha</div>
                  <div className="col-span-1">Hora</div>
                  <div className="col-span-4">Clase</div>
                  <div className="col-span-2 text-center">Alumnos</div>
                  <div className="col-span-1 text-center">Tipo</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-zinc-800/50 max-h-80 overflow-y-auto">
                  {classes.map((cls) => {
                    const rowCommission = cls.attendee_count * (commissionPct / 100) * (baseSalary / 20)
                    return (
                      <div key={cls.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-zinc-800/30 transition-colors items-center">
                        <div className="col-span-2 text-zinc-400 font-mono text-xs">{cls.date}</div>
                        <div className="col-span-1 text-zinc-500 font-mono text-xs">{cls.time}</div>
                        <div className="col-span-4 text-white font-medium text-xs truncate">{cls.service_name}</div>
                        <div className="col-span-2 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                            <Users size={10} /> {cls.attendee_count}
                          </span>
                        </div>
                        <div className="col-span-1 text-center">
                          {cls.is_private ? (
                            <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">PVT</span>
                          ) : (
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-bold uppercase">GRP</span>
                          )}
                        </div>
                        <div className="col-span-2 text-right text-emerald-400 font-mono font-bold text-xs">
                          {formatMoney(rowCommission)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Table Footer */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-zinc-800/30 text-xs font-bold border-t border-zinc-700">
                  <div className="col-span-2 text-zinc-500">Total</div>
                  <div className="col-span-1" />
                  <div className="col-span-4 text-zinc-400">{classes.length} clases</div>
                  <div className="col-span-2 text-center text-zinc-400">{totalStudents} alumnos</div>
                  <div className="col-span-1" />
                  <div className="col-span-2 text-right text-emerald-400 font-mono">{formatMoney(commissionEarnings)}</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

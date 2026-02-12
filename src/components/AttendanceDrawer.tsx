import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Drawer } from './Drawer'
import {
  Users, Check, ChevronRight, Loader2,
  ClipboardCheck, CalendarDays, Search, UserPlus
} from 'lucide-react'

interface TodayClass {
  id: string
  start_time: string
  service_id: string | null
  service_name: string
  teacher_name: string
  student_count: number
  appointment_ids: string[]
}

interface AttendeeItem {
  id: string
  first_name: string
  last_name: string
  status: 'present' | 'absent' | 'late'
  type: 'enrolled' | 'suggested' | 'manual'
  existing_record_id?: string // if attendance was already saved
}

interface AttendanceDrawerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSuccess: (message: string) => void
  readonly date?: Date
}

export function AttendanceDrawer({ isOpen, onClose, onSuccess, date }: AttendanceDrawerProps) {
  const { profile } = useAuth()
  const orgId = (profile as any)?.organization_id
  const branchId = (profile as any)?.assigned_branch_id
  const userRole = (profile as any)?.role
  const userId = (profile as any)?.id

  const [loading, setLoading] = useState(true)
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])
  const [selectedClass, setSelectedClass] = useState<TodayClass | null>(null)
  const [attendees, setAttendees] = useState<AttendeeItem[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isOpenClass, setIsOpenClass] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{id: string, first_name: string, last_name: string}[]>([])

  // Search Effect
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('organization_id', orgId)
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .limit(5)
      
      if (data) setSearchResults(data)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, orgId])

  // =============================================
  // STEP 1: Load classes (grouped by time+service)
  // =============================================
  const loadTodayClasses = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const targetDate = date || new Date()
      const todayStr = format(targetDate, 'yyyy-MM-dd')

      let query = supabase
        .from('appointments')
        .select(`
          id, start_time, service_id,
          services!fk_appointments_service (name),
          profiles!fk_appointments_profile (full_name),
          professionals!fk_appointments_professional (full_name)
        `)
        .eq('organization_id', orgId)
        .gte('start_time', `${todayStr}T00:00:00`)
        .lte('start_time', `${todayStr}T23:59:59`)
        .order('start_time', { ascending: true })

      if (userRole === 'staff' && branchId) {
        query = query.eq('branch_id', branchId)
      }

      const { data, error } = await query
      if (error) throw error

      // Group appointments by time slot + service
      const classMap = new Map<string, TodayClass>()

      for (const appt of (data || [])) {
        const timeKey = format(new Date(appt.start_time), 'HH:mm')
        const serviceName = (appt.services as any)?.name || 'Clase'
        const teacherName = (appt.profiles as any)?.full_name || (appt.professionals as any)?.full_name || 'Sin asignar'
        const groupKey = `${timeKey}-${appt.service_id || 'none'}`

        if (classMap.has(groupKey)) {
          const existing = classMap.get(groupKey)!
          existing.student_count += 1
          existing.appointment_ids.push(appt.id)
        } else {
          classMap.set(groupKey, {
            id: appt.id,
            start_time: appt.start_time,
            service_id: appt.service_id,
            service_name: serviceName,
            teacher_name: teacherName,
            student_count: 1,
            appointment_ids: [appt.id]
          })
        }
      }

      setTodayClasses(Array.from(classMap.values()))
    } catch (err) {
      console.error('Error loading today classes:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId, branchId, userRole])

  useEffect(() => {
    if (isOpen) {
      loadTodayClasses()
      setSelectedClass(null)
      setAttendees([])
      setIsOpenClass(false)
      setSearchQuery('')
    }
  }, [isOpen, loadTodayClasses])

  // =============================================
  // STEP 2: Load enrolled OR suggested students
  // Priority 1: Enrolled (Memberships)
  // Priority 2: Recent 10 (If no enrolled)
  // =============================================
  const handleSelectClass = async (cls: TodayClass) => {
    setSelectedClass(cls)
    setLoadingAttendees(true)
    setIsOpenClass(false)

    try {
      let studentList: AttendeeItem[] = []

      if (cls.service_id) {
        // 1. Try to find ENROLLED students
        const { data: memberships, error: memError } = await supabase
          .from('memberships')
          .select(`
            student_id,
            students!fk_memberships_student (id, first_name, last_name),
            plans!fk_memberships_plan (
              service_id,
              plan_services_access (service_id)
            )
          `)
          .eq('organization_id', orgId)
          .eq('status', 'active')

        if (!memError && memberships) {
          const enrolledStudents = memberships
            .filter((m: any) => {
              const legacyMatch = m.plans?.service_id === cls.service_id
              const junctionMatch = m.plans?.plan_services_access?.some(
                (psa: any) => psa.service_id === cls.service_id
              )
              return legacyMatch || junctionMatch
            })
            .map((m: any) => m.students)
            .filter(Boolean)

          const seen = new Set<string>()
          for (const s of enrolledStudents) {
            if (!seen.has(s.id)) {
              seen.add(s.id)
              studentList.push({
                id: s.id,
                first_name: s.first_name,
                last_name: s.last_name,
                status: 'absent',
                type: 'enrolled'
              })
            }
          }
        }
      }

      // 2. If NO enrolled students, fetch SUGGESTED (Last 10 active)
      if (studentList.length === 0) {
        setIsOpenClass(true) // Mark as "Open/No Enrollments" for UI context
        
        const { data: recentStudents } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (recentStudents) {
          studentList = recentStudents.map(s => ({
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            status: 'absent',
            type: 'suggested'
          }))
        }
      }

      // 3. Load existing attendance records (Overwrites status if exists)
      if (cls.appointment_ids.length > 0) {
        const { data: existing } = await supabase
          .from('attendance_records')
          .select('id, student_id, status')
          .in('appointment_id', cls.appointment_ids)

        if (existing && existing.length > 0) {
          const recordMap = new Map(existing.map(r => [r.student_id, r]))

          // Update existing in list
          studentList = studentList.map(s => {
            const rec = recordMap.get(s.id)
            if (rec) {
              return { ...s, status: rec.status as any, existing_record_id: rec.id }
            }
            return s
          })

          // Add any "Manual" drops-ins that are in records but not in our list
          for (const rec of existing) {
            if (!studentList.find(s => s.id === rec.student_id)) {
              const { data: stData } = await supabase
                .from('students')
                .select('id, first_name, last_name')
                .eq('id', rec.student_id)
                .single()

              if (stData) {
                studentList.push({
                  id: stData.id,
                  first_name: stData.first_name,
                  last_name: stData.last_name,
                  status: rec.status as any,
                  type: 'manual',
                  existing_record_id: rec.id
                })
              }
            }
          }
        }
      }
      
      // Sort: Present first, then Enrolled, then Suggested
      studentList.sort((a, b) => {
        if (a.status === 'present' && b.status !== 'present') return -1
        if (a.status !== 'present' && b.status === 'present') return 1
        if (a.type === 'enrolled' && b.type !== 'enrolled') return -1
        if (a.type !== 'enrolled' && b.type === 'enrolled') return 1
        return a.first_name.localeCompare(b.first_name)
      })

      setAttendees(studentList)
      
      // Load ALL students in background for search auto-complete if needed
      // But only if we are in a "large" mode? No, let's lazy load search results instead
    } catch (err) {
      console.error('Error loading attendees:', err)
    } finally {
      setLoadingAttendees(false)
    }
  }

  // =============================================
  // Toggle attendance status
  // =============================================
  // =============================================
  // SAVE: Real UPSERT to attendance_records
  // =============================================
  const handleSaveAttendance = async () => {
    if (!selectedClass || attendees.length === 0) return
    setSaving(true)

    try {
      // Use the first appointment_id as the canonical one for this class group
      const appointmentId = selectedClass.appointment_ids[0]

      const records = attendees.map(a => ({
        organization_id: orgId,
        appointment_id: appointmentId,
        student_id: a.id,
        status: a.status,
        marked_by: userId
      }))

      const { error } = await supabase
        .from('attendance_records')
        .upsert(records, {
          onConflict: 'appointment_id,student_id'
        })

      if (error) throw error

      const presentCount = attendees.filter(a => a.status === 'present').length
      const lateCount = attendees.filter(a => a.status === 'late').length
      const total = attendees.length

      onSuccess(`¡Asistencia guardada! ${presentCount} presentes${lateCount > 0 ? `, ${lateCount} tardanzas` : ''} de ${total} alumnos.`)
      onClose()
    } catch (err: any) {
      console.error('Error saving attendance:', err)
      onSuccess(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    setSelectedClass(null)
    setAttendees([])
    setIsOpenClass(false)
    setSearchQuery('')
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Pasar Asistencia" size="md">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-amber-500 mr-3" size={24} />
          <span className="text-zinc-400">Cargando clases de hoy...</span>
        </div>
      ) : !selectedClass ? (
        /* === CLASS LIST VIEW === */
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={16} className="text-amber-400" />
            <p className="text-sm text-zinc-400">
              <span className="text-white font-semibold capitalize">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</span>
            </p>
          </div>

          {todayClasses.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500 font-medium">No hay clases programadas hoy</p>
              <p className="text-zinc-600 text-sm mt-1">¡Día libre! 💃</p>
            </div>
          ) : (
            todayClasses.map((cls, idx) => {
              const timeStr = format(new Date(cls.start_time), 'HH:mm')
              const isPast = new Date(cls.start_time) < new Date()

              return (
                <button
                  key={`${cls.id}-${idx}`}
                  onClick={() => handleSelectClass(cls)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                    isPast
                      ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      : 'bg-gradient-to-r from-amber-500/5 to-transparent border-amber-500/20 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-2 rounded-lg font-mono font-bold text-sm ${
                      isPast
                        ? 'bg-zinc-800 text-zinc-500'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {timeStr}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{cls.service_name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-zinc-500">{cls.teacher_name}</span>
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Users size={11} /> {cls.student_count}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              )
            })
          )}
        </div>
      ) : (
        /* === ATTENDANCE VIEW === */
        <div className="space-y-4">
          {/* Header / Back */}
          <button
            onClick={handleBack}
            className="text-xs text-indigo-400 font-bold uppercase tracking-wider hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            ← Volver a clases
          </button>

          <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/15 text-amber-400 px-3 py-2 rounded-lg font-mono font-bold text-sm border border-amber-500/30">
                {format(new Date(selectedClass.start_time), 'HH:mm')}
              </div>
              <div className="flex-1">
                <p className="text-white font-bold">{selectedClass.service_name}</p>
                <p className="text-xs text-zinc-500">{selectedClass.teacher_name}</p>
              </div>
              {isOpenClass && (
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Clase Abierta
                </span>
              )}
            </div>
          </div>

          {loadingAttendees ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-zinc-500" size={20} />
            </div>
          ) : (
            <>
              {/* === SMART SEARCH ALWAYS VISIBLE === */}
              <div className="space-y-2 mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="¿Vino alguien extra? Búscalo aquí..." // User requested text
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value)
                      // Trigger search fetch if needed (assume allStudents logic or fetch on type)
                      // For now, assuming allStudents (or we need to fetch logic for search?)
                      // Since we removed 'setAllStudents' in handleSelectClass, we need to handle search here.
                      // Let's rely on basic functionality or fix search later? 
                      // Provide quick fetch function if not loaded?
                      if (e.target.value.length >= 2) {
                        // We will implement dynamic search in next step if 'allStudents' not available
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none transition-colors"
                  />
                </div>
                {/* Search Results Dropdown */}
                {searchQuery.length >= 2 && searchResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-zinc-800 rounded-xl p-2 bg-zinc-950 absolute w-full z-50 shadow-xl">
                    {searchResults.map(s => {
                      const isAlreadyIn = attendees.some(a => a.id === s.id)
                      if (isAlreadyIn) return null;
                      
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setAttendees(prev => [
                              ...prev, 
                              { 
                                id: s.id, 
                                first_name: s.first_name, 
                                last_name: s.last_name, 
                                status: 'present', // Auto-mark as present
                                type: 'manual' 
                              }
                            ])
                            setSearchQuery('')
                            setSearchResults([])
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors text-left"
                        >
                          <UserPlus size={14} className="text-indigo-400" />
                          <span className="text-sm text-white">{s.first_name} {s.last_name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* === CHECKLIST === */}
              <div className="space-y-2">
                {attendees.map(attendee => {
                  const isPresent = attendee.status === 'present'
                  return (
                    <button
                      key={attendee.id}
                      onClick={() => {
                        // Toggle Present <-> Absent
                        const newStatus = attendee.status === 'present' ? 'absent' : 'present'
                        setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, status: newStatus } : a))
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left group ${
                        isPresent 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Checkbox UI */}
                      <div className={`h-6 w-6 rounded-md border flex items-center justify-center transition-all ${
                        isPresent
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-zinc-700 text-transparent group-hover:border-zinc-600'
                      }`}>
                        <Check size={14} />
                      </div>

                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isPresent ? 'text-white' : 'text-zinc-400'}`}>
                          {attendee.first_name} {attendee.last_name}
                        </p>
                      </div>

                      {/* Badge Source */}
                      {attendee.type === 'enrolled' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Inscrito
                        </span>
                      )}
                      {attendee.type === 'suggested' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                          Sugerido
                        </span>
                      )}
                      {attendee.type === 'manual' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Extra
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
                <>
            {/* Button Moved Down */}

                  <button
                    onClick={handleSaveAttendance}
                    disabled={saving}
                    className="w-full mt-4 py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-amber-400 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <ClipboardCheck size={18} />
                        Guardar Asistencia
                      </>
                    )}
                  </button>
                </>

            </>
          )}
        </div>
      )}
    </Drawer>
  )
}

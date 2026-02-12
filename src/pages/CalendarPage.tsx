import React, { useState, useEffect, useCallback } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Calendar as CalendarIcon, Plus, User, Star, CreditCard,
  CheckCircle2, AlertTriangle, Loader2, BookOpen, Trash2, Edit, RefreshCw,
  Banknote, Landmark, DollarSign, Users, X, Search, Coffee, ClipboardCheck
} from 'lucide-react'
import { Drawer } from '../components/Drawer'
import { AttendanceDrawer } from '../components/AttendanceDrawer'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import 'react-day-picker/dist/style.css'

// --- INTERFACES ---
interface Student { id: string; first_name: string; last_name: string }
interface Profile { id: string; full_name: string; type?: string; specific_branch_id?: string }
interface Service { id: string; name: string; price: number }

interface ActiveMembership {
  id: string
  student_id: string
  plan: { name: string; service_id: string | null }
}

interface AppointmentAttendee {
  student_id: string
  students: { first_name: string; last_name: string }
}

interface Appointment {
  id: string
  start_time: string
  is_private_class: boolean
  service_id: string
  profile_id?: string | null
  professional_id?: string | null
  profiles?: { full_name: string } 
  professionals?: { full_name: string } 
  services?: { name: string }
  appointment_attendees?: AppointmentAttendee[]
}

interface ExtendedProfile { organization_id?: string; assigned_branch_id?: string; id?: string }

type FilterType = 'all' | 'mine' | 'private'

interface TimeSlotGroup {
  time: string
  appointments: Appointment[]
}

export default function CalendarPage() {
  const { profile, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  
  const user = profile as unknown as ExtendedProfile
  const orgId = user?.organization_id
  const branchId = user?.assigned_branch_id
  
  // ESTADOS PRINCIPALES
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  // ESTADOS DEL FORMULARIO Y EDICIÓN
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // DATOS PARA SELECTS
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [services, setServices] = useState<Service[]>([])
  
  // MEMBRESÍAS (batch para todos los alumnos seleccionados)
  const [allMemberships, setAllMemberships] = useState<ActiveMembership[]>([])
  const [checkingMembership, setCheckingMembership] = useState(false)
  
  // FILTRO PILLS
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  // MULTI-SELECT STUDENTS
  const [studentSearch, setStudentSearch] = useState('')
  
  const initialFormState = {
    student_ids: [] as string[],
    generic_teacher_id: '', 
    service_id: '',
    start_time: '09:00',
    is_private: false,
    payment_method: 'transfer' as 'cash' | 'card' | 'transfer' | null
  }
  const [formData, setFormData] = useState(initialFormState)

  // --- 1. CARGA DE CITAS ---
  const loadAppointments = useCallback(async () => {
    if (!orgId || !selectedDay) return
    
    setLoadingData(true)
    try {
      const dateStr = format(selectedDay, 'yyyy-MM-dd')
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, start_time, is_private_class, 
          profile_id, professional_id, service_id, 
          profiles!fk_appointments_profile (full_name),
          professionals!fk_appointments_professional (full_name),
          services!fk_appointments_service (name),
          appointment_attendees (student_id, students (first_name, last_name))
        `)
        .eq('organization_id', orgId)
        .gte('start_time', `${dateStr}T00:00:00`)
        .lte('start_time', `${dateStr}T23:59:59`)
        .order('start_time', { ascending: true })

      if (error) throw error
      setAppointments(data as any as Appointment[]) 
    } catch (err) {
      console.error("Error cargando agenda:", err)
    } finally {
      setLoadingData(false)
    }
  }, [orgId, selectedDay])

  useEffect(() => {
    if (!authLoading && orgId) {
        loadAppointments()
    }
  }, [authLoading, orgId, loadAppointments])

  // --- 2. CARGA DE SELECTS ---
  useEffect(() => {
    if (!isDrawerOpen || !orgId) return
    
    const loadFormData = async () => {
      try {
        const [resS, resT, resV] = await Promise.all([
          supabase.from('students').select('id, first_name, last_name').eq('organization_id', orgId),
          
          supabase.from('available_teachers_view')
            .select('id, full_name, type, specific_branch_id')
            .eq('organization_id', orgId),

          supabase.from('services').select('id, name, price').eq('organization_id', orgId)
        ])

        if (resS.data) setStudents(resS.data)
        
        if (resT.data) {
           const validTeachers = resT.data.filter((t: any) => 
              t.specific_branch_id === null || 
              t.specific_branch_id === branchId
           )
           setTeachers(validTeachers)
        }

        if (resV.data) setServices(resV.data)
      } catch (e) { console.error(e) }
    }
    loadFormData()
  }, [isDrawerOpen, orgId, branchId])

  // --- 2B. VERIFICAR MEMBRESÍAS (batch) ---
  const checkStudentMemberships = async (studentIds: string[]) => {
    if (studentIds.length === 0) {
      setAllMemberships([])
      return
    }
    setCheckingMembership(true)
    try {
      const { data } = await supabase
        .from('memberships')
        .select('id, student_id, plan:plans!fk_memberships_plan(name, service_id)')
        .in('student_id', studentIds)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())

      setAllMemberships((data as any) || [])
    } catch (e) {
      console.error('Error verificando membresías:', e)
      setAllMemberships([])
    } finally {
      setCheckingMembership(false)
    }
  }

  // --- 3. VALIDACIÓN DE HORARIOS ---
  const checkPrivateStatus = async (teacherId: string, time: string) => {
    if (!teacherId || !time || !branchId) return
    
    const teacher = teachers.find(t => t.id === teacherId)
    if (teacher?.type === 'professional') {
        setFormData(prev => ({ ...prev, is_private: false }))
        return
    }

    const dayOfWeek = getDay(selectedDay) 
    try {
      const { data: schedule } = await supabase
        .from('staff_schedules')
        .select('start_time, end_time')
        .eq('profile_id', teacherId)
        .eq('day_of_week', dayOfWeek)
        .eq('branch_id', branchId)
        .maybeSingle()

      let isPrivate = false
      if (!schedule) isPrivate = true 
      else {
        const start = schedule.start_time.slice(0, 5)
        const end = schedule.end_time.slice(0, 5)
        if (time < start || time >= end) isPrivate = true
      }
      setFormData(prev => ({ ...prev, is_private: isPrivate }))
    } catch (e) { console.error(e) }
  }

  // --- 4. HANDLERS ---
  const handleEditClick = async (apt: Appointment) => {
    setEditingId(apt.id)
    const timeOnly = format(new Date(apt.start_time), 'HH:mm')
    const currentTeacherId = apt.profile_id || apt.professional_id || ''
    
    // Load attendees from junction table
    const attendeeIds = (apt.appointment_attendees || []).map(a => a.student_id)

    setFormData({
      student_ids: attendeeIds,
      generic_teacher_id: currentTeacherId,
      service_id: apt.service_id,
      start_time: timeOnly,
      is_private: apt.is_private_class,
      payment_method: null
    })
    
    checkStudentMemberships(attendeeIds)
    setStudentSearch('')
    setIsDrawerOpen(true)
  }

  const handleNewClick = () => {
    setEditingId(null)
    setFormData(initialFormState)
    setAllMemberships([])
    setStudentSearch('')
    setIsDrawerOpen(true)
  }

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    setFormData(prev => {
      const newIds = prev.student_ids.includes(studentId)
        ? prev.student_ids.filter(id => id !== studentId)
        : [...prev.student_ids, studentId]
      
      // Batch check memberships
      checkStudentMemberships(newIds)
      return { ...prev, student_ids: newIds }
    })
  }

  const removeStudent = (studentId: string) => {
    setFormData(prev => {
      const newIds = prev.student_ids.filter(id => id !== studentId)
      checkStudentMemberships(newIds)
      return { ...prev, student_ids: newIds }
    })
  }

  // --- 5. SAVE ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !branchId) return
    if (formData.student_ids.length === 0) {
      showToast('Selecciona al menos un alumno', 'error')
      return
    }
    
    setIsSubmitting(true)
    try {
      const dateStr = format(selectedDay, 'yyyy-MM-dd')
      const startIso = `${dateStr}T${formData.start_time}:00`
      const service = services.find(s => s.id === formData.service_id)

      const selectedTeacher = teachers.find(t => t.id === formData.generic_teacher_id)
      const isSystemUser = selectedTeacher?.type === 'system'

      const payload = {
        organization_id: orgId,
        branch_id: branchId,
        student_id: null, // M:N — use junction table
        service_id: formData.service_id,
        start_time: startIso,
        end_time: startIso,
        price_at_booking: service?.price || 0,
        is_private_class: formData.is_private,
        status: 'scheduled',
        profile_id: isSystemUser ? formData.generic_teacher_id : null,
        professional_id: !isSystemUser ? formData.generic_teacher_id : null
      }

      let appointmentId: string

      if (editingId) {
        const { error } = await supabase.from('appointments').update(payload).eq('id', editingId)
        if (error) throw error
        appointmentId = editingId

        // Sync attendees: delete old, insert new
        await supabase.from('appointment_attendees').delete().eq('appointment_id', editingId)
      } else {
        const { data: inserted, error } = await supabase
          .from('appointments')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        appointmentId = inserted.id
      }

      // Bulk insert attendees
      const attendeeRows = formData.student_ids.map(sid => ({
        appointment_id: appointmentId,
        student_id: sid
      }))
      const { error: attError } = await supabase
        .from('appointment_attendees')
        .insert(attendeeRows)
      if (attError) throw attError

      // Payment logic — for each student NOT covered by membership
      if (!editingId) {
        let coveredCount = 0
        let chargedCount = 0

        for (const sid of formData.student_ids) {
          const studentMems = allMemberships.filter(m => m.student_id === sid)
          const matchingMem = studentMems.find(m => m.plan?.service_id === formData.service_id)
          
          if (matchingMem) {
            coveredCount++
          } else if (service && service.price > 0) {
            const student = students.find(s => s.id === sid)
            const studentName = student ? `${student.first_name} ${student.last_name}` : 'Alumno'
            await supabase.from('transactions').insert({
              organization_id: orgId,
              branch_id: branchId,
              student_id: sid,
              amount: service.price,
              payment_method: formData.payment_method,
              concept: `Clase: ${service.name} — ${studentName}`
            })
            chargedCount++
          }
        }

        const total = formData.student_ids.length
        let msg = editingId ? 'Cita actualizada' : `Clase agendada para ${total} alumno${total > 1 ? 's' : ''}`
        if (chargedCount > 0) msg += ` — ${chargedCount} cobro${chargedCount > 1 ? 's' : ''} registrado${chargedCount > 1 ? 's' : ''}`
        if (coveredCount > 0) msg += ` — ${coveredCount} cubierto${coveredCount > 1 ? 's' : ''} por membresía`
        showToast(msg, 'success')
      } else {
        showToast('Cita actualizada correctamente', 'success')
      }

      setIsDrawerOpen(false)
      loadAppointments()
    } catch (err: any) {
      showToast(err.message || 'Error al guardar', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editingId || !confirm('¿Estás seguro?')) return
    
    setIsSubmitting(true)
    try {
      // Junction rows cascade-delete via FK
      const { error } = await supabase.from('appointments').delete().eq('id', editingId)
      if (error) throw error
      showToast('Cita eliminada', 'success')
      setIsDrawerOpen(false)
      loadAppointments()
    } catch (err: any) {
      showToast('Error al eliminar', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered students for search
  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase())
  )

  // Selected student objects
  const selectedStudents = students.filter(s => formData.student_ids.includes(s.id))

  // Membership helpers
  const getStudentMembership = (studentId: string) =>
    allMemberships.filter(m => m.student_id === studentId)
  
  const isStudentCovered = (studentId: string) =>
    getStudentMembership(studentId).some(m => m.plan?.service_id === formData.service_id)

  // --- FILTERING ---
  const userId = (profile as any)?.id
  const filteredAppointments = appointments.filter(apt => {
    if (activeFilter === 'mine') return apt.profile_id === userId || apt.professional_id === userId
    if (activeFilter === 'private') return apt.is_private_class === true
    return true
  })

  // --- TIME SLOT GROUPING ---
  const timeSlots: TimeSlotGroup[] = filteredAppointments.reduce<TimeSlotGroup[]>((groups, apt) => {
    const time = format(new Date(apt.start_time), 'HH:mm')
    const existing = groups.find(g => g.time === time)
    if (existing) {
      existing.appointments.push(apt)
    } else {
      groups.push({ time, appointments: [apt] })
    }
    return groups
  }, [])

  // --- FREE TIME GAP HELPER ---
  const getGapMinutes = (timeA: string, timeB: string): number => {
    const [hA, mA] = timeA.split(':').map(Number)
    const [hB, mB] = timeB.split(':').map(Number)
    return (hB * 60 + mB) - (hA * 60 + mA)
  }

  if (authLoading) return <div className="flex h-[80vh] items-center justify-center text-zinc-500"><Loader2 className="h-8 w-8 animate-spin mr-2" />Cargando...</div>
  if (!profile) return <div className="text-white p-10">Sesión no válida. Recarga la página.</div>

  // --- RENDER: TIMELINE CONTENT ---
  let content
  if (loadingData) {
    content = (
      <div className="py-20 flex flex-col items-center justify-center text-zinc-500 animate-in fade-in duration-300">
        <Loader2 className="h-10 w-10 animate-spin mb-3 text-indigo-500"/>
        <p className="font-medium">Sincronizando agenda...</p>
      </div>
    )
  } else if (appointments.length === 0) {
    content = (
      <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 border border-zinc-800 border-dashed rounded-2xl py-16 text-center backdrop-blur-sm animate-in fade-in duration-300">
        <div className="relative inline-block mb-5">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <Coffee className="h-10 w-10 text-indigo-400/40" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 size={12} className="text-emerald-400" />
          </div>
        </div>
        <p className="text-zinc-300 font-bold text-lg mb-1">Día libre</p>
        <p className="text-zinc-600 text-sm mb-6">¡A recargar energías! 💃</p>
        <button
          onClick={handleNewClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-95"
        >
          <Plus size={16} /> Agendar Clase
        </button>
      </div>
    )
  } else if (filteredAppointments.length === 0) {
    content = (
      <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl py-12 text-center animate-in fade-in duration-300">
        <Search className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 font-medium">Sin resultados para este filtro</p>
        <button onClick={() => setActiveFilter('all')} className="text-indigo-400 text-sm mt-2 hover:text-indigo-300 transition-colors font-semibold">Ver todo</button>
      </div>
    )
  } else {
    content = (
      <div className="space-y-0 animate-in fade-in duration-300">
        {timeSlots.map((slot, slotIndex) => {
          // Free-time gap separator
          const prevSlot = slotIndex > 0 ? timeSlots[slotIndex - 1] : null
          const gapMinutes = prevSlot ? getGapMinutes(prevSlot.time, slot.time) : 0
          const showGap = gapMinutes >= 120 // 2+ hour gap

          return (
            <React.Fragment key={slot.time}>
              {/* Free-time gap separator */}
              {showGap && (
                <div className="flex items-center gap-3 py-3 px-2 animate-in fade-in duration-300">
                  <div className="w-16 flex-shrink-0" />
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
                    <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest flex items-center gap-1.5 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                      <Coffee size={10} />
                      {Math.floor(gapMinutes / 60)}h {gapMinutes % 60 > 0 ? `${gapMinutes % 60}m` : ''} libre
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
                  </div>
                </div>
              )}

              {/* Time slot row */}
              <div className="flex gap-4 group/slot">
                {/* TIME COLUMN */}
                <div className="w-16 flex-shrink-0 pt-3 text-right">
                  <span className="text-xl font-black font-mono text-zinc-300 tracking-tight group-hover/slot:text-indigo-400 transition-colors">
                    {slot.time}
                  </span>
                </div>

                {/* VERTICAL CONNECTOR LINE + CARDS */}
                <div className="flex-1 relative pb-4">
                  {/* Vertical line */}
                  {slotIndex < timeSlots.length - 1 && (
                    <div className="absolute left-5 top-6 bottom-0 w-px bg-gradient-to-b from-zinc-700 to-zinc-800/30" />
                  )}
                  {/* Dot on the line */}
                  <div className="absolute left-[14px] top-[14px] h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-zinc-950 z-10" />

                  {/* Cards */}
                  <div className="space-y-2 pl-10">
                    {slot.appointments.map((apt, cardIndex) => {
                      const teacherName = apt.profiles?.full_name || apt.professionals?.full_name || 'Sin Asignar'
                      const attendees = apt.appointment_attendees || []
                      const attendeeCount = attendees.length
                      const teacherInitial = teacherName.charAt(0).toUpperCase()
                      const hasAttendees = attendeeCount > 0

                      // Private class: first attendee name
                      const privateStudentName = apt.is_private_class && attendees.length > 0
                        ? `${attendees[0].students.first_name} ${attendees[0].students.last_name}`
                        : null

                      return (
                        <div
                          key={apt.id}
                          onClick={() => setIsAttendanceOpen(true)}
                          className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl overflow-hidden hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer group/card animate-in slide-in-from-left duration-500"
                          style={{ animationDelay: `${(slotIndex * 0.1) + (cardIndex * 0.05)}s` }}
                        >
                          {/* Card Header: Service Name + Badges */}
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <BookOpen size={13} className="text-indigo-400 flex-shrink-0" />
                              <span className="text-sm font-bold text-white group-hover/card:text-indigo-300 transition-colors truncate">
                                {apt.services?.name || 'Clase'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              {/* Type Badge: G or P */}
                              {apt.is_private_class ? (
                                <span className="inline-flex items-center justify-center h-5 w-5 rounded text-[9px] font-black bg-gradient-to-br from-amber-500/15 to-orange-500/15 text-amber-400 border border-amber-500/25"
                                  title="Privada">
                                  P
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center h-5 w-5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  title="Grupal">
                                  G
                                </span>
                              )}
                              {/* Status Badge */}
                              {hasAttendees ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 size={8} /> Confirmada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Abierta
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditClick(apt)
                                }}
                                className="p-1 text-zinc-600 hover:text-indigo-400 opacity-0 group-hover/card:opacity-100 transition-all"
                                title="Editar detalles de clase"
                              >
                                <Edit size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="px-4 py-3 flex items-center gap-4">
                            {/* Instructor (Subtitle) */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-300 flex-shrink-0">
                                {teacherInitial}
                              </div>
                              <span className="text-xs text-zinc-400 truncate">{teacherName}</span>
                            </div>

                            {/* Metadata: varies by type */}
                            {apt.is_private_class ? (
                              // Private: show student name or 'Cupo Disponible'
                              privateStudentName ? (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <User size={11} className="text-indigo-400" />
                                  <span className="text-zinc-300 font-medium truncate max-w-[120px]">
                                    {privateStudentName}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Cupo Disponible
                                </span>
                              )
                            ) : (
                              // Grupal: show attendee count
                              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <Users size={12} className={hasAttendees ? 'text-indigo-400' : 'text-zinc-700'} />
                                <span className={hasAttendees ? 'text-zinc-300 font-semibold' : 'text-amber-500/80 font-medium'}>
                                  {hasAttendees ? `${attendeeCount} asistente${attendeeCount !== 1 ? 's' : ''}` : '0 Inscritos'}
                                </span>
                              </div>
                            )}

                            {/* Attendance CTA on hover */}
                            <div className="flex items-center gap-1 text-xs text-zinc-700 opacity-0 group-hover/card:opacity-100 transition-all">
                              <ClipboardCheck size={12} className="text-indigo-400" />
                              <span className="hidden sm:inline text-indigo-400 font-semibold">Asistencia</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white animate-in fade-in duration-500">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="animate-in slide-in-from-bottom duration-500">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl ring-2 ring-indigo-500/20">
              <CalendarIcon size={24} className="text-indigo-400"/>
            </div>
            Agenda & Calendario
          </h1>
          <p className="text-zinc-400 text-sm mt-2">Gestión de citas y clases privadas</p>
        </div>
        <button 
          onClick={handleNewClick} 
          className="btn btn-primary shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: '0.1s' }}
        >
          <Plus size={20} /> 
          <span>Nueva Cita</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Picker */}
        <div 
          className="lg:col-span-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-6 rounded-2xl flex justify-center h-fit shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: '0.15s' }}
        >
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={(day) => day && setSelectedDay(day)}
            locale={es}
            modifiers={{ booked: appointments.map(a => new Date(a.start_time)) }}
            modifiersStyles={{ 
              selected: { backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold', borderRadius: '0.5rem' },
              booked: { fontWeight: 'bold', textDecoration: 'underline', color: '#a78bfa' }
            }}
            className="text-zinc-300"
          />
        </div>

        {/* Appointments List */}
        <div 
          className="lg:col-span-8 space-y-5 animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: '0.2s' }}
        >
          {/* Day Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 p-4 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <CalendarIcon className="text-indigo-400" size={20} />
              </div>
              <div>
                <span className="capitalize font-bold text-lg text-white block">
                    {format(selectedDay, "EEEE, d 'de' MMMM", { locale: es })}
                </span>
                {appointments.length > 0 && (
                  <span className="text-xs text-zinc-500">
                    {appointments.length} clase{appointments.length !== 1 ? 's' : ''} programada{appointments.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <button 
                onClick={loadAppointments} 
                className="p-2 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-95"
                title="Recargar agenda"
            >
                <RefreshCw size={18}/>
            </button>
          </div>

          {/* Filter Pills */}
          {appointments.length > 0 && (
            <div className="flex items-center gap-2">
              {([
                { key: 'all' as FilterType, label: 'Todo', icon: <CalendarIcon size={13} /> },
                { key: 'mine' as FilterType, label: 'Mis Clases', icon: <User size={13} /> },
                { key: 'private' as FilterType, label: 'Privadas', icon: <Star size={13} /> },
              ]).map(filter => {
                const isActive = activeFilter === filter.key
                return (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
                      isActive
                        ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-md shadow-indigo-500/10'
                        : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    {filter.icon}
                    {filter.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Timeline Content */}
          {content}
        </div>
      </div>

      {/* DRAWER DINÁMICO */}
      <Drawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={editingId ? "Editar / Detalles de Cita" : "Agendar Clase en ALERIS"}
      >
        <form onSubmit={handleSave} className="space-y-6" autoComplete="off">
          
          {/* MULTI-SELECT ALUMNOS */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
              Alumnos {formData.student_ids.length > 0 && <span className="text-indigo-400">({formData.student_ids.length})</span>}
            </label>
            
            {/* Selected chips */}
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedStudents.map(s => {
                  const covered = formData.service_id ? isStudentCovered(s.id) : false
                  return (
                    <span key={s.id} className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                      covered 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    }`}>
                      {s.first_name} {s.last_name}
                      {covered && <CheckCircle2 size={12} />}
                      <button type="button" onClick={() => removeStudent(s.id)} className="ml-0.5 hover:text-white transition-colors">
                        <X size={12} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Search + dropdown */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar alumno..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>

            {studentSearch.length >= 1 && (
              <div className="mt-1.5 max-h-40 overflow-y-auto border border-zinc-800 rounded-lg bg-zinc-950 divide-y divide-zinc-800/50">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-3">Sin resultados</p>
                ) : (
                  filteredStudents.slice(0, 8).map(s => {
                    const isSelected = formData.student_ids.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { toggleStudent(s.id); setStudentSearch('') }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-indigo-500/10 text-indigo-300' : 'hover:bg-zinc-800 text-white'
                        }`}
                      >
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {isSelected ? <CheckCircle2 size={14} /> : s.first_name[0]}
                        </div>
                        <span className="text-sm">{s.first_name} {s.last_name}</span>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* INDICADOR DE MEMBRESÍAS */}
          {formData.student_ids.length > 0 && !checkingMembership && (() => {
            const coveredStudents = formData.student_ids.filter(id => isStudentCovered(id))
            const uncoveredStudents = formData.student_ids.filter(id => !isStudentCovered(id))
            const hasAnyMembership = allMemberships.length > 0

            if (!formData.service_id) {
              if (hasAnyMembership) {
                return (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 flex items-center gap-3">
                    <CreditCard size={18} className="text-indigo-400 flex-shrink-0"/>
                    <p className="text-xs text-indigo-400">Selecciona un servicio para verificar cobertura de membresías</p>
                  </div>
                )
              }
              return null
            }

            if (coveredStudents.length === formData.student_ids.length) {
              return (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0"/>
                  <p className="text-xs font-bold text-emerald-400 uppercase">
                    {coveredStudents.length === 1 ? 'Cubierto por membresía' : `Todos (${coveredStudents.length}) cubiertos por membresía`} — sin costo
                  </p>
                </div>
              )
            } else if (coveredStudents.length > 0) {
              return (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
                  <AlertTriangle size={18} className="text-amber-400 flex-shrink-0"/>
                  <p className="text-xs text-amber-400">
                    <strong>{coveredStudents.length}</strong> cubierto{coveredStudents.length > 1 ? 's' : ''} por membresía, <strong>{uncoveredStudents.length}</strong> se cobrar{uncoveredStudents.length > 1 ? 'án' : 'á'}
                  </p>
                </div>
              )
            } else {
              return (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-zinc-500 flex-shrink-0"/>
                  <p className="text-xs text-zinc-400">Sin membresía activa — se cobrará el precio del servicio</p>
                </div>
              )
            }
          })()}
          {formData.student_ids.length > 0 && checkingMembership && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 p-3 rounded border border-zinc-800">
              <Loader2 size={14} className="animate-spin"/> Verificando membresías...
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Profesor</label>
            <select 
                required 
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white outline-none focus:border-indigo-500 appearance-none"
                value={formData.generic_teacher_id} 
                onChange={(e) => {
                    const id = e.target.value
                    setFormData({ ...formData, generic_teacher_id: id })
                    checkPrivateStatus(id, formData.start_time)
                }}
            >
              <option value="">Seleccionar Profesor...</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} {t.type === 'system' ? '👤' : '🏢'}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Hora Inicio</label>
              <input 
                type="time" required 
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white outline-none focus:border-indigo-500"
                value={formData.start_time} 
                onChange={(e) => {
                  const time = e.target.value
                  setFormData({ ...formData, start_time: time })
                  checkPrivateStatus(formData.generic_teacher_id, time)
                }} 
            />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Clase / Servicio</label>
              <select 
                required 
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white outline-none focus:border-indigo-500 appearance-none"
                value={formData.service_id} onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
            >
                <option value="">Seleccionar...</option>
                {services.length === 0 && <option disabled>Cargando servicios...</option>}
                {services.map(s => <option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}
              </select>
              {services.length === 0 && (
                  <p className="text-[10px] text-red-400 mt-1">⚠ No hay servicios registrados.</p>
              )}
            </div>
          </div>

          <div className={`p-4 rounded border flex gap-3 transition-all duration-300 ${
              formData.is_private 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <div className={`mt-0.5 ${formData.is_private ? 'animate-pulse' : ''}`}>
                {formData.is_private ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider mb-1">
                {formData.is_private ? "DETECTADA CLASE PRIVADA" : "HORARIO REGULAR CONFIRMADO"}
              </div>
              <p className="text-xs opacity-80 leading-relaxed font-medium">
                {formData.is_private 
                    ? "Esta hora está fuera del turno laboral del profesor. Se registrará como clase privada/extra." 
                    : "El horario coincide con la jornada laboral asignada al profesor."}
              </p>
            </div>
          </div>

          {/* 💰 SECCIÓN DE COBRO — solo al crear (no editar) */}
          {!editingId && (() => {
            const selectedService = services.find(s => s.id === formData.service_id)
            const price = selectedService?.price || 0
            const coveredCount = formData.student_ids.filter(id => isStudentCovered(id)).length
            const uncoveredCount = formData.student_ids.length - coveredCount
            const allCovered = coveredCount === formData.student_ids.length && formData.student_ids.length > 0

            if (!formData.service_id || formData.student_ids.length === 0) return null

            return (
              <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
                allCovered 
                  ? 'border-emerald-500/30 bg-emerald-500/5' 
                  : 'border-zinc-700 bg-zinc-900/80'
              }`}>
                <div className={`px-4 py-3 flex items-center justify-between ${
                  allCovered ? 'bg-emerald-500/10' : 'bg-zinc-800/50'
                }`}>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className={allCovered ? 'text-emerald-400' : 'text-zinc-400'}/>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Cobro por esta clase
                    </span>
                  </div>
                  <div className={`text-lg font-mono font-black ${
                    allCovered ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {allCovered ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={16}/> GRATIS
                      </span>
                    ) : (
                      `$${price} × ${uncoveredCount}`
                    )}
                  </div>
                </div>

                {!allCovered && price > 0 && (
                  <div className="p-4 space-y-3">
                    <label className="block text-xs font-bold text-zinc-500 uppercase">Método de pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, payment_method: 'transfer'})}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-bold transition-all ${
                          formData.payment_method === 'transfer' 
                            ? 'bg-purple-500/10 border-purple-500/50 text-purple-400 shadow-lg shadow-purple-500/10' 
                            : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                        }`}
                      >
                        <Landmark size={20}/>
                        Transfer
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, payment_method: 'cash'})}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-bold transition-all ${
                          formData.payment_method === 'cash' 
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10' 
                            : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                        }`}
                      >
                        <Banknote size={20}/>
                        Efectivo
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, payment_method: 'card'})}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-bold transition-all ${
                          formData.payment_method === 'card' 
                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10' 
                            : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                        }`}
                      >
                        <CreditCard size={20}/>
                        Tarjeta
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-600 text-center">
                      El pago se registrará automáticamente en Tesorería
                    </p>
                  </div>
                )}

                {allCovered && (
                  <div className="px-4 py-2.5">
                    <p className="text-[10px] text-emerald-400/60 text-center">
                      Todos los alumnos cubiertos por membresía — no genera cobro
                    </p>
                  </div>
                )}
              </div>
            )
          })()}

          <div className="space-y-3 pt-4">
            {(() => {
              const selectedService = services.find(s => s.id === formData.service_id)
              const price = selectedService?.price || 0
              const uncoveredCount = formData.student_ids.filter(id => !isStudentCovered(id)).length
              const showPrice = !editingId && uncoveredCount > 0 && price > 0 && formData.student_ids.length > 0 && formData.service_id

              return (
                <button type="submit" disabled={isSubmitting} className={`w-full text-white font-bold py-4 rounded disabled:opacity-50 flex items-center justify-center gap-2 transition-all ${
                  showPrice 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}>
                    {isSubmitting ? (
                      <><Loader2 className="animate-spin" size={20}/> PROCESANDO...</>
                    ) : editingId ? (
                      "GUARDAR CAMBIOS"
                    ) : showPrice ? (
                      <><DollarSign size={18}/> CONFIRMAR CITA & COBRAR ${price * uncoveredCount}</>
                    ) : (
                      "CONFIRMAR CITA"
                    )}
                </button>
              )
            })()}

            {editingId && (
                <button 
                    type="button" onClick={handleDelete} disabled={isSubmitting}
                    className="w-full bg-red-500/10 text-red-500 font-bold py-3 rounded border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center gap-2"
                >
                    <Trash2 size={18} /> CANCELAR CITA
                </button>
            )}
          </div>
        </form>
      </Drawer>

      {/* Attendance Drawer */}
      <AttendanceDrawer
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        date={selectedDay}
        onSuccess={(msg) => {
          showToast(msg, 'success')
          loadAppointments()
        }}
      />
    </div>
  )
}
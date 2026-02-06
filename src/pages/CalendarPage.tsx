import React, { useState, useEffect, useCallback } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Calendar as CalendarIcon, Clock, Plus, User, Star, CreditCard,
  CheckCircle2, AlertTriangle, Loader2, BookOpen, Trash2, Edit, RefreshCw,
  Banknote, Landmark, DollarSign
} from 'lucide-react'
import { Drawer } from '../components/Drawer'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import 'react-day-picker/dist/style.css'

// --- INTERFACES ---
interface Student { id: string; first_name: string; last_name: string }
interface Profile { id: string; full_name: string; type?: string; specific_branch_id?: string }
interface Service { id: string; name: string; price: number }

interface ActiveMembership {
  id: string
  plan: { name: string; service_id: string | null }
}

interface Appointment {
  id: string
  start_time: string
  is_private_class: boolean
  student_id: string
  service_id: string
  profile_id?: string | null
  professional_id?: string | null
  students?: { first_name: string; last_name: string }
  profiles?: { full_name: string } 
  professionals?: { full_name: string } 
  services?: { name: string }
}

interface ExtendedProfile { organization_id?: string; assigned_branch_id?: string }

export default function CalendarPage() {
  const { profile, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  
  // 🟢 OPTIMIZACIÓN: Extraer primitivos para evitar recargas
  const user = profile as unknown as ExtendedProfile
  const orgId = user?.organization_id
  const branchId = user?.assigned_branch_id
  
  // ESTADOS PRINCIPALES
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  // ESTADOS DEL FORMULARIO Y EDICIÓN
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // DATOS PARA SELECTS
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [services, setServices] = useState<Service[]>([])
  
  // MEMBRESÍAS DEL ALUMNO SELECCIONADO
  const [studentMemberships, setStudentMemberships] = useState<ActiveMembership[]>([])
  const [checkingMembership, setCheckingMembership] = useState(false)
  
  const initialFormState = {
    student_id: '',
    generic_teacher_id: '', 
    service_id: '',
    start_time: '09:00',
    is_private: false,
    payment_method: 'transfer' as 'cash' | 'card' | 'transfer'
  }
  const [formData, setFormData] = useState(initialFormState)

  // --- 1. CARGA DE CITAS OPTIMIZADA ---
  const loadAppointments = useCallback(async () => {
    // Usamos orgId (string) en lugar de user.organization_id
    if (!orgId || !selectedDay) return
    
    setLoadingData(true)
    try {
      const dateStr = format(selectedDay, 'yyyy-MM-dd')
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, start_time, is_private_class, 
          student_id, profile_id, professional_id, service_id, 
          students!fk_appointments_student (first_name, last_name),
          profiles!fk_appointments_profile (full_name),
          professionals!fk_appointments_professional (full_name),
          services!fk_appointments_service (name)
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
  }, [orgId, selectedDay]) // Dependencia estable

  // Efecto de carga inicial
  useEffect(() => {
    if (!authLoading && orgId) {
        loadAppointments()
    }
  }, [authLoading, orgId, loadAppointments]) // Dependencia estable

  // --- 2. CARGA DE SELECTS OPTIMIZADA ---
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
  }, [isDrawerOpen, orgId, branchId]) // Dependencias estables

  // --- 2B. VERIFICAR MEMBRESÍAS DEL ALUMNO ---
  const checkStudentMemberships = async (studentId: string) => {
    if (!studentId) {
      setStudentMemberships([])
      return
    }
    setCheckingMembership(true)
    try {
      const { data } = await supabase
        .from('memberships')
        .select('id, plan:plans!fk_memberships_plan(name, service_id)')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())

      setStudentMemberships((data as any) || [])
    } catch (e) {
      console.error('Error verificando membresías:', e)
      setStudentMemberships([])
    } finally {
      setCheckingMembership(false)
    }
  }

  // --- 3. VALIDACIÓN DE HORARIOS ---
  const checkPrivateStatus = async (teacherId: string, time: string) => {
    if (!teacherId || !time || !branchId) return
    
    const teacher = teachers.find(t => t.id === teacherId)
    
    // Si es externo, no validamos horario
    if (teacher?.type === 'professional') {
        setFormData(prev => ({ ...prev, is_private: false }))
        return
    }

    // Si es sistema, validamos DB
    const dayOfWeek = getDay(selectedDay) 
    try {
      const { data: schedule } = await supabase
        .from('staff_schedules')
        .select('start_time, end_time')
        .eq('profile_id', teacherId)
        .eq('day_of_week', dayOfWeek)
        .eq('branch_id', branchId) // Usamos la variable estable
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
  const handleEditClick = (apt: Appointment) => {
    setEditingId(apt.id)
    const timeOnly = format(new Date(apt.start_time), 'HH:mm')
    
    const currentTeacherId = apt.profile_id || apt.professional_id || ''

    setFormData({
      student_id: apt.student_id,
      generic_teacher_id: currentTeacherId,
      service_id: apt.service_id,
      start_time: timeOnly,
      is_private: apt.is_private_class
    })
    
    checkStudentMemberships(apt.student_id)
    setIsDrawerOpen(true)
  }

  const handleNewClick = () => {
    setEditingId(null)
    setFormData(initialFormState)
    setStudentMemberships([])
    setIsDrawerOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !branchId) return
    
    setIsSubmitting(true)
    try {
      const dateStr = format(selectedDay, 'yyyy-MM-dd')
      const startIso = `${dateStr}T${formData.start_time}:00`
      const service = services.find(s => s.id === formData.service_id)
      const student = students.find(s => s.id === formData.student_id)

      const selectedTeacher = teachers.find(t => t.id === formData.generic_teacher_id)
      const isSystemUser = selectedTeacher?.type === 'system'

      // Determinar precio: si tiene membresía activa que cubre ESTE servicio → $0
      const matchingMembership = studentMemberships.find(
        m => m.plan?.service_id === formData.service_id
      )
      const coveredByMembership = !!matchingMembership
      const finalPrice = coveredByMembership ? 0 : (service ? service.price : 0)

      const payload = {
        organization_id: orgId,
        branch_id: branchId,
        student_id: formData.student_id,
        service_id: formData.service_id,
        start_time: startIso,
        end_time: startIso,
        price_at_booking: finalPrice,
        is_private_class: formData.is_private,
        status: 'scheduled',
        
        profile_id: isSystemUser ? formData.generic_teacher_id : null,
        professional_id: !isSystemUser ? formData.generic_teacher_id : null
      }

      if (editingId) {
        const { error } = await supabase.from('appointments').update(payload).eq('id', editingId)
        if (error) throw error
        showToast('Cita actualizada correctamente', 'success')
      } else {
        const { error } = await supabase.from('appointments').insert(payload)
        if (error) throw error

        // 💰 Registrar pago automático si la clase NO está cubierta por membresía
        if (!coveredByMembership && finalPrice > 0) {
          const studentName = student ? `${student.first_name} ${student.last_name}` : 'Alumno'
          const { error: txError } = await supabase.from('transactions').insert({
            organization_id: orgId,
            branch_id: branchId,
            student_id: formData.student_id,
            amount: finalPrice,
            payment_method: formData.payment_method,
            concept: `Clase: ${service?.name || 'Servicio'} — ${studentName}`
          })
          if (txError) {
            console.error('Error registrando pago:', txError)
            // No lanzamos error aquí, la cita ya se creó
            showToast('Cita agendada, pero hubo un error registrando el pago', 'warning')
          } else {
            showToast(`Cita agendada y cobro de $${finalPrice} registrado`, 'success')
          }
        } else {
          showToast(
            coveredByMembership 
              ? `Cita agendada — cubierta por membresía "${matchingMembership?.plan?.name}"` 
              : 'Cita agendada correctamente', 
            'success'
          )
        }
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

  if (authLoading) return <div className="flex h-[80vh] items-center justify-center text-zinc-500"><Loader2 className="h-8 w-8 animate-spin mr-2" />Cargando...</div>
  if (!profile) return <div className="text-white p-10">Sesión no válida. Recarga la página.</div>

  // --- RENDER ---
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
      <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 border border-zinc-800 border-dashed rounded-2xl py-20 text-center backdrop-blur-sm animate-in fade-in duration-300">
        <Clock className="h-16 w-16 mb-4 opacity-30 text-zinc-600 mx-auto"/>
        <p className="text-zinc-500 font-medium mb-2">Sin clases programadas</p>
        <p className="text-zinc-600 text-sm">Agenda una nueva cita para este día</p>
      </div>
    )
  } else {
    content = (
      <div className="space-y-3">
        {appointments.map((apt, index) => {
            const teacherName = apt.profiles?.full_name || apt.professionals?.full_name || 'Sin Asignar'

            return (
              <div 
                key={apt.id} 
                onClick={() => handleEditClick(apt)}
                className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-5 rounded-xl flex items-center justify-between hover:border-indigo-500/40 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 group cursor-pointer animate-in slide-in-from-bottom duration-500"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 px-4 py-3 rounded-xl border border-indigo-500/30 text-indigo-300 font-mono font-bold text-base group-hover:border-indigo-500/50 transition-colors shadow-lg">
                    {format(new Date(apt.start_time), 'HH:mm')}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-base group-hover:text-indigo-300 transition-colors mb-1">
                      {apt.students?.first_name} {apt.students?.last_name}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <User size={12}/> {teacherName}
                      </span>
                      <span className="text-zinc-700">•</span>
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={12}/> {apt.services?.name}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {apt.is_private_class ? (
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
                      <Star size={12} fill="currentColor" /> Privada
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                      <CheckCircle2 size={12} /> Regular
                    </div>
                  )}
                  <Edit size={16} className="text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-indigo-400 transition-all" />
                </div>
              </div>
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
          <div className="flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 p-4 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <CalendarIcon className="text-indigo-400" size={20} />
              </div>
              <span className="capitalize font-bold text-lg text-white">
                  {format(selectedDay, "EEEE, d 'de' MMMM", { locale: es })}
              </span>
            </div>
            <button 
                onClick={loadAppointments} 
                className="p-2 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-95"
                title="Recargar agenda"
            >
                <RefreshCw size={18}/>
            </button>
          </div>
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
          
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Alumno</label>
            <select 
                required 
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white outline-none focus:border-indigo-500 appearance-none"
                value={formData.student_id} 
                onChange={(e) => {
                    const id = e.target.value
                    setFormData({ ...formData, student_id: id })
                    checkStudentMemberships(id)
                }}
            >
              <option value="">Seleccionar Alumno...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>

          {/* INDICADOR DE MEMBRESÍA - Se muestra cuando hay alumno seleccionado */}
          {formData.student_id && !checkingMembership && (() => {
            const matchingMem = studentMemberships.find(m => m.plan?.service_id === formData.service_id)
            const hasAnyMembership = studentMemberships.length > 0
            const membershipNames = studentMemberships.map(m => m.plan?.name).filter(Boolean).join(', ')

            if (matchingMem) {
              // ✅ Tiene membresía que CUBRE este servicio
              return (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0"/>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-400 uppercase">Cubierto por membresía: {matchingMem.plan?.name}</p>
                    <p className="text-[10px] text-emerald-400/70 mt-0.5">
                      Esta clase no tiene costo adicional — incluida en su plan activo
                    </p>
                  </div>
                </div>
              )
            } else if (hasAnyMembership && formData.service_id) {
              // ⚠️ Tiene membresía pero NO cubre el servicio seleccionado
              return (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
                  <AlertTriangle size={18} className="text-amber-400 flex-shrink-0"/>
                  <div>
                    <p className="text-xs font-bold text-amber-400">Membresía no cubre este servicio</p>
                    <p className="text-[10px] text-amber-400/70 mt-0.5">
                      Tiene plan activo de: <strong>{membershipNames}</strong> — pero esta clase se cobrará aparte
                    </p>
                  </div>
                </div>
              )
            } else if (hasAnyMembership && !formData.service_id) {
              // ℹ️ Tiene membresía, pero aún no eligió servicio
              return (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 flex items-center gap-3">
                  <CreditCard size={18} className="text-indigo-400 flex-shrink-0"/>
                  <div>
                    <p className="text-xs font-bold text-indigo-400">Membresías activas: {membershipNames}</p>
                    <p className="text-[10px] text-indigo-400/70 mt-0.5">Selecciona un servicio para verificar si está cubierto</p>
                  </div>
                </div>
              )
            } else {
              // ❌ No tiene membresía
              return (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-zinc-500 flex-shrink-0"/>
                  <div>
                    <p className="text-xs font-bold text-zinc-400">Sin membresía activa</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Se cobrará el precio del servicio seleccionado</p>
                  </div>
                </div>
              )
            }
          })()}
          {formData.student_id && checkingMembership && (
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
            const matchingMem = studentMemberships.find(m => m.plan?.service_id === formData.service_id)
            const isCovered = !!matchingMem
            const price = selectedService?.price || 0

            if (!formData.service_id || !formData.student_id) return null

            return (
              <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
                isCovered 
                  ? 'border-emerald-500/30 bg-emerald-500/5' 
                  : 'border-zinc-700 bg-zinc-900/80'
              }`}>
                {/* Encabezado con precio */}
                <div className={`px-4 py-3 flex items-center justify-between ${
                  isCovered ? 'bg-emerald-500/10' : 'bg-zinc-800/50'
                }`}>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className={isCovered ? 'text-emerald-400' : 'text-zinc-400'}/>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Cobro por esta clase
                    </span>
                  </div>
                  <div className={`text-lg font-mono font-black ${
                    isCovered ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {isCovered ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={16}/> GRATIS
                      </span>
                    ) : (
                      `$${price}`
                    )}
                  </div>
                </div>

                {/* Método de pago — solo si se va a cobrar */}
                {!isCovered && price > 0 && (
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

                {/* Nota si está cubierto */}
                {isCovered && (
                  <div className="px-4 py-2.5">
                    <p className="text-[10px] text-emerald-400/60 text-center">
                      Cubierto por membresía «{matchingMem?.plan?.name}» — no genera cobro
                    </p>
                  </div>
                )}
              </div>
            )
          })()}

          <div className="space-y-3 pt-4">
            {/* Botón de confirmación dinámico */}
            {(() => {
              const selectedService = services.find(s => s.id === formData.service_id)
              const matchingMem = studentMemberships.find(m => m.plan?.service_id === formData.service_id)
              const isCovered = !!matchingMem
              const price = selectedService?.price || 0
              const showPrice = !editingId && !isCovered && price > 0 && formData.student_id && formData.service_id

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
                      <><DollarSign size={18}/> CONFIRMAR CITA & COBRAR ${price}</>
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
    </div>
  )
}
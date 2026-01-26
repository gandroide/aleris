import React, { useState, useEffect, useCallback } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Calendar as CalendarIcon, Clock, Plus, User, Star, 
  CheckCircle2, AlertTriangle, Loader2, BookOpen, Trash2, Edit, RefreshCw
} from 'lucide-react'
import { Drawer } from '../components/Drawer'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import 'react-day-picker/dist/style.css'

// --- INTERFACES ---
interface Student { id: string; first_name: string; last_name: string }
interface Profile { id: string; full_name: string; type?: string; specific_branch_id?: string }
interface Service { id: string; name: string; price: number }

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
  professionals?: { first_name: string; last_name: string } 
  services?: { name: string }
}

interface ExtendedProfile { organization_id?: string; assigned_branch_id?: string }

export function CalendarPage() {
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
  
  const initialFormState = {
    student_id: '',
    generic_teacher_id: '', 
    service_id: '',
    start_time: '09:00',
    is_private: false
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
          students (first_name, last_name),
          profiles (full_name),
          professionals (first_name, last_name),
          services (name)
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
    
    setIsDrawerOpen(true)
  }

  const handleNewClick = () => {
    setEditingId(null)
    setFormData(initialFormState)
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

      const selectedTeacher = teachers.find(t => t.id === formData.generic_teacher_id)
      const isSystemUser = selectedTeacher?.type === 'system'

      const payload = {
        organization_id: orgId,
        branch_id: branchId,
        student_id: formData.student_id,
        service_id: formData.service_id,
        start_time: startIso,
        end_time: startIso,
        price_at_booking: service ? service.price : 0,
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
        showToast('Cita agendada correctamente', 'success')
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
    content = <div className="py-20 flex flex-col items-center justify-center text-zinc-500 animate-pulse"><Loader2 className="h-8 w-8 animate-spin mb-2 text-indigo-500"/><p>Sincronizando agenda...</p></div>
  } else if (appointments.length === 0) {
    content = (
      <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-xl py-20 text-center text-zinc-500 flex flex-col items-center">
        <Clock className="h-10 w-10 mb-2 opacity-50"/>
        <p className="italic">No hay clases programadas para hoy.</p>
      </div>
    )
  } else {
    content = (
      <div className="grid gap-3">
        {appointments.map((apt) => {
            const teacherName = apt.profiles?.full_name || 
                                (apt.professionals ? `${apt.professionals.first_name} ${apt.professionals.last_name || ''}` : 'Sin Asignar')

            return (
              <div 
                key={apt.id} 
                onClick={() => handleEditClick(apt)}
                className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex items-center justify-between hover:border-indigo-500/50 hover:bg-zinc-800/80 transition-all group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-zinc-950 px-3 py-2 rounded border border-zinc-800 text-indigo-400 font-mono font-bold text-sm group-hover:text-indigo-300 transition-colors">
                    {format(new Date(apt.start_time), 'HH:mm')}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base group-hover:text-indigo-100 transition-colors">
                      {apt.students?.first_name} {apt.students?.last_name}
                    </h4>
                    <p className="text-xs text-zinc-400 flex items-center gap-2 mt-1">
                      <User size={12}/> {teacherName} <span className="text-zinc-600">|</span> <BookOpen size={12}/> {apt.services?.name}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {apt.is_private_class ? (
                    <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider">
                      <Star size={10} fill="currentColor" /> Privada
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                      Regular
                    </div>
                  )}
                  <Edit size={14} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white p-4">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tighter text-indigo-400 font-mono italic">
            ALERIS_CALENDAR
          </h1>
          <p className="text-zinc-500 text-xs font-medium">Gestión de Agenda y Clases Privadas</p>
        </div>
        <button 
          onClick={handleNewClick} 
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus size={18} /> Nueva Cita
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-center h-fit shadow-xl">
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={(day) => day && setSelectedDay(day)}
            locale={es}
            modifiers={{ booked: appointments.map(a => new Date(a.start_time)) }}
            modifiersStyles={{ selected: { backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold' } }}
            className="text-zinc-300"
          />
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <CalendarIcon className="text-indigo-500" size={24} />
            <span className="capitalize font-bold text-lg text-white">
                {format(selectedDay, "EEEE, d 'de' MMMM", { locale: es })}
            </span>
            <button 
                onClick={loadAppointments} 
                className="ml-auto text-zinc-600 hover:text-white transition-colors"
                title="Recargar"
            >
                <RefreshCw size={16}/>
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
                value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            >
              <option value="">Seleccionar Alumno...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>

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

          <div className="space-y-3 pt-4">
            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-4 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? <><Loader2 className="animate-spin" size={20}/> PROCESANDO...</> : (editingId ? "GUARDAR CAMBIOS" : "CONFIRMAR CITA")}
            </button>

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
import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Plus, Search, Phone, MapPin, User, 
  Briefcase, Star, Building2, Calendar, Users, MessageSquare, 
  Loader2, Trash2, Clock, DollarSign, Percent, Shield,
  Save, Mail
} from 'lucide-react'
import { Drawer } from '../components/Drawer'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// --- TIPOS ---
type StaffMember = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  specialty: string | null
  base_salary: number
  commission_percentage: number
  branch_count: number
  avg_rating: number
  photo_url?: string
  role?: string
  type?: string 
}

type Branch = { id: string; name: string }
type Review = { id: string; rating: number; comment: string; created_at: string }
type Appointment = { id: string; start_time: string; service: { name: string } }
type Student = { id: string; first_name: string; last_name: string }

type WorkDay = {
    day_of_week: number
    is_active: boolean
    start_time: string
    end_time: string
}
const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function StaffPage() {
  const { profile, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  const navigate = useNavigate()
  
  // 🟢 OPTIMIZACIÓN: Extraemos el ID para usarlo como dependencia estable
  const orgId = (profile as any)?.organization_id

  // ESTADOS PRINCIPALES
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // ESTADOS DRAWER DETALLE
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'branches' | 'schedule' | 'classes' | 'students' | 'reviews'>('profile')
  const [detailsLoading, setDetailsLoading] = useState(false)
  
  // ESTADOS DRAWER CREAR (INVITACIÓN O PROFESOR EXTERNO)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creationType, setCreationType] = useState<'invitation' | 'external'>('external') // Por defecto externo
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [isInviting, setIsInviting] = useState(false)
  
  // Datos para profesor externo
  const [externalData, setExternalData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    specialty: '',
    email: '' // opcional para externos
  })

  // ESTADOS DATOS DETALLE
  const [assignedBranches, setAssignedBranches] = useState<Branch[]>([])
  const [allBranches, setAllBranches] = useState<Branch[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [upcomingClasses, setUpcomingClasses] = useState<Appointment[]>([])
  const [myStudents, setMyStudents] = useState<Student[]>([])

  // ESTADOS HORARIO
  const [scheduleBranchId, setScheduleBranchId] = useState<string>('')
  const [weeklySchedule, setWeeklySchedule] = useState<WorkDay[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)

  // Inputs perfil como strings para mejor UX
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', 
    phone: '', specialty: '', 
    base_salary: '', 
    commission_percentage: ''
  })

  // --- CARGA INICIAL OPTIMIZADA ---
  useEffect(() => {
    if (!authLoading && orgId) {
        loadStaff()
    }
  }, [orgId, authLoading])

  const loadStaff = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('staff_details_view') 
        .select('*')
        .eq('organization_id', orgId)
        .order('full_name', { ascending: true })
      
      if (error) throw error
      setStaff(data || [])
      
      const { data: branchData } = await supabase.from('branches').select('id, name').eq('organization_id', orgId)
      setAllBranches(branchData || [])

    } catch (err) {
      console.error(err)
      showToast('Error cargando personal', 'error')
    } finally {
      setLoading(false)
    }
  }

  // --- ABRIR DRAWER DETALLE ---
  const handleStaffClick = async (member: StaffMember) => {
    setSelectedStaff(member)
    setActiveTab('profile')
    setFormData({
        ...formData,
        phone: member.phone || '',
        specialty: member.specialty || '',
        base_salary: member.base_salary ? member.base_salary.toString() : '',
        commission_percentage: member.commission_percentage ? member.commission_percentage.toString() : ''
    })
    
    if (allBranches.length > 0) setScheduleBranchId(allBranches[0].id)
    setDetailsLoading(true)

    try {
        const columnToSearch = member.type === 'system' ? 'profile_id' : 'professional_id'
        const apptColumn = member.type === 'system' ? 'profile_id' : 'professional_id'
        
        // ✅ OPTIMIZACIÓN: Paralelizar todas las queries independientes
        const queries = [
            supabase
                .from('branch_staff')
                .select('branch:branches!fk_branch_staff_branch(id, name)')
                .eq(columnToSearch, member.id),
            
            supabase
                .from('appointments')
                .select('id, start_time, service:services!fk_appointments_service(name)')
                .eq(apptColumn, member.id)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(5),
            
            supabase
                .from('appointments')
                .select('student:students!fk_appointments_student(id, first_name, last_name)')
                .eq(apptColumn, member.id)
                .not('student_id', 'is', null)
                .limit(50)
        ]

        // Solo agregar reviews si es staff del sistema
        if (member.type === 'system') {
            queries.push(
                supabase
                    .from('teacher_reviews')
                    .select('*')
                    .eq('teacher_id', member.id)
                    .order('created_at', { ascending: false })
            )
        }

        const results = await Promise.all(queries)
        
        // Procesar resultados según el índice
        let resultIndex = 0
        
        // Branches (siempre es el primero)
        const branchesData = results[resultIndex].data
        const branches = branchesData?.map((b: any) => b.branch) || []
        setAssignedBranches(branches)
        resultIndex++

        // Classes (siempre es el segundo)
        const classData = results[resultIndex].data
        setUpcomingClasses(classData as any || [])
        resultIndex++

        // Students (siempre es el tercero)
        const studData = results[resultIndex].data
        const uniqueStudentsMap = new Map()
        studData?.forEach((item: any) => {
            if(item.student) uniqueStudentsMap.set(item.student.id, item.student)
        })
        setMyStudents(Array.from(uniqueStudentsMap.values()))
        resultIndex++

        // Reviews (solo si es system, será el cuarto)
        if (member.type === 'system') {
            const reviewData = results[resultIndex]?.data
            setReviews((reviewData || []) as unknown as Review[])
        } else {
            setReviews([])
        }

    } catch (err) {
        console.error(err)
    } finally {
        setDetailsLoading(false)
    }
  }

  // --- HORARIOS ---
  useEffect(() => {
    if (activeTab === 'schedule' && selectedStaff && scheduleBranchId) {
        loadScheduleForMember(selectedStaff.id, scheduleBranchId)
    }
  }, [scheduleBranchId, activeTab, selectedStaff])

  const loadScheduleForMember = async (memberId: string, branchId: string) => {
    setLoadingSchedule(true)
    try {
        const initialWeek: WorkDay[] = Array.from({ length: 7 }).map((_, index) => ({
            day_of_week: index, is_active: false, start_time: '09:00', end_time: '18:00'
        }))
        if (selectedStaff?.type === 'system') {
            const { data } = await supabase.from('staff_schedules')
                .select('*').eq('profile_id', memberId).eq('branch_id', branchId)

            if (data) {
                data.forEach(savedDay => {
                    const dayIndex = savedDay.day_of_week
                    if (initialWeek[dayIndex]) {
                        initialWeek[dayIndex] = {
                            day_of_week: dayIndex, is_active: true,
                            start_time: savedDay.start_time.slice(0, 5),
                            end_time: savedDay.end_time.slice(0, 5)
                        }
                    }
                })
            }
        }
        setWeeklySchedule(initialWeek)
    } catch (err) { showToast('Error cargando horario', 'error') } 
    finally { setLoadingSchedule(false) }
  }

  const handleSaveSchedule = async () => {
    if (!selectedStaff || !scheduleBranchId) return
    if (selectedStaff.type !== 'system') {
        showToast('Los profesionales externos no manejan horario fijo en sistema', 'info')
        return
    }

    setIsSavingSchedule(true)
    try {
        await supabase.from('staff_schedules').delete()
            .eq('profile_id', selectedStaff.id).eq('branch_id', scheduleBranchId)

        const activeDays = weeklySchedule.filter(d => d.is_active).map(d => ({
            organization_id: orgId, profile_id: selectedStaff.id, branch_id: scheduleBranchId,
            day_of_week: d.day_of_week, start_time: d.start_time, end_time: d.end_time
        }))

        if (activeDays.length > 0) {
            const { error } = await supabase.from('staff_schedules').insert(activeDays)
            if (error) throw error
        }
        showToast('Horario actualizado', 'success')
    } catch (err) { showToast('Error guardando horario', 'error') } 
    finally { setIsSavingSchedule(false) }
  }

  const updateDayState = (index: number, field: keyof WorkDay, value: any) => {
    const newSchedule = [...weeklySchedule]
    newSchedule[index] = { ...newSchedule[index], [field]: value }
    setWeeklySchedule(newSchedule)
  }

  // --- ACCIONES PERFIL ---
  const handleUpdateProfile = async () => {
    if (!selectedStaff) return
    try {
        const salaryNum = formData.base_salary === '' ? 0 : parseFloat(formData.base_salary)
        const commissionNum = formData.commission_percentage === '' ? 0 : parseFloat(formData.commission_percentage)

        const payload = {
            phone: formData.phone,
            specialty: formData.specialty,
            base_salary: salaryNum,
            commission_percentage: commissionNum
        }

        if(selectedStaff.type === 'system') {
            const { error } = await supabase.from('profiles').update(payload).eq('id', selectedStaff.id)
            if (error) throw error
        } else {
            const { error } = await supabase.from('professionals').update(payload).eq('id', selectedStaff.id)
            if (error) throw error
        }

        showToast('Perfil actualizado', 'success')
        loadStaff()
    } catch (err) { showToast('Error al actualizar', 'error') }
  }

  const handleAssignBranch = async (branchId: string) => {
    if (!selectedStaff) return
    if (assignedBranches.find(b => b.id === branchId)) return

    try {
        const payload = {
            organization_id: orgId,
            branch_id: branchId,
            profile_id: selectedStaff.type === 'system' ? selectedStaff.id : null,
            professional_id: selectedStaff.type === 'professional' ? selectedStaff.id : null
        }

        const { error } = await supabase.from('branch_staff').insert(payload)
        if (error) throw error
        
        const branchAdded = allBranches.find(b => b.id === branchId)
        if (branchAdded) setAssignedBranches([...assignedBranches, branchAdded])
        showToast('Asignado a nueva sucursal', 'success')
        loadStaff()
    } catch (err) { showToast('Error al asignar', 'error') }
  }

  const handleRemoveBranch = async (branchId: string) => {
    if (!selectedStaff) return
    if (!confirm('¿Quitar acceso a esta sucursal?')) return
    try {
        const column = selectedStaff.type === 'system' ? 'profile_id' : 'professional_id'
        
        await supabase.from('branch_staff').delete()
            .eq(column, selectedStaff.id)
            .eq('branch_id', branchId)
            
        setAssignedBranches(assignedBranches.filter(b => b.id !== branchId))
        showToast('Acceso revocado', 'success')
        loadStaff()
    } catch (err) { showToast('Error', 'error') }
  }

  // 🟢 CREAR MIEMBRO: Invitación o Profesor Externo
  const handleCreateMember = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!orgId) return
      
      setIsInviting(true)
      try {
          if (creationType === 'invitation') {
              // OPCIÓN 1: Invitar staff para que use la app
              const { error } = await supabase.from('organization_invitations').insert({
                  email: inviteEmail.trim().toLowerCase(),
                  organization_id: orgId,
                  role: inviteRole,
                  status: 'pending'
              })

              if (error) throw error
              showToast('Invitación enviada exitosamente', 'success')
              setInviteEmail('')
              
          } else {
              // OPCIÓN 2: Crear profesor externo (no usa la app)
              if (!externalData.firstName || !externalData.lastName) {
                  showToast('Nombre y apellido son obligatorios', 'error')
                  return
              }

              const { error } = await supabase.from('professionals').insert({
                  organization_id: orgId,
                  full_name: `${externalData.firstName} ${externalData.lastName}`,
                  email: externalData.email || null,
                  phone: externalData.phone || null,
                  specialty: externalData.specialty || null,
                  base_salary: 0,
                  commission_percentage: 0
              })

              if (error) throw error
              showToast('Profesor externo agregado exitosamente', 'success')
              setExternalData({ firstName: '', lastName: '', phone: '', specialty: '', email: '' })
          }

          setIsCreateOpen(false)
          loadStaff() // Recargar lista
          
      } catch (err: any) {
          console.error(err)
          showToast(err.message || 'Error al crear miembro', 'error')
      } finally {
          setIsInviting(false)
      }
  }

  // ✅ OPTIMIZACIÓN: Memoizar filtrado
  const filteredStaff = useMemo(
    () => staff.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase())),
    [staff, searchTerm]
  )

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-white">Equipo y Staff</h1>
                <p className="text-zinc-400 mt-1">Gestión de RRHH, Evaluaciones y Turnos</p>
            </div>
            <button onClick={() => setIsCreateOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                <Plus className="h-5 w-5" /> <span>Nuevo Miembro</span>
            </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-zinc-700" />
        </div>

        {loading ? (
             <div className="flex justify-center h-40 items-center animate-in fade-in duration-300">
                <Loader2 className="animate-spin text-indigo-500" size={40}/>
                <span className="ml-3 text-zinc-400">Cargando equipo...</span>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredStaff.map((member, index) => (
                    <div 
                        key={member.id} 
                        onClick={() => handleStaffClick(member)}
                        className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 hover:border-indigo-500/40 cursor-pointer transition-all duration-300 group relative overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 card-hover animate-in slide-in-from-bottom duration-500"
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        {/* Background gradient effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Role Badge */}
                        <div className="absolute top-4 right-4">
                            {member.role === 'owner' ? (
                                <div className="p-2 bg-indigo-500/10 rounded-lg ring-2 ring-indigo-500/20">
                                    <Shield size={16} className="text-indigo-400"/>
                                </div>
                            ) : (
                                <div className="p-2 bg-zinc-800/50 rounded-lg">
                                    <User size={16} className="text-zinc-600"/>
                                </div>
                            )}
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="relative">
                                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 flex items-center justify-center font-bold text-xl border-2 border-indigo-500/30 group-hover:border-indigo-500/60 transition-colors shadow-lg">
                                        {member.full_name[0]}
                                    </div>
                                    {/* Rating indicator */}
                                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center border-2 border-zinc-900 shadow-lg">
                                        <Star size={12} fill="currentColor" className="text-zinc-900"/>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors text-lg">
                                        {member.full_name}
                                    </h3>
                                    <div className="flex gap-2 items-center mt-1">
                                        <p className="text-xs text-zinc-500 uppercase font-semibold">{member.specialty || 'Staff'}</p>
                                        {member.type === 'professional' && (
                                            <span className="text-[10px] bg-purple-500/10 px-2 py-0.5 rounded-lg text-purple-400 border border-purple-500/20 font-bold uppercase">
                                                EXT
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Stats Section */}
                            <div className="flex items-center justify-between pt-4 border-t border-zinc-800 gap-3">
                                <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 backdrop-blur-sm">
                                    <Star size={14} fill="currentColor" className="text-amber-500"/>
                                    <span className="text-sm text-amber-400 font-bold">
                                        {Number(member.avg_rating || 0).toFixed(1)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 bg-zinc-800/60 px-3 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors backdrop-blur-sm">
                                    <Building2 size={14} className="text-zinc-400"/>
                                    <span className="text-sm text-zinc-300 font-semibold">
                                        {member.branch_count} {member.branch_count === 1 ? 'sede' : 'sedes'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Hover action hint */}
                            <div className="mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-xs text-indigo-400 font-semibold">Ver ficha completa →</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {selectedStaff && (
        <Drawer isOpen={!!selectedStaff} onClose={() => setSelectedStaff(null)} title="Ficha del Empleado">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-800">
                <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold text-white shadow-lg border border-zinc-700">
                    {selectedStaff.full_name[0]}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">{selectedStaff.full_name}</h2>
                    <p className="text-zinc-500 text-sm">{selectedStaff.email}</p>
                    {selectedStaff.type === 'professional' && <span className="text-xs text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded mt-1 inline-block">Profesional Externo</span>}
                </div>
            </div>

            <div className="flex overflow-x-auto gap-2 border-b border-zinc-800 mb-6 pb-1 scrollbar-hide">
                {[
                    {id: 'profile', icon: User, label: 'Perfil'},
                    {id: 'branches', icon: MapPin, label: 'Sucursales'},
                    ...(selectedStaff.type === 'system' ? [{id: 'schedule', icon: Clock, label: 'Horario'}] : []),
                    {id: 'classes', icon: Calendar, label: 'Clases'},
                    {id: 'students', icon: Users, label: 'Alumnos'},
                    ...(selectedStaff.type === 'system' ? [{id: 'reviews', icon: MessageSquare, label: 'Reviews'}] : []),
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all ${
                            activeTab === tab.id ? 'bg-zinc-800 text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                        }`}
                    >
                        <tab.icon size={14}/> {tab.label}
                    </button>
                ))}
            </div>

            {detailsLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-zinc-500"/></div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase">Especialidad</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16}/>
                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 pl-10 text-white mt-1 focus:border-indigo-500 outline-none"
                                        placeholder="Ej: Salsa" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase">Teléfono</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16}/>
                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 pl-10 text-white mt-1 focus:border-indigo-500 outline-none"
                                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                                <div>
                                    <label className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-1"><DollarSign size={12}/> Salario Base</label>
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1 focus:border-emerald-500 outline-none"
                                        value={formData.base_salary} 
                                        onChange={e => setFormData({...formData, base_salary: e.target.value.replace(/[^0-9]/g, '')})} 
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-amber-500 uppercase flex items-center gap-1"><Percent size={12}/> Comisión</label>
                                    <input 
                                        type="text" 
                                        inputMode="decimal"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1 focus:border-amber-500 outline-none"
                                        value={formData.commission_percentage} 
                                        onChange={e => setFormData({...formData, commission_percentage: e.target.value.replace(/[^0-9.]/g, '')})}
                                        placeholder="0.0"
                                    />
                                    <p className="text-[10px] text-zinc-500 mt-1">Ej: 0.10 para 10%</p>
                                </div>
                            </div>

                            <button onClick={handleUpdateProfile} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded mt-4">
                                Guardar Perfil
                            </button>
                        </div>
                    )}

                    {/* Resto de tabs (branches, schedule, etc...) igual que antes */}
                    {activeTab === 'branches' && (
                        <div className="space-y-4">
                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                                <h3 className="text-sm font-bold text-white mb-3">Sucursales Asignadas</h3>
                                {assignedBranches.length === 0 ? (
                                    <p className="text-zinc-500 text-sm italic">No asignado a ninguna sucursal.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {assignedBranches.map(b => (
                                            <div key={b.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded border border-zinc-800">
                                                <div className="flex items-center gap-2 text-white text-sm">
                                                    <MapPin size={14} className="text-indigo-500"/> {b.name}
                                                </div>
                                                <button onClick={() => handleRemoveBranch(b.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="pt-4 border-t border-zinc-800">
                                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Asignar a otra sede</label>
                                <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:border-indigo-500 outline-none"
                                    onChange={(e) => { if(e.target.value) handleAssignBranch(e.target.value); e.target.value = '' }}>
                                    <option value="">+ Seleccionar Sucursal...</option>
                                    {allBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-zinc-900 p-2 rounded border border-zinc-800 mb-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Sede del Horario:</label>
                                <select className="bg-black border border-zinc-700 text-white text-sm rounded p-1" 
                                    value={scheduleBranchId} onChange={(e) => setScheduleBranchId(e.target.value)}>
                                    {allBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            {loadingSchedule ? <p className="text-center text-zinc-500 py-4"><Loader2 className="animate-spin inline mr-2"/>Cargando...</p> : (
                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                                    {weeklySchedule.map((day, index) => (
                                        <div key={day.day_of_week} className={`p-3 rounded border flex items-center gap-3 transition-colors ${day.is_active ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-950 border-zinc-800 opacity-60'}`}>
                                            <input type="checkbox" checked={day.is_active} onChange={(e) => updateDayState(index, 'is_active', e.target.checked)} className="h-4 w-4 accent-emerald-500" />
                                            <div className="w-24 text-sm font-medium text-white">{DAYS_OF_WEEK[day.day_of_week]}</div>
                                            {day.is_active && (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input type="time" className="bg-black text-white text-xs p-1 rounded border border-zinc-700" value={day.start_time} onChange={(e) => updateDayState(index, 'start_time', e.target.value)}/>
                                                    <span className="text-zinc-500">-</span>
                                                    <input type="time" className="bg-black text-white text-xs p-1 rounded border border-zinc-700" value={day.end_time} onChange={(e) => updateDayState(index, 'end_time', e.target.value)}/>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button onClick={handleSaveSchedule} disabled={isSavingSchedule} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded mt-2 flex items-center justify-center gap-2">
                                <Save size={16}/> Guardar Horario
                            </button>
                        </div>
                    )}

                    {activeTab === 'classes' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold text-white">Próximas Clases</h3>
                                <button onClick={() => navigate('/agenda')} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded border border-zinc-700 transition-colors flex items-center gap-2">
                                    <Plus size={12} /> Programar Nueva
                                </button>
                            </div>
                            {upcomingClasses.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 flex flex-col items-center">
                                    <Calendar className="text-zinc-600 mb-2" size={32}/>
                                    <p className="text-zinc-500 text-sm mb-3">Agenda libre.</p>
                                </div>
                            ) : (
                                upcomingClasses.map(c => (
                                    <div key={c.id} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                                        <div className="bg-zinc-950 p-2 rounded text-indigo-400 border border-zinc-800">
                                            <Calendar size={18}/>
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">{c.service?.name || 'Clase'}</p>
                                            <p className="text-zinc-500 text-xs font-mono">
                                                {format(new Date(c.start_time), "EEEE d 'de' MMMM, HH:mm", {locale: es})}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'students' && (
                        <div className="grid grid-cols-2 gap-3">
                            {myStudents.length === 0 ? <p className="col-span-2 text-center text-zinc-500 py-4 italic">Aún no ha tenido alumnos.</p> : 
                                myStudents.map(s => (
                                    <div key={s.id} className="flex items-center gap-2 p-2 bg-zinc-900 rounded border border-zinc-800">
                                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">{s.first_name[0]}</div>
                                        <span className="text-sm text-zinc-300">{s.first_name} {s.last_name}</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="space-y-4">
                             {reviews.length === 0 ? (
                                <div className="text-center py-10 bg-zinc-900/30 rounded border border-dashed border-zinc-800">
                                    <MessageSquare className="mx-auto text-zinc-600 mb-2"/>
                                    <p className="text-zinc-500 text-sm">Sin evaluaciones registradas.</p>
                                </div>
                            ) : (
                                reviews.map(r => (
                                    <div key={r.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                        <div className="flex gap-1 text-amber-500 mb-2">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} className={i >= r.rating ? "text-zinc-700" : ""}/>
                                            ))}
                                        </div>
                                        <p className="text-zinc-300 text-sm">"{r.comment}"</p>
                                        <p className="text-zinc-600 text-[10px] mt-2 text-right">{format(new Date(r.created_at), "d MMM yyyy", {locale: es})}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </Drawer>
      )}

      {/* 🟢 DRAWER: AGREGAR MIEMBRO */}
      <Drawer isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Agregar al Equipo">
          <form onSubmit={handleCreateMember} className="space-y-4">
             <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded">
                
                {/* SELECTOR DE TIPO */}
                <div className="mb-6 bg-zinc-950 p-3 rounded-lg border border-zinc-700">
                    <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase">Tipo de Miembro</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setCreationType('external')}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                                creationType === 'external' 
                                    ? 'border-indigo-500 bg-indigo-500/10' 
                                    : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <User size={16} className={creationType === 'external' ? 'text-indigo-400' : 'text-zinc-500'}/>
                                <span className={`text-sm font-bold ${creationType === 'external' ? 'text-white' : 'text-zinc-400'}`}>
                                    Profesor Externo
                                </span>
                            </div>
                            <p className="text-[10px] text-zinc-500">No usa la app, solo necesitas su nombre</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setCreationType('invitation')}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                                creationType === 'invitation' 
                                    ? 'border-emerald-500 bg-emerald-500/10' 
                                    : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Mail size={16} className={creationType === 'invitation' ? 'text-emerald-400' : 'text-zinc-500'}/>
                                <span className={`text-sm font-bold ${creationType === 'invitation' ? 'text-white' : 'text-zinc-400'}`}>
                                    Staff con Acceso
                                </span>
                            </div>
                            <p className="text-[10px] text-zinc-500">Usará la app, requiere invitación</p>
                        </button>
                    </div>
                </div>

                {/* FORMULARIO SEGÚN TIPO */}
                {creationType === 'external' ? (
                    // FORMULARIO PROFESOR EXTERNO
                    <div className="space-y-3">
                        <p className="text-zinc-400 text-sm mb-4 bg-zinc-900 p-3 rounded border border-zinc-800">
                            💡 Este profesor <strong>no tendrá acceso</strong> a la aplicación. Solo podrás asignarlo a clases desde tu cuenta.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">Nombre *</label>
                                <input 
                                    type="text" 
                                    placeholder="Juan" 
                                    required 
                                    value={externalData.firstName}
                                    onChange={e => setExternalData({...externalData, firstName: e.target.value})}
                                    className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-indigo-500 outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">Apellido *</label>
                                <input 
                                    type="text" 
                                    placeholder="Pérez" 
                                    required 
                                    value={externalData.lastName}
                                    onChange={e => setExternalData({...externalData, lastName: e.target.value})}
                                    className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-indigo-500 outline-none" 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">Especialidad</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Salsa, Yoga, Inglés..." 
                                value={externalData.specialty}
                                onChange={e => setExternalData({...externalData, specialty: e.target.value})}
                                className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-indigo-500 outline-none" 
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">Teléfono (opcional)</label>
                            <input 
                                type="tel" 
                                placeholder="+57 300 123 4567" 
                                value={externalData.phone}
                                onChange={e => setExternalData({...externalData, phone: e.target.value})}
                                className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-indigo-500 outline-none" 
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">Email (opcional)</label>
                            <input 
                                type="email" 
                                placeholder="profesor@ejemplo.com" 
                                value={externalData.email}
                                onChange={e => setExternalData({...externalData, email: e.target.value})}
                                className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-indigo-500 outline-none" 
                            />
                            <p className="text-[10px] text-zinc-600 mt-1">Solo para contacto, no se enviará invitación</p>
                        </div>
                    </div>
                ) : (
                    // FORMULARIO INVITACIÓN (STAFF CON ACCESO)
                    <div className="space-y-3">
                        <p className="text-zinc-400 text-sm mb-4 bg-zinc-900 p-3 rounded border border-zinc-800">
                            📧 Se enviará una invitación a este correo. La persona podrá registrarse y acceder a la app.
                        </p>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1 flex items-center gap-1">
                                <Mail size={12}/> Correo Electrónico *
                            </label>
                            <input 
                                type="email" 
                                placeholder="correo@empleado.com" 
                                required 
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-indigo-500 outline-none" 
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1 flex items-center gap-1">
                                <Shield size={12}/> Rol en la App
                            </label>
                            <select 
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-indigo-500 outline-none"
                            >
                                <option value="staff">Staff Administrativo</option>
                                <option value="teacher">Profesor con Acceso</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* BOTÓN DE SUBMIT */}
                <button 
                    type="submit" 
                    disabled={isInviting} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded mt-6 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isInviting ? (
                        <><Loader2 className="animate-spin" size={18}/> Procesando...</>
                    ) : (
                        creationType === 'external' ? '✓ Agregar Profesor' : '📧 Enviar Invitación'
                    )}
                </button>
             </div>
          </form>
      </Drawer>
    </>
  )
}
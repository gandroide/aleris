import React, { useEffect, useState, useMemo } from 'react'
// import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Plus, Search, Mail, Phone, Calendar, 
  FileText, MapPin, User, Save, CreditCard, CheckCircle2, AlertTriangle, 
  Crown, History, Loader2, Users, Edit2, X, Check, ArrowRight
} from 'lucide-react'
import { Drawer } from '../components/Drawer'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import { format, differenceInDays, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

// --- TIPOS ---
type Client = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  birth_date: string | null
  notes: string | null
  status_label: 'solvente' | 'moroso' | 'sin_pagos'
}

type ActiveMembership = {
  id: string
  plan: { name: string; duration_days: number; service: { name: string } | null }
  start_date: string
  end_date: string
  status: string
}

type Payment = {
  id: string
  amount: number
  created_at: string
  concept: string
}

type Plan = {
  id: string
  name: string
  duration_days: number
  price: number
  service: { name: string } | null
}

export default function ClientsPage() {
  const { profile, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  // const navigate = useNavigate()
  
  // 🟢 OPTIMIZACIÓN: Extraer primitivos
  const orgId = (profile as any)?.organization_id
  const branchId = (profile as any)?.assigned_branch_id
  const userRole = (profile as any)?.role

  // ESTADOS GLOBALES
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // ESTADOS DRAWER
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'membership' | 'history'>('profile')
  
  // ESTADOS DETALLES CLIENTE
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  const [activeMemberships, setActiveMemberships] = useState<ActiveMembership[]>([]) 
  const [history, setHistory] = useState<Payment[]>([])
  
  // ESTADOS ASIGNACIÓN DE PLAN
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [isAssigningPlan, setIsAssigningPlan] = useState(false)
  const [selectedPlanIdToAssign, setSelectedPlanIdToAssign] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', notes: ''
  })

  // 🟢 EFECTO OPTIMIZADO: Depende de primitivos, no del objeto profile
  useEffect(() => {
    if (authLoading) {
      setErrorMsg(null)
      return
    }

    if (orgId) {
        loadClients()
    } else if (!profile) {
        setErrorMsg("No se pudo cargar el perfil.")
        setLoading(false)
    }
  }, [orgId, branchId, userRole, authLoading, profile]) // Dependencias estables

  const loadClients = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      if (!orgId) throw new Error("Sin organización")

      let query = supabase
        .from('student_solvency_view')
        .select('*')
        .eq('organization_id', orgId)
        .order('last_name', { ascending: true })
        
      if (userRole === 'staff' && branchId) {
         query = query.eq('branch_id', branchId)
      }

      const { data, error } = await query
      if (error) throw error
      setClients(data || [])
    } catch (err: any) {
      console.error(err)
      setErrorMsg("Error cargando base de datos.")
    } finally {
      setLoading(false)
    }
  }

  const handleClientClick = async (client: Client) => {
    setSelectedClient(client)
    setActiveTab('profile')
    setLoadingDetails(true)
    
    try {
        // ✅ OPTIMIZACIÓN: Paralelizar ambas queries
        const [resMem, resHist, resPlans] = await Promise.all([
            supabase
                .from('memberships')
                .select(`
                    id, start_date, end_date, status,
                    plan:plans!fk_memberships_plan (name, duration_days, service:services!fk_plans_service(name))
                `)
                .eq('student_id', client.id)
                .eq('status', 'active')
                .order('end_date', { ascending: true }),
            
            supabase
                .from('transactions')
                .select('*')
                .eq('student_id', client.id)
                .order('created_at', { ascending: false })
                .limit(10),
            
            supabase
                .from('plans')
                .select('id, name, duration_days, price') // Simplificado para evitar FK error
                .eq('organization_id', orgId)
                .eq('is_active', true)
                .order('name')
        ])
        
        if (resPlans.error) {
            console.error("Error cargando planes:", resPlans.error)
        }

        setActiveMemberships(resMem.data as any || [])
        setHistory(resHist.data || [])
        setAvailablePlans(resPlans.data as any || [])

    } catch (error) {
        console.error("Error cargando detalles", error)
    } finally {
        setLoadingDetails(false)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { error } = await supabase.from('students').insert({
        organization_id: orgId,
        branch_id: branchId || null,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        notes: formData.notes || null
      })
      if (error) throw error

      setIsCreateOpen(false)
      setFormData({ first_name: '', last_name: '', email: '', phone: '', notes: '' })
      showToast('Cliente creado exitosamente', 'success')
      loadClients()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateNotes = async () => {
    if (!selectedClient) return
    try {
      const { error } = await supabase
        .from('students')
        .update({ notes: selectedClient.notes })
        .eq('id', selectedClient.id)

      if (error) throw error
      showToast('Notas guardadas', 'success')
    } catch (err) {
      showToast('Error guardando notas', 'error')
    }
  }

  // --- EDIT PROFILE LOGIC ---
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileFormData, setProfileFormData] = useState({
      first_name: '', last_name: '', email: '', phone: '', address: '', birth_date: ''
  })
  
  // Sync when opening drawer
  useEffect(() => {
      if (selectedClient) {
          setProfileFormData({
              first_name: selectedClient.first_name,
              last_name: selectedClient.last_name,
              email: selectedClient.email || '',
              phone: selectedClient.phone || '',
              address: selectedClient.address || '',
              birth_date: selectedClient.birth_date || ''
          })
          setIsEditingProfile(false) // Reset mode
      }
  }, [selectedClient])

  const handleSaveProfile = async () => {
      if (!selectedClient) return
      setSubmitting(true)
      try {
          const { error } = await supabase.from('students').update({
              first_name: profileFormData.first_name,
              last_name: profileFormData.last_name,
              email: profileFormData.email || null,
              phone: profileFormData.phone || null,
              address: profileFormData.address || null,
              birth_date: profileFormData.birth_date || null
          }).eq('id', selectedClient.id)

          if (error) throw error
          
          showToast('Perfil actualizado correctamente', 'success')
          setIsEditingProfile(false)
          
          // Update local state without reloading everything
          setSelectedClient(prev => prev ? ({ ...prev, ...profileFormData }) : null)
          setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, ...profileFormData } : c))

      } catch (err: any) {
          showToast('Error actualizando perfil', 'error')
          console.error(err)
      } finally {
          setSubmitting(false)
      }
  }

  const handleAssignPlan = async () => {
    if (!selectedClient || !selectedPlanIdToAssign) return
    setSubmitting(true)
    try {
        const plan = availablePlans.find(p => p.id === selectedPlanIdToAssign)
        if (!plan) throw new Error("Plan no encontrado")
        
        const startDate = new Date()
        const endDate = addDays(startDate, plan.duration_days)
        
        // 1. Insert Membership
        const { data: newMem, error: insertError } = await supabase
            .from('memberships')
            .insert({
                organization_id: orgId,
                student_id: selectedClient.id,
                plan_id: plan.id,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'active',
                price_paid: plan.price
            })
            .select()
            .single()
            
        if (insertError) throw insertError
        
        // 2. RPC Call for Recurring Appointments
        const { error: rpcError } = await supabase.rpc('generate_recurring_appointments', {
            p_membership_id: newMem.id
        })
        
        if (rpcError) {
            console.error("Error generando clases:", rpcError)
            // We don't throw here to not rollback the membership, but we warn
            showToast('Membresía creada, pero hubo un error generando clases.', 'error')
        } else {
            showToast('Membresía asignada correctamente', 'success')
        }
        
        // 3. Refresh Data
        setIsAssigningPlan(false)
        setSelectedPlanIdToAssign('')
        
        // Reload details
        handleClientClick(selectedClient)
        
    } catch (err: any) {
        showToast(err.message || 'Error asignando plan', 'error')
    } finally {
        setSubmitting(false)
    }
  }

  // ✅ OPTIMIZACIÓN: Memoizar filtrado para evitar recálculos innecesarios
  const filteredClients = useMemo(
    () => clients.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [clients, searchTerm]
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'solvente': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
      case 'moroso': return 'bg-red-500/20 text-red-400 border-red-500/50'
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50'
    }
  }

  const getDaysProgress = (start: string, end: string) => {
      const total = differenceInDays(new Date(end), new Date(start))
      const remaining = differenceInDays(new Date(end), new Date())
      const percent = Math.max(0, Math.min(100, (remaining / total) * 100))
      return { remaining, percent }
  }

  // --- KPIS ---
  const kpiStats = useMemo(() => {
    const total = clients.length
    const solvent = clients.filter(c => c.status_label === 'solvente').length
    const attention = clients.filter(c => ['moroso', 'sin_pagos'].includes(c.status_label)).length
    return { total, solvent, attention }
  }, [clients])

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Alumnos</h1>
            <p className="text-zinc-400 mt-1">Gestión de alumnos y perfiles</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            disabled={!!errorMsg}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Plus className="h-5 w-5" /> <span>Nuevo Alumno</span>
          </button>
        </div>

        {loading ? (
             <div className="flex flex-col items-center justify-center h-64 text-zinc-500 animate-in fade-in duration-300">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p className="font-medium">Cargando cartera de clientes...</p>
             </div>
        ) : errorMsg ? (
            <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-2xl text-center backdrop-blur-sm animate-in fade-in duration-300">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-400 font-semibold">{errorMsg}</p>
            </div>
        ) : (
            <>
                {/* --- KPI DASHBOARD --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Total Alumnos</p>
                            <p className="text-2xl font-bold text-white font-mono">{kpiStats.total}</p>
                        </div>
                        <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Solventes</p>
                            <p className="text-2xl font-bold text-white font-mono">{kpiStats.solvent}</p>
                        </div>
                        <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Atención Requerida</p>
                            <p className="text-2xl font-bold text-white font-mono">{kpiStats.attention}</p>
                        </div>
                        <div className="h-10 w-10 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500 border border-rose-500/20">
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <input
                    type="text" placeholder="Buscar por nombre..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="input w-full pl-12 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                  />
                </div>

                {clients.length === 0 ? (
                    <EmptyState
                      icon={User}
                      title="¡Tu primer alumno te espera!"
                      description="Agrega a tus alumnos para llevar el control de pagos, asistencia y membresías."
                      actionLabel="Inscribir Alumno"
                      onAction={() => setIsCreateOpen(true)}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredClients.map((client, index) => (
                        <div 
                            key={client.id} 
                            onClick={() => handleClientClick(client)}
                            className="group bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 hover:border-indigo-500/40 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 card-hover animate-in slide-in-from-bottom duration-500"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="relative">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-white font-bold border-2 border-indigo-500/30 group-hover:border-indigo-500/60 transition-colors text-lg shadow-lg">
                                            {client.first_name[0]}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-zinc-900 ${
                                            client.status_label === 'solvente' ? 'bg-emerald-500' : 
                                            client.status_label === 'moroso' ? 'bg-red-500' : 'bg-zinc-500'
                                        }`}></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold group-hover:text-indigo-400 transition-colors truncate">
                                            {client.first_name} {client.last_name}
                                        </h3>
                                        <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">Ver expediente completo →</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Status Badge */}
                            <div className={`px-3 py-2 text-xs font-bold uppercase rounded-lg border backdrop-blur-sm ${getStatusColor(client.status_label)} flex items-center justify-center gap-2`}>
                                {client.status_label === 'solvente' ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>}
                                {client.status_label.replace('_', ' ')}
                            </div>
                            
                            {/* Contact Info & Quick Actions */}
                            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    {client.phone && <Phone size={12} />}
                                    {client.email && <Mail size={12} />}
                                    <span className="truncate max-w-[120px]">{client.email || client.phone || 'Sin contacto'}</span>
                                </div>

                                {client.phone && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(`https://wa.me/${client.phone?.replace('+', '')}`, '_blank')
                                        }}
                                        className="bg-zinc-800 hover:bg-emerald-600 text-zinc-400 hover:text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                                        title="Abrir WhatsApp"
                                    >
                                        <Phone size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </>
        )}
      </div>

      {selectedClient && (
        <Drawer isOpen={!!selectedClient} onClose={() => setSelectedClient(null)} title="Expediente Digital">
            
            <div className="flex items-center gap-4 pb-6 border-b border-zinc-800 mb-6">
                <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold text-white border border-zinc-700 shadow-lg">
                    {selectedClient.first_name[0]}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">{selectedClient.first_name} {selectedClient.last_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(selectedClient.status_label)}`}>
                            {selectedClient.status_label === 'solvente' ? <CheckCircle2 size={10}/> : <AlertTriangle size={10}/>}
                            {selectedClient.status_label}
                        </div>
                        <span className="text-zinc-600 text-[10px] uppercase font-mono">ID: {selectedClient.id.slice(0, 8)}</span>
                    </div>
                </div>
            </div>

            <div className="flex border-b border-zinc-800 mb-6">
                <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 pb-3 text-sm font-bold flex justify-center gap-2 border-b-2 transition-colors ${activeTab === 'profile' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                >
                    <User size={16}/> Perfil
                </button>
                <button 
                    onClick={() => setActiveTab('membership')}
                    className={`flex-1 pb-3 text-sm font-bold flex justify-center gap-2 border-b-2 transition-colors ${activeTab === 'membership' ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                >
                    <Crown size={16}/> Membresía
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 pb-3 text-sm font-bold flex justify-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-amber-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                >
                    <History size={16}/> Historial
                </button>
            </div>

            {loadingDetails ? (
                <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-zinc-500"/></div>
            ) : (
                <>
                    {/* TAB 1: PERFIL */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            
                            <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
                                <span className="text-xs text-zinc-500 font-bold uppercase ml-2">Datos Personales</span>
                                {isEditingProfile ? (
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsEditingProfile(false)} className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title="Cancelar">
                                            <X size={14} />
                                        </button>
                                        <button onClick={handleSaveProfile} disabled={submitting} className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors" title="Guardar">
                                            <Check size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors">
                                        <Edit2 size={12} /> Editar
                                    </button>
                                )}
                            </div>

                            {isEditingProfile ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-zinc-500 font-bold block mb-1">Nombre</label>
                                            <input className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm"
                                            value={profileFormData.first_name} onChange={e => setProfileFormData({...profileFormData, first_name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-zinc-500 font-bold block mb-1">Apellido</label>
                                            <input className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm"
                                            value={profileFormData.last_name} onChange={e => setProfileFormData({...profileFormData, last_name: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 font-bold block mb-1">Email</label>
                                        <input className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm"
                                        value={profileFormData.email} onChange={e => setProfileFormData({...profileFormData, email: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 font-bold block mb-1">Teléfono</label>
                                        <input className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm"
                                        value={profileFormData.phone} onChange={e => setProfileFormData({...profileFormData, phone: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 font-bold block mb-1">Dirección</label>
                                        <input className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm"
                                        value={profileFormData.address} onChange={e => setProfileFormData({...profileFormData, address: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 font-bold block mb-1">Cumpleaños</label>
                                        <input type="date" className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm"
                                        value={profileFormData.birth_date ? profileFormData.birth_date.split('T')[0] : ''} onChange={e => setProfileFormData({...profileFormData, birth_date: e.target.value})} />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <a href={`mailto:${selectedClient.email}`} className={`flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors ${selectedClient.email ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}`}>
                                            <Mail size={16} /> {selectedClient.email || 'Sin Email'}
                                        </a>
                                        <a href={`https://wa.me/${selectedClient.phone?.replace('+', '')}`} target="_blank" rel="noreferrer" className={`flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors ${selectedClient.phone ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-900' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}`}>
                                            <Phone size={16} /> {selectedClient.phone || 'Sin WhatsApp'}
                                        </a>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-zinc-400 bg-zinc-900 p-3 rounded border border-zinc-800">
                                            <MapPin size={16} className="text-zinc-500"/>
                                            <span>{selectedClient.address || 'Dirección no registrada'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-zinc-400 bg-zinc-900 p-3 rounded border border-zinc-800">
                                            <Calendar size={16} className="text-zinc-500"/>
                                            <span>Cumpleaños: {selectedClient.birth_date ? new Date(selectedClient.birth_date).toLocaleDateString() : 'No registrado'}</span>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 mt-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                                <FileText size={14}/> Notas Privadas
                                            </label>
                                            <button onClick={handleUpdateNotes} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded flex items-center gap-1 border border-zinc-700">
                                                <Save size={10} /> GUARDAR
                                            </button>
                                        </div>
                                        <textarea 
                                            className="w-full bg-transparent text-zinc-300 text-sm focus:outline-none min-h-[100px] resize-none placeholder-zinc-700"
                                            placeholder="Escribe notas sobre el alumno..."
                                            value={selectedClient.notes || ''}
                                            onChange={(e) => setSelectedClient({...selectedClient, notes: e.target.value})}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* TAB 2: MEMBRESÍA (MULTI-PLAN) */}
                    {activeTab === 'membership' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            
                            {/* --- INLINE ASSIGN FORM --- */}
                            {isAssigningPlan ? (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-in zoom-in-95 duration-200">
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <Crown size={20} className="text-indigo-500"/> Asignar Nueva Membresía
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Seleccionar Plan</label>
                                            <select 
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500 appearance-none transition-colors"
                                                value={selectedPlanIdToAssign}
                                                onChange={(e) => setSelectedPlanIdToAssign(e.target.value)}
                                            >
                                                <option value="">-- Elige un plan --</option>
                                                {availablePlans.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} ({p.duration_days} días) - ${p.price}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button 
                                                onClick={() => { setIsAssigningPlan(false); setSelectedPlanIdToAssign('') }}
                                                className="flex-1 py-3 rounded-lg border border-zinc-700 text-zinc-400 font-bold hover:bg-zinc-800 hover:text-white transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={handleAssignPlan}
                                                disabled={submitting || !selectedPlanIdToAssign}
                                                className="flex-1 py-3 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {submitting ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
                                                Confirmar Asignación
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {activeMemberships.length > 0 ? (
                                        <div className="space-y-4">
                                            {activeMemberships.map((membership, index) => {
                                                const { remaining, percent } = getDaysProgress(membership.start_date, membership.end_date)
                                                return (
                                                    <div key={membership.id} className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                            <Crown size={80} className="text-emerald-500 -rotate-12"/>
                                                        </div>
                                                        
                                                        <div className="relative z-10">
                                                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">
                                                                Plan Activo #{index + 1}
                                                            </p>
                                                            <h3 className="text-xl font-bold text-white mb-2">{membership.plan?.name}</h3>
                                                            
                                                            {/* Servicio cubierto */}
                                                            {membership.plan?.service && (
                                                                <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-400 mb-4">
                                                                    <CheckCircle2 size={12}/> Cubre: {membership.plan.service.name}
                                                                </div>
                                                            )}
                                                            
                                                            <div className="flex gap-4 mb-4">
                                                                <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800 flex-1">
                                                                    <p className="text-[10px] text-zinc-500 uppercase">Vence</p>
                                                                    <p className="text-white font-mono font-bold text-sm">
                                                                        {format(new Date(membership.end_date), "d MMM yy", { locale: es })}
                                                                    </p>
                                                                </div>
                                                                <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800 flex-1">
                                                                    <p className="text-[10px] text-zinc-500 uppercase">Restante</p>
                                                                    <p className={`font-mono font-bold text-sm ${remaining < 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                                        {remaining} días
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="bg-emerald-500 h-full transition-all duration-1000 ease-out" 
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-right text-zinc-500 mt-1">
                                                                Acceso ilimitado a clases de {membership.plan?.service?.name || 'este servicio'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            
                                            <button 
                                                onClick={() => setIsAssigningPlan(true)}
                                                className="w-full py-3 border border-dashed border-zinc-700 rounded-lg text-zinc-500 text-xs font-bold uppercase hover:bg-zinc-900 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus size={14}/> Agregar otro Plan
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 border border-zinc-800 border-dashed rounded-xl bg-zinc-950/50 flex flex-col items-center justify-center">
                                            <div className="h-16 w-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-4 border border-indigo-500/30">
                                                <Crown className="h-8 w-8 text-indigo-400"/>
                                            </div>
                                            <h3 className="text-white font-bold text-lg mb-1">Membresía Inactiva</h3>
                                            <p className="text-zinc-500 text-sm mb-6 max-w-[250px]">Este cliente no tiene ningún plan activo. ¡Ofrécele un plan para que comience a entrenar!</p>
                                            
                                            <button 
                                            onClick={() => setIsAssigningPlan(true)}
                                            className="group bg-white text-zinc-950 hover:bg-indigo-50 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-white/5"
                                            >
                                                Asignar Membresía Ahora <ArrowRight size={16} className="text-zinc-400 group-hover:text-indigo-600 transition-colors"/>
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* TAB 3: HISTORIAL */}
                    {activeTab === 'history' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {history.length === 0 ? (
                                <div className="text-center py-10 text-zinc-500 italic">Sin movimientos recientes.</div>
                            ) : (
                                <div className="space-y-2">
                                    {history.map(tx => (
                                        <div key={tx.id} className="flex justify-between items-center p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-zinc-950 p-2 rounded text-zinc-500">
                                                    <CreditCard size={16}/>
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm font-medium">{tx.concept}</p>
                                                    <p className="text-xs text-zinc-500">
                                                        {format(new Date(tx.created_at), "d MMM, HH:mm", { locale: es })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-emerald-400 font-bold font-mono text-sm">
                                                +${tx.amount}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </Drawer>
      )}

      {/* DRAWER CREAR */}
      <Drawer isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nuevo Cliente">
        <form onSubmit={handleCreateClient} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase">Nombre</label>
                <input required className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white focus:outline-none focus:border-indigo-500"
                 value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
            </div>
            <div>
                <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase">Apellido</label>
                <input required className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white focus:outline-none focus:border-indigo-500"
                 value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase">Email</label>
            <input type="email" className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white focus:outline-none focus:border-indigo-500"
             value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase">Teléfono</label>
            <input type="tel" className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white focus:outline-none focus:border-indigo-500"
             value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          
          <button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded transition-colors disabled:opacity-50">
            {submitting ? 'Guardando...' : 'Crear Cliente'}
          </button>
        </form>
      </Drawer>
    </>
  )
}
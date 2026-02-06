import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Plus, Search, Mail, Phone, Calendar, 
  FileText, MapPin, User, Save, CreditCard, CheckCircle2, AlertTriangle, 
  Crown, History, Loader2
} from 'lucide-react'
import { Drawer } from '../components/Drawer'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import { format, differenceInDays } from 'date-fns'
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

export default function ClientsPage() {
  const { profile, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  const navigate = useNavigate()
  
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

  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', notes: ''
  })

  // 🟢 EFECTO OPTIMIZADO: Depende de primitivos, no del objeto profile
  useEffect(() => {
    if (!authLoading && orgId) {
        loadClients()
    } else if (!authLoading && !profile) {
        setErrorMsg("No se pudo cargar el perfil.")
        setLoading(false)
    }
  }, [orgId, branchId, userRole, authLoading]) // Dependencias estables

  const loadClients = async () => {
    setLoading(true)
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
        const [
            { data: memData },
            { data: histData }
        ] = await Promise.all([
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
                .limit(10)
        ])
        
        setActiveMemberships(memData as any || [])
        setHistory(histData || [])

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

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Clientes</h1>
            <p className="text-zinc-400 mt-1">Gestión de alumnos y perfiles</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            disabled={!!errorMsg}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Plus className="h-5 w-5" /> <span>Nuevo Cliente</span>
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
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <input
                    type="text" placeholder="Buscar por nombre..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="input w-full pl-12 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                  />
                </div>

                {clients.length === 0 ? (
                    <div className="text-center py-20 border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/30 backdrop-blur-sm">
                        <User className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-500 font-medium">No hay clientes registrados</p>
                        <p className="text-zinc-600 text-sm mt-2">Comienza agregando tu primer cliente</p>
                    </div>
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
                            
                            {/* Contact Info Preview */}
                            {(client.email || client.phone) && (
                                <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2 text-xs text-zinc-500">
                                    {client.phone && <Phone size={12} />}
                                    {client.email && <Mail size={12} />}
                                    <span className="truncate">{client.email || client.phone}</span>
                                </div>
                            )}
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
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded text-xs font-bold uppercase border ${getStatusColor(selectedClient.status_label)}`}>
                        {selectedClient.status_label === 'solvente' ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>}
                        {selectedClient.status_label}
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
                            <div className="grid grid-cols-2 gap-3">
                                <a href={`mailto:${selectedClient.email}`} className={`flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors ${selectedClient.email ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}`}>
                                    <Mail size={16} /> Email
                                </a>
                                <a href={`https://wa.me/${selectedClient.phone?.replace('+', '')}`} target="_blank" rel="noreferrer" className={`flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors ${selectedClient.phone ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-900' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}`}>
                                    <Phone size={16} /> WhatsApp
                                </a>
                            </div>

                            <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
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

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-3 text-sm text-zinc-400 bg-zinc-900 p-3 rounded border border-zinc-800">
                                    <MapPin size={16} className="text-zinc-500"/>
                                    <span>{selectedClient.address || 'Dirección no registrada'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-400 bg-zinc-900 p-3 rounded border border-zinc-800">
                                    <Calendar size={16} className="text-zinc-500"/>
                                    <span>Cumpleaños: {selectedClient.birth_date ? new Date(selectedClient.birth_date).toLocaleDateString() : 'No registrado'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: MEMBRESÍA (MULTI-PLAN) */}
                    {activeTab === 'membership' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            
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
                                        onClick={() => navigate('/finance')}
                                        className="w-full py-3 border border-dashed border-zinc-700 rounded-lg text-zinc-500 text-xs font-bold uppercase hover:bg-zinc-900 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14}/> Agregar otro Plan
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-10 border border-zinc-800 border-dashed rounded-xl bg-zinc-900/50">
                                    <Crown className="mx-auto h-12 w-12 text-zinc-700 mb-2"/>
                                    <p className="text-zinc-500 mb-4">El cliente no tiene planes activos.</p>
                                    <button 
                                      onClick={() => navigate('/finance')}
                                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md transition-colors"
                                    >
                                        Ir a Tesorería para Vender Plan
                                    </button>
                                </div>
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
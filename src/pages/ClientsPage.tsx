import React, { useEffect, useState } from 'react'
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
  plan: { name: string; duration_days: number; class_limit: number | null }
  start_date: string
  end_date: string
  status: string
  classes_used: number
}

type Payment = {
  id: string
  amount: number
  created_at: string
  concept: string
}

export function ClientsPage() {
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
        const { data: memData } = await supabase
            .from('memberships')
            .select(`
                id, start_date, end_date, status, classes_used,
                plan:plans (name, duration_days, class_limit)
            `)
            .eq('student_id', client.id)
            .eq('status', 'active')
            .order('end_date', { ascending: true }) 
        
        setActiveMemberships(memData as any || [])

        const { data: histData } = await supabase
            .from('transactions')
            .select('*')
            .eq('student_id', client.id)
            .order('created_at', { ascending: false })
            .limit(10)
        
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

  const filteredClients = clients.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
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
             <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Cargando cartera...</p>
             </div>
        ) : errorMsg ? (
            <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-red-400">{errorMsg}</div>
        ) : (
            <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="text" placeholder="Buscar cliente..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-zinc-700"
                  />
                </div>

                {clients.length === 0 ? (
                    <div className="text-center py-12 border border-zinc-800 border-dashed rounded-lg text-zinc-500">No hay clientes.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.map((client) => (
                        <div key={client.id} onClick={() => handleClientClick(client)}
                        className="group bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 cursor-pointer transition-all hover:bg-zinc-800/50">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold border border-zinc-700 group-hover:bg-zinc-700 group-hover:text-white transition-colors">
                                        {client.first_name[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium group-hover:text-indigo-400 transition-colors">
                                            {client.first_name} {client.last_name}
                                        </h3>
                                        <p className="text-xs text-zinc-500">Ver perfil</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${getStatusColor(client.status_label)}`}>
                                    {client.status_label.replace('_', ' ')}
                                </span>
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
                                                    <h3 className="text-xl font-bold text-white mb-4">{membership.plan?.name}</h3>
                                                    
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
                                                        {membership.plan?.class_limit 
                                                            ? `${membership.classes_used} / ${membership.plan.class_limit} clases`
                                                            : 'Ilimitado'}
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
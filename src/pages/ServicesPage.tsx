import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Plus, Search, Tag, Package, CalendarRange, 
  MoreVertical, DollarSign, Archive, Trash2,
  CreditCard, CalendarDays, Loader2, CheckCircle2 
} from 'lucide-react'
import { Drawer } from '../components/Drawer'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

// --- 1. DEFINICIÓN DE TIPOS ---
interface ServiceItem {
  id: string
  name: string
  description: string | null
  price: number
  is_active: boolean
  duration_days?: number
  class_limit?: number | null
  service_id?: string | null
  service?: { name: string } | null
  plan_services_access?: { service_id: string; services: { name: string } }[]
}

type ServiceOption = { id: string; name: string }

export default function ServicesPage() {
  const { profile, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  
  // 🟢 OPTIMIZACIÓN: Extraer ID para evitar recargas
  const orgId = (profile as any)?.organization_id

  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState<'services' | 'plans'>('services')
  const [loading, setLoading] = useState(true)
  
  const [services, setServices] = useState<ServiceItem[]>([])
  const [plans, setPlans] = useState<ServiceItem[]>([])
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([])
  
  const [searchTerm, setSearchTerm] = useState('')
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null)
  
  // Usamos strings para los inputs numéricos (Mejor UX)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    duration_days: '30',
    class_limit: '',
    service_ids: [] as string[],
    recurring_enabled: false,
    recurring_days: [] as number[],
    recurring_time: '09:00',
    default_teacher_type: '' as '' | 'system' | 'professional',
    default_teacher_id: ''
  })
  
  // Estado para cargar lista de profesores
  const [availableTeachers, setAvailableTeachers] = useState<Array<{
    id: string
    full_name: string
    type: string
  }>>([])

  // --- CARGA DE DATOS OPTIMIZADA ---
  useEffect(() => {
    // Solo recarga si cambia el ID de la organización o la pestaña activa
    if (!authLoading && orgId) {
        loadCatalog()
    }
  }, [orgId, authLoading, activeTab]) 

  const loadCatalog = async () => {
    try {
      setLoading(true)
      if (!orgId) return

      if (activeTab === 'services') {
          const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('organization_id', orgId)
            .order('name', { ascending: true })
          if (error) throw error
          setServices(data || [])
      } else {
          // Cargar planes CON el servicio vinculado
          const [plansRes, servicesRes, teachersRes] = await Promise.all([
            supabase
              .from('plans')
              .select('*, plan_services_access (service_id, services (name))')
              .eq('organization_id', orgId)
              .order('name', { ascending: true }),
            supabase
              .from('services')
              .select('id, name')
              .eq('organization_id', orgId)
              .eq('is_active', true)
              .order('name', { ascending: true }),
            supabase
              .from('available_teachers_view')
              .select('id, full_name, type')
              .eq('organization_id', orgId)
          ])
          if (plansRes.error) throw plansRes.error
          setPlans(plansRes.data || [])
          setAvailableServices(servicesRes.data || [])
          setAvailableTeachers(teachersRes.data || [])
      }
    } catch (err) {
      console.error(err)
      showToast('Error cargando el catálogo', 'error')
    } finally {
      setLoading(false)
    }
  }

  // --- HANDLERS ---

  const handleOpenCreate = () => {
    setSelectedItem(null)
    setFormData({ 
        name: '', 
        price: '', 
        description: '', 
        duration_days: '30', 
        class_limit: '',
        service_ids: [],
        recurring_enabled: false,
        recurring_days: [],
        recurring_time: '09:00',
        default_teacher_type: '' as '' | 'system' | 'professional',
        default_teacher_id: ''
    }) 
    setIsDrawerOpen(true)
  }

  const handleOpenEdit = (item: ServiceItem) => {
    setSelectedItem(item)
    // Extract service_ids from junction table or fallback to legacy field
    const linkedServiceIds = item.plan_services_access?.map(psa => psa.service_id) || (item.service_id ? [item.service_id] : [])
    setFormData({
        name: item.name,
        price: item.price.toString(),
        description: item.description || '',
        duration_days: item.duration_days ? item.duration_days.toString() : '30',
        class_limit: item.class_limit ? item.class_limit.toString() : '',
        service_ids: linkedServiceIds,
        recurring_enabled: (item as any).recurring_enabled || false,
        recurring_days: (item as any).recurring_days || [],
        recurring_time: (item as any).recurring_time || '09:00',
        default_teacher_type: (item as any).default_teacher_type || '',
        default_teacher_id: (item as any).default_teacher_id || ''
    })
    setIsDrawerOpen(true)
  }

  // GUARDAR
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const targetTable = activeTab === 'services' ? 'services' : 'plans'

    // Convertir strings a números seguros
    const priceNum = parseFloat(formData.price) || 0
    const durationNum = parseInt(formData.duration_days) || 30
    const limitNum = formData.class_limit ? parseInt(formData.class_limit) : null

    const basePayload = {
        name: formData.name,
        price: priceNum,
        ...(activeTab === 'services' && { description: formData.description || null }),
        ...(activeTab === 'services' && { type: 'service' }), 
    }

    const planPayload = activeTab === 'plans' ? {
      duration_days: durationNum,
      class_limit: limitNum,
      service_id: formData.service_ids.length === 1 ? formData.service_ids[0] : null, // legacy compat
      recurring_enabled: formData.recurring_enabled,
      recurring_days: formData.recurring_enabled ? formData.recurring_days : null,
      recurring_time: formData.recurring_enabled ? formData.recurring_time : null,
      default_teacher_type: formData.recurring_enabled && formData.default_teacher_id ? formData.default_teacher_type : null,
      default_teacher_id: formData.recurring_enabled && formData.default_teacher_id ? formData.default_teacher_id : null,
      ...basePayload 
  } : basePayload

  try {
    let savedPlanId: string | null = null
    if (selectedItem) {
      // UPDATE
        const { error } = await supabase
          .from(targetTable)
          .update(activeTab === 'plans' ? planPayload : basePayload)
          .eq('id', selectedItem.id)
      if (error) throw error
      savedPlanId = selectedItem.id
      showToast('Actualizado correctamente', 'success')
    } else {
      // CREATE
      const { data: inserted, error } = await supabase
          .from(targetTable)
          .insert({
              organization_id: orgId,
              is_active: true,
              ...(activeTab === 'plans' ? planPayload : basePayload)
          })
          .select('id')
          .single()
      if (error) throw error
      savedPlanId = inserted.id
      showToast('Creado exitosamente', 'success')
    }

    // Sync plan_services_access junction table
    if (activeTab === 'plans' && savedPlanId) {
      // Delete old links
      await supabase.from('plan_services_access').delete().eq('plan_id', savedPlanId)
      // Insert new links
      if (formData.service_ids.length > 0) {
        const rows = formData.service_ids.map(sid => ({ plan_id: savedPlanId!, service_id: sid }))
        const { error: junctionError } = await supabase.from('plan_services_access').insert(rows)
        if (junctionError) console.error('Error syncing plan_services_access:', junctionError)
      }
    }  

      setIsDrawerOpen(false)
      loadCatalog()

    } catch (error: any) {
      showToast(error.message || 'Error al guardar', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ELIMINAR / ARCHIVAR
  const handleToggleArchive = async () => {
    if (!selectedItem) return
    const targetTable = activeTab === 'services' ? 'services' : 'plans'
    
    try {
        const { error } = await supabase
            .from(targetTable)
            .update({ is_active: !selectedItem.is_active })
            .eq('id', selectedItem.id)
        
        if (error) throw error
        showToast(selectedItem.is_active ? 'Item archivado' : 'Item reactivado', 'success')
        setIsDrawerOpen(false)
        loadCatalog()
    } catch (err) {
        showToast('Error al cambiar estado', 'error')
    }
  }

  // --- KPIS DASHBOARD ---
  const kpiStats = useMemo(() => {
    const activeServices = services.filter(s => s.is_active).length
    const activePlans = plans.filter(s => s.is_active).length
    const archived = [...services, ...plans].filter(s => !s.is_active).length
    return { activeServices, activePlans, archived }
  }, [services, plans])

  const currentList = activeTab === 'services' ? services : plans
  const filteredList = currentList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        {activeTab === 'services' ? <Tag className="text-indigo-500"/> : <CreditCard className="text-emerald-500"/>}
                        Catálogo de {activeTab === 'services' ? 'Servicios' : 'Membresías'}
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        {activeTab === 'services' 
                            ? 'Clases sueltas o servicios para agendar en el calendario.' 
                            : 'Paquetes, mensualidades y planes recurrentes.'}
                    </p>
                </div>
                
                <button 
                    onClick={handleOpenCreate}
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded-md transition-colors shadow-lg shadow-indigo-500/20 ${
                        activeTab === 'services' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                    <Plus className="h-5 w-5" />
                    <span>Nuevo {activeTab === 'services' ? 'Servicio' : 'Plan'}</span>
                </button>
            </div>

            {/* KPI GRID */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Servicios Activos</p>
                            <p className="text-3xl font-bold text-white font-mono">{kpiStats.activeServices}</p>
                        </div>
                        <div className="h-12 w-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                            <Tag size={24} />
                        </div>
                        <div className="absolute -right-6 -bottom-6 h-24 w-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Planes Activos</p>
                            <p className="text-3xl font-bold text-white font-mono">{kpiStats.activePlans}</p>
                        </div>
                        <div className="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                            <CreditCard size={24} />
                        </div>
                        <div className="absolute -right-6 -bottom-6 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Items Archivados</p>
                            <p className="text-3xl font-bold text-white font-mono">{kpiStats.archived}</p>
                        </div>
                        <div className="h-12 w-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 border border-zinc-700 group-hover:bg-zinc-700 transition-colors">
                            <Archive size={24} />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB SWITCHER */}
            <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-full sm:w-fit self-start">
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        activeTab === 'services' ? 'bg-zinc-800 text-white shadow ring-1 ring-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Tag size={16}/> Servicios
                </button>
                <button
                    onClick={() => setActiveTab('plans')}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        activeTab === 'plans' ? 'bg-zinc-800 text-white shadow ring-1 ring-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <CreditCard size={16}/> Planes y Membresías
                </button>
            </div>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <input
            type="text"
            placeholder={`Buscar en ${activeTab === 'services' ? 'servicios' : 'planes'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
          />
        </div>

        {/* LOADING STATE */}
        {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 animate-in fade-in duration-300">
                <Loader2 className="h-10 w-10 animate-spin mb-3 text-indigo-500" />
                <p className="font-medium">Cargando catálogo...</p>
            </div>
        ) : (
            /* GRID DE TARJETAS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredList.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    icon={Package}
                    title={activeTab === 'services' ? '¡Crea tu primer servicio!' : '¡Crea tu primer plan!'}
                    description={activeTab === 'services' ? 'Agrega los tipos de clase que ofrece tu academia para poder agendarlas.' : 'Crea membresías y paquetes para que tus alumnos se inscriban fácilmente.'}
                    actionLabel={`Nuevo ${activeTab === 'services' ? 'Servicio' : 'Plan'}`}
                    onAction={handleOpenCreate}
                  />
                </div>
            ) : (
                filteredList.map((item, index) => (
                    <div 
                        key={item.id} 
                        onClick={() => handleOpenEdit(item)}
                        className={`
                            relative p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 cursor-pointer group card-hover animate-in slide-in-from-bottom duration-500 hover:shadow-xl
                            ${!item.is_active 
                                ? 'bg-zinc-950/50 border-zinc-800 opacity-60' 
                                : activeTab === 'services'
                                    ? 'bg-zinc-900 border-zinc-800 hover:border-indigo-500/40 hover:shadow-indigo-500/10'
                                    : 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/40 hover:shadow-emerald-500/10'
                            }
                        `}
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border flex items-center gap-1 w-fit tracking-wider ${
                                    activeTab === 'services' 
                                    ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' 
                                    : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                                }`}>
                                    {activeTab === 'services' ? <Tag size={12}/> : <CalendarRange size={12}/>} 
                                    {activeTab === 'services' ? 'Servicio' : 'Plan'}
                                </span>
                                
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white">
                                    <MoreVertical size={16} />
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-zinc-200 transition-colors">
                                {item.name}
                            </h3>

                            {/* PRICE HERO */}
                            <div className="mb-4">
                                <span className="text-zinc-500 text-lg align-top">$</span>
                                <span className={`text-4xl font-mono font-bold tracking-tight ${
                                    activeTab === 'services' ? 'text-white' : 'text-emerald-400'
                                }`}>
                                    {item.price}
                                </span>
                            </div>
                            
                            {activeTab === 'services' ? (
                                item.description ? (
                                    <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">
                                        {item.description}
                                    </p>
                                ) : <p className="text-sm text-zinc-600 italic">Sin descripción.</p>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
                                            <CalendarDays size={12} className="text-zinc-500"/>
                                            <span className="text-zinc-200 font-medium">{item.duration_days} Días</span>
                                        </span>
                                        
                                        {(item as any).recurring_enabled && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
                                                <CheckCircle2 size={12}/>
                                                <span className="font-bold">Recurrente</span>
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="pt-3 border-t border-zinc-800/50">
                                        <p className="text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wider">Incluye acceso a:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {item.plan_services_access && item.plan_services_access.length > 0
                                                ? item.plan_services_access.map((psa, i) => (
                                                    <span key={i} className="text-[11px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                                                        {psa.services?.name}
                                                    </span>
                                                ))
                                                : <span className="text-[11px] text-zinc-500 italic">{item.service?.name || 'Todo el catálogo'}</span>
                                            }
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
 
                        {/* FOOTER ACTIONS */}
                        <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between">
                             {!item.is_active ? (
                                <span className="text-xs text-red-500 flex items-center gap-1 font-bold border border-red-900/50 bg-red-900/20 px-2 py-1 rounded">
                                    <Archive size={12}/> ARCHIVADO
                                </span>
                            ) : (
                                <span className="text-xs text-zinc-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Click para editar
                                </span>
                            )}
                            
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 ${
                                activeTab === 'services' 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                            }`}>
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                    </div>
                ))
            )}
            </div>
        )}

        {/* FORMULARIO DRAWER DINÁMICO */}
        <Drawer 
            isOpen={isDrawerOpen} 
            onClose={() => setIsDrawerOpen(false)} 
            title={selectedItem ? "Editar Item" : `Nuevo ${activeTab === 'services' ? 'Servicio' : 'Plan'}`} 
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Nombre</label>
                    <input required type="text" placeholder={activeTab === 'services' ? "Ej. Clase de Baile" : "Ej. Plan Mensual Oro"}
                        className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Precio</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
                        <input 
                            required 
                            type="text" // 🟢 CAMBIO: Input text
                            inputMode="decimal"
                            placeholder="0.00"
                            className="w-full h-11 pl-10 pr-4 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                            value={formData.price} 
                            onChange={e => setFormData({...formData, price: e.target.value.replace(/[^0-9.]/g, '')})} 
                        />
                    </div>
                </div>

                {/* CAMPOS ESPECÍFICOS: SERVICIOS */}
                {activeTab === 'services' && (
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Descripción</label>
                        <textarea placeholder="Detalles del servicio para uso interno..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md p-3 text-white h-24 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                            value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                        />
                    </div>
                )}

                {/* CAMPOS ESPECÍFICOS: PLANES */}
                {activeTab === 'plans' && (
                    <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-800 space-y-4">
                        <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Configuración de Membresía</h4>
                        
                            {/* SERVICIOS VINCULADOS (MULTI-SELECT GRID) */}
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-2">
                                    ¿Qué servicios incluye este plan? <span className="text-red-400">*</span>
                                </label>
                                
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                  {availableServices.map(s => {
                                    const isChecked = formData.service_ids.includes(s.id)
                                    return (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => {
                                          const newIds = isChecked
                                            ? formData.service_ids.filter(id => id !== s.id)
                                            : [...formData.service_ids, s.id]
                                          setFormData({...formData, service_ids: newIds})
                                        }}
                                        className={`relative flex items-center gap-3 p-3 text-left transition-all border rounded-lg group ${
                                          isChecked 
                                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_10px_-3px_rgba(16,185,129,0.3)]' 
                                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
                                        }`}
                                      >
                                        <div className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                            isChecked 
                                            ? 'bg-emerald-500 border-emerald-500' 
                                            : 'border-zinc-600 group-hover:border-zinc-500'
                                        }`}>
                                          {isChecked && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                        <span className={`text-sm font-medium ${isChecked ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                            {s.name}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>

                                {availableServices.length === 0 && (
                                    <div className="text-center py-4 border border-zinc-800 rounded-lg bg-zinc-900/50 border-dashed">
                                        <p className="text-xs text-zinc-500">No hay servicios activos para seleccionar.</p>
                                    </div>
                                )}
                                
                                <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
                                    <CheckCircle2 size={10} className="text-emerald-500"/>
                                    El alumno tendrá acceso ilimitado a los servicios seleccionados.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Duración (Días)</label>
                                <input 
                                    required 
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="30"
                                    className="w-full h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                    value={formData.duration_days} 
                                    onChange={e => setFormData({...formData, duration_days: e.target.value.replace(/[^0-9]/g, '')})} 
                                />
                            </div>

                        {/* CONFIGURACIÓN DE CLASES RECURRENTES */}
                        <div className="border-t border-zinc-700 pt-4 mt-4">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                    <CalendarDays size={14}/> Clases Recurrentes Automáticas
                                </label>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, recurring_enabled: !formData.recurring_enabled})}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        formData.recurring_enabled ? 'bg-amber-500' : 'bg-zinc-700'
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        formData.recurring_enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}/>
                                </button>
                            </div>

                            {formData.recurring_enabled && (
                                <div className="space-y-4 bg-zinc-900/80 p-4 rounded-lg border border-zinc-700 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {/* Días de la semana */}
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-2">
                                            Días de las clases <span className="text-red-400">*</span>
                                        </label>
                                        <div className="grid grid-cols-7 gap-2">
                                            {[
                                                { num: 1, name: 'L' }, 
                                                { num: 2, name: 'M' }, 
                                                { num: 3, name: 'X' }, 
                                                { num: 4, name: 'J' }, 
                                                { num: 5, name: 'V' }, 
                                                { num: 6, name: 'S' }, 
                                                { num: 0, name: 'D' }
                                            ].map(day => (
                                                <button
                                                    key={day.num}
                                                    type="button"
                                                    onClick={() => {
                                                        const days = formData.recurring_days.includes(day.num)
                                                            ? formData.recurring_days.filter(d => d !== day.num)
                                                            : [...formData.recurring_days, day.num].sort()
                                                        setFormData({...formData, recurring_days: days})
                                                    }}
                                                    className={`h-9 rounded-lg font-bold text-xs transition-all ${
                                                        formData.recurring_days.includes(day.num)
                                                            ? 'bg-amber-500 text-zinc-900 shadow-lg shadow-amber-500/20 scale-105'
                                                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                                                    }`}
                                                >
                                                    {day.name}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 mt-2">
                                            Selecciona los días en que se generarán clases automáticamente.
                                        </p>
                                    </div>

                                    {/* Hora por defecto */}
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                                            Hora de la clase
                                        </label>
                                        <input 
                                            type="time"
                                            className="w-full h-10 px-3 bg-zinc-950 border border-zinc-700 rounded-md text-white focus:outline-none focus:border-amber-500"
                                            value={formData.recurring_time} 
                                            onChange={e => setFormData({...formData, recurring_time: e.target.value})} 
                                        />
                                    </div>

                                    {/* Profesor por defecto (opcional) */}
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                                            Profesor asignado (opcional)
                                        </label>
                                        <select 
                                            className="w-full h-10 px-3 bg-zinc-950 border border-zinc-700 rounded-md text-white focus:outline-none focus:border-amber-500 appearance-none"
                                            value={formData.default_teacher_id} 
                                            onChange={e => {
                                                const teacherId = e.target.value
                                                const teacher = availableTeachers.find(t => t.id === teacherId)
                                                setFormData({
                                                    ...formData, 
                                                    default_teacher_id: teacherId,
                                                    default_teacher_type: teacher ? (teacher.type as 'system' | 'professional') : ''
                                                })
                                            }}
                                        >
                                            <option value="">Sin asignar</option>
                                            {availableTeachers.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.full_name} {t.type === 'professional' ? '(Externo)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex gap-2">
                                        <CalendarRange size={16} className="text-amber-500 shrink-0"/>
                                        <p className="text-[11px] text-amber-400/80 leading-relaxed">
                                            Esta función generará citas en la agenda automáticamente. Úsala solo si el plan implica un horario fijo para el grupo.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!formData.recurring_enabled && (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                                <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                                    💡 Al suscribir un alumno a este plan, tendrá acceso ilimitado a todas las clases de los servicios incluidos durante la duración del plan. No se requiere agendar cada clase manualmente.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* BOTONES DE ACCIÓN */}
                <div className="flex gap-3 pt-4 border-t border-zinc-800 mt-8">
                    {selectedItem && (
                         <button 
                            type="button" 
                            onClick={handleToggleArchive} 
                            className={`px-4 py-3 rounded-md text-white transition-colors ${selectedItem.is_active ? 'bg-red-900/50 hover:bg-red-900 text-red-200' : 'bg-emerald-900/50 hover:bg-emerald-900 text-emerald-200'}`}
                            title={selectedItem.is_active ? "Archivar" : "Reactivar"}
                        >
                            {selectedItem.is_active ? <Trash2 size={20}/> : <Archive size={20}/>}
                        </button>
                    )}

                    <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-4 py-3 bg-zinc-800 text-white rounded-md hover:bg-zinc-700">
                        Cancelar
                    </button>
                    
                    <button type="submit" disabled={isSubmitting} className={`flex-1 px-4 py-3 text-white rounded-md disabled:opacity-50 flex items-center justify-center gap-2 ${
                        activeTab === 'services' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}>
                        {isSubmitting ? 'Guardando...' : (selectedItem ? 'Guardar Cambios' : 'Crear Item')}
                    </button>
                </div>
            </form>
        </Drawer>
      </div>
    </>
  )
}
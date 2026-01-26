import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Plus, Search, Tag, Package, CalendarRange, 
  MoreVertical, DollarSign, Archive, Trash2,
  CreditCard, CalendarDays, Check, Loader2 
} from 'lucide-react'
import { Drawer } from '../components/Drawer'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

// --- 1. DEFINICIÓN DE TIPOS ---
type ServiceItem = {
  id: string
  name: string
  description: string | null
  price: number
  is_active: boolean
  duration_days?: number
  class_limit?: number | null
}

export function ServicesPage() {
  const { profile, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  
  // 🟢 OPTIMIZACIÓN: Extraer ID para evitar recargas
  const orgId = (profile as any)?.organization_id

  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState<'services' | 'plans'>('services')
  const [loading, setLoading] = useState(true)
  
  const [services, setServices] = useState<ServiceItem[]>([])
  const [plans, setPlans] = useState<ServiceItem[]>([])
  
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
    class_limit: '' 
  })

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
          const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('organization_id', orgId)
            .order('name', { ascending: true })
          if (error) throw error
          setPlans(data || [])
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
        class_limit: '' 
    }) 
    setIsDrawerOpen(true)
  }

  const handleOpenEdit = (item: ServiceItem) => {
    setSelectedItem(item)
    setFormData({
        name: item.name,
        price: item.price.toString(),
        description: item.description || '',
        duration_days: item.duration_days ? item.duration_days.toString() : '30',
        class_limit: item.class_limit ? item.class_limit.toString() : ''
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
        ...basePayload 
    } : basePayload

    try {
      if (selectedItem) {
        // UPDATE
        const { error } = await supabase
            .from(targetTable)
            .update(activeTab === 'plans' ? planPayload : basePayload)
            .eq('id', selectedItem.id)
        if (error) throw error
        showToast('Actualizado correctamente', 'success')
      } else {
        // CREATE
        const { error } = await supabase
            .from(targetTable)
            .insert({
                organization_id: orgId,
                is_active: true,
                ...(activeTab === 'plans' ? planPayload : basePayload)
            })
        if (error) throw error
        showToast('Creado exitosamente', 'success')
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
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded-md transition-colors ${
                        activeTab === 'services' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                    <Plus className="h-5 w-5" />
                    <span>Nuevo {activeTab === 'services' ? 'Servicio' : 'Plan'}</span>
                </button>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-full sm:w-fit">
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        activeTab === 'services' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Tag size={16}/> Servicios
                </button>
                <button
                    onClick={() => setActiveTab('plans')}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        activeTab === 'plans' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
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
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Cargando catálogo...</p>
            </div>
        ) : (
            /* GRID DE TARJETAS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.length === 0 ? (
                <div className="col-span-full text-center py-12 border border-zinc-800 border-dashed rounded-lg bg-zinc-900/30">
                    <Package className="mx-auto h-10 w-10 text-zinc-600 mb-2"/>
                    <p className="text-zinc-500">No hay items registrados en esta categoría.</p>
                </div>
            ) : (
                filteredList.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => handleOpenEdit(item)}
                        className={`
                            relative p-5 rounded-lg border flex flex-col justify-between transition-all cursor-pointer group
                            ${!item.is_active ? 'bg-zinc-950/50 border-zinc-800 opacity-60' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50'}
                        `}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border flex items-center gap-1 w-fit ${
                                    activeTab === 'services' 
                                    ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' 
                                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                }`}>
                                    {activeTab === 'services' ? <Tag size={12}/> : <CalendarRange size={12}/>} 
                                    {activeTab === 'services' ? 'Servicio' : 'Plan'}
                                </span>
                                <MoreVertical size={16} className="text-zinc-600 group-hover:text-white transition-colors"/>
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                                {item.name}
                            </h3>
                            
                            {activeTab === 'services' ? (
                                <p className="text-sm text-zinc-500 line-clamp-2 h-10">
                                    {item.description || 'Sin descripción'}
                                </p>
                            ) : (
                                <div className="mt-2 space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                                        <CalendarDays size={12}/> 
                                        <span>Duración: <strong className="text-zinc-300">{item.duration_days} días</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                                        <Check size={12}/> 
                                        <span>
                                            {item.class_limit ? `Límite: ${item.class_limit} clases` : 'Clases Ilimitadas'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                            <div className="text-2xl font-bold text-white flex items-center">
                                <span className="text-zinc-500 text-base font-normal mr-1">$</span>
                                {item.price}
                            </div>
                            {!item.is_active && (
                                <span className="text-xs text-red-500 flex items-center gap-1 font-bold border border-red-900/50 bg-red-900/20 px-2 py-1 rounded">
                                    <Archive size={12}/> ARCHIVADO
                                </span>
                            )}
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Duración (Días)</label>
                                <input 
                                    required 
                                    type="text" // 🟢 CAMBIO: Input text
                                    inputMode="numeric"
                                    placeholder="30"
                                    className="w-full h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:border-emerald-500"
                                    value={formData.duration_days} 
                                    onChange={e => setFormData({...formData, duration_days: e.target.value.replace(/[^0-9]/g, '')})} 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Límite Clases</label>
                                <input 
                                    type="text" // 🟢 CAMBIO: Input text
                                    inputMode="numeric"
                                    placeholder="Vacio = Ilimitado"
                                    className="w-full h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:border-emerald-500"
                                    value={formData.class_limit} 
                                    onChange={e => setFormData({...formData, class_limit: e.target.value.replace(/[^0-9]/g, '')})} 
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                            * El límite de clases controla cuántas veces puede agendar el alumno durante la duración del plan.
                        </p>
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
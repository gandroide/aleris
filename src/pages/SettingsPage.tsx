import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Building2, User, Mail, Shield, CreditCard, Lock, Save, Loader2, Globe } from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

export default function SettingsPage() {
  const { profile } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  
  // 1. EXTRACCIÓN DE PRIMITIVOS (La clave para la optimización)
  // Al sacar estos strings aquí, React no se confunde con el objeto entero.
  const userRole = profile?.role
  const orgId = (profile as any)?.organization_id
  const isOwner = userRole === 'owner'

  // ESTADOS
  const [loadingOrg, setLoadingOrg] = useState(false)
  const [saving, setSaving] = useState(false)
  const [orgData, setOrgData] = useState({ name: '' })

  // 2. CARGA DE DATOS OPTIMIZADA
  // Solo se dispara si 'orgId' (texto) cambia. Ignora el resto del objeto profile.
  useEffect(() => {
    if (isOwner && orgId) {
        fetchOrgData()
    }
  }, [orgId, isOwner]) 

  const fetchOrgData = async () => {
    setLoadingOrg(true)
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', orgId)
            .single()
        
        if (error) throw error
        if (data) setOrgData({ name: data.name })

    } catch (err) {
        console.error(err)
        // No mostramos toast de error aquí para no ser invasivos al cargar
    } finally {
        setLoadingOrg(false)
    }
  }

  // 3. GUARDAR CAMBIOS (Nuevo)
  const handleSaveOrg = async () => {
    if (!orgId) return
    setSaving(true)
    try {
        const { error } = await supabase
            .from('organizations')
            .update({ name: orgData.name })
            .eq('id', orgId)

        if (error) throw error
        showToast('Información del negocio actualizada', 'success')
    } catch (err) {
        showToast('Error al guardar cambios', 'error')
    } finally {
        setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-zinc-400 mt-1">
            {isOwner ? 'Gestiona tu cuenta y los datos de tu negocio' : 'Administra tu perfil personal'}
        </p>
      </div>

      {/* --- ZONA COMÚN (PARA TODOS) --- */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <User className="text-indigo-500" size={20} />
            Mi Perfil
          </h3>
          <span className={`text-xs font-bold px-2 py-1 rounded border uppercase 
            ${isOwner ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'}`}>
            {userRole === 'professional' ? 'Agenda' : userRole}
          </span>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre</label>
            <div className="w-full p-3 bg-black border border-zinc-700 rounded text-zinc-300">
              {profile?.full_name || 'Sin nombre'}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <div className="w-full p-3 bg-black border border-zinc-700 rounded text-zinc-300 flex items-center gap-2">
              <Mail size={16} className="text-zinc-500" />
              {profile?.email}
            </div>
          </div>
          
          <div className="md:col-span-2 pt-2 border-t border-zinc-800/50 mt-2">
            <button className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                <Lock size={16} /> Cambiar contraseña
            </button>
          </div>
        </div>
      </div>

      {/* --- ZONA EXCLUSIVA DUEÑOS --- */}
      {isOwner && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 text-amber-500 mt-8 mb-4">
                <Shield size={20} />
                <h2 className="text-lg font-bold">Zona Administrativa</h2>
            </div>

            {/* 2. DATOS DEL NEGOCIO (AHORA EDITABLES Y REALES) */}
            <div className="bg-zinc-900 border border-amber-500/30 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 bg-amber-500/5 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Building2 className="text-amber-500" size={20} />
                        Configuración del Negocio
                    </h3>
                    {loadingOrg && <Loader2 className="animate-spin text-amber-500" size={18}/>}
                </div>
                
                <div className="p-6 space-y-6">
                    <p className="text-sm text-zinc-400">
                        Estos datos aparecen en los recibos y en la cabecera de tu app.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Negocio</label>
                            <input 
                                type="text" 
                                value={orgData.name}
                                onChange={(e) => setOrgData({...orgData, name: e.target.value})}
                                placeholder="Ej: Academia de Baile..."
                                className="w-full p-3 bg-black border border-zinc-700 rounded text-white focus:border-amber-500 outline-none transition-colors" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Industria</label>
                            <div className="flex items-center w-full p-3 bg-zinc-950 border border-zinc-800 rounded text-zinc-500">
                                <Globe size={16} className="mr-2 opacity-50"/>
                                <span className="text-sm">Configuración de industria</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-zinc-800">
                        <button 
                            onClick={handleSaveOrg}
                            disabled={saving || loadingOrg}
                            className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. SUSCRIPCIÓN */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden opacity-75 grayscale hover:grayscale-0 transition-all">
                <div className="px-6 py-4 border-b border-zinc-800">
                    <h3 className="text-lg font-medium text-zinc-300 flex items-center gap-2">
                        <CreditCard className="text-zinc-500" size={20} />
                        Suscripción y Pagos
                    </h3>
                </div>
                <div className="p-6 flex justify-between items-center">
                    <div>
                        <p className="text-white font-bold">Plan PRO (Beta)</p>
                        <p className="text-zinc-500 text-sm mt-1">Próxima facturación: 01/03/2026</p>
                    </div>
                    <button className="text-xs border border-zinc-700 px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:border-zinc-500">
                        Gestionar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
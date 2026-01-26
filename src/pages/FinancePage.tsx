import React, { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  DollarSign, Wallet, TrendingUp, TrendingDown, Plus, CreditCard, Banknote, Landmark, 
  Loader2, Calculator, Package, CheckCircle2 
} from 'lucide-react'
import { Drawer } from '../components/Drawer'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

// --- INTERFACES ---
interface Transaction {
  id: string
  amount: number
  payment_method: 'cash' | 'card' | 'transfer'
  concept: string
  created_at: string
  students?: { first_name: string; last_name: string }
}

interface Student { id: string; first_name: string; last_name: string }

// 🟢 CAMBIO 1: Interfaz unificada para la nómina
interface PayrollItem {
  id: string // ID del empleado (puede ser profile o professional)
  full_name: string
  type: string // 'system' | 'professional'
  base_salary: number
  commission_rate: number
  private_classes_count: number
  total_sales: number
  commission_amount: number
  total_payable: number
}

interface Plan {
  id: string
  name: string
  price: number
  duration_days: number
}

export function FinancePage() {
  const { profile } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  
  // 🟢 OPTIMIZACIÓN: Extraemos el ID para usarlo como dependencia estable
  // Esto evita que la página recargue datos al cambiar de pestaña si el objeto 'profile' se regenera
  const orgId = (profile as any)?.organization_id

  // ESTADOS GENERALES
  const [activeTab, setActiveTab] = useState<'income' | 'payroll'>('income')
  const [loading, setLoading] = useState(false)
  const [currentDate] = useState(new Date())

  // ESTADOS DE DATOS
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeTotal, setIncomeTotal] = useState(0)
  const [payrollData, setPayrollData] = useState<PayrollItem[]>([])
  const [payrollTotal, setPayrollTotal] = useState(0)

  // ESTADOS DEL FORMULARIO
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [students, setStudents] = useState<Student[]>([])
  const [plans, setPlans] = useState<Plan[]>([]) 

  const [saleType, setSaleType] = useState<'custom' | 'plan'>('custom') 
  const [selectedPlanId, setSelectedPlanId] = useState('') 

  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_method: 'transfer' as 'cash' | 'card' | 'transfer',
    concept: '' 
  })

  // --- CARGA DE DATOS PRINCIPALES ---
  const loadFinanceData = useCallback(async () => {
    // Usamos la variable estable 'orgId' en lugar de 'profile'
    if (!orgId) return

    setLoading(true)
    try {
      const start = startOfMonth(currentDate).toISOString()
      const end = endOfMonth(currentDate).toISOString()

      // 1. TRANSACCIONES (Ingresos)
      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('*, students(first_name, last_name)')
        .eq('organization_id', orgId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (txError) throw txError
      const txData = txs as any as Transaction[]
      setTransactions(txData)
      setIncomeTotal(txData.reduce((sum, t) => sum + Number(t.amount), 0))

      // 2. NÓMINA (STAFF + PROFESIONALES)
      // 🟢 CAMBIO 2: Usamos la vista 'staff_details_view' para traer a todos
      const { data: allStaff } = await supabase
        .from('staff_details_view')
        .select('id, full_name, base_salary, commission_percentage, type') // type es importante
        .eq('organization_id', orgId)
      
      // Traemos las citas del mes (con precio)
      // Necesitamos profile_id Y professional_id para saber de quién fue la venta
      const { data: appts } = await supabase
        .from('appointments')
        .select('profile_id, professional_id, price_at_booking')
        .eq('organization_id', orgId)
        .eq('is_private_class', true) // Solo calculamos comisión sobre privadas (puedes quitar esto si aplica a todo)
        .gte('start_time', start)
        .lte('start_time', end)

      if (allStaff && appts) {
        let totalPayrollCalc = 0
        
        const payrollList: PayrollItem[] = allStaff.map(person => {
            // Filtrar las clases de ESTA persona
            const myClasses = appts.filter(a => {
                if (person.type === 'system') return a.profile_id === person.id
                return a.professional_id === person.id
            })

            const count = myClasses.length
            const totalSales = myClasses.reduce((sum, c) => sum + (c.price_at_booking || 0), 0)
            
            // Cálculo financiero
            const commissionAmt = totalSales * (person.commission_percentage || 0)
            const base = person.base_salary || 0
            const totalPay = base + commissionAmt
            
            totalPayrollCalc += totalPay

            return {
                id: person.id,
                full_name: person.full_name,
                type: person.type,
                base_salary: base,
                commission_rate: person.commission_percentage || 0,
                private_classes_count: count,
                total_sales: totalSales,
                commission_amount: commissionAmt,
                total_payable: totalPay
            }
        })
        
        setPayrollData(payrollList)
        setPayrollTotal(totalPayrollCalc)
      }
    } catch (err) {
      console.error(err)
      showToast('Error cargando datos', 'error')
    } finally {
      setLoading(false)
    }
  }, [orgId, currentDate]) // 🟢 Dependencia estable: orgId (string) en vez de profile (objeto)

  // 🟢 EFECTO DE CARGA OPTIMIZADO
  useEffect(() => { 
      loadFinanceData() 
  }, [loadFinanceData]) 

  // --- CARGA DE SELECTS ---
  useEffect(() => {
    if (isDrawerOpen && orgId) { // Verificamos orgId
      const loadSelects = async () => {
        
        const { data: stData } = await supabase.from('students').select('id, first_name, last_name').eq('organization_id', orgId)
        setStudents(stData || [])

        const { data: plData } = await supabase.from('plans').select('id, name, price, duration_days').eq('organization_id', orgId).eq('is_active', true)
        setPlans(plData || [])
      }
      loadSelects()
    }
  }, [isDrawerOpen, orgId]) // 🟢 Dependencia estable

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId)
    const plan = plans.find(p => p.id === planId)
    if (plan) {
        setFormData(prev => ({
            ...prev,
            amount: plan.price.toString(),
            concept: `Membresía: ${plan.name}`
        }))
    }
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const branchId = (profile as any)?.assigned_branch_id 

      const { error: txError } = await supabase.from('transactions').insert({
        organization_id: orgId, // Usamos la variable estable
        branch_id: branchId,
        student_id: formData.student_id,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        concept: formData.concept
      })
      if (txError) throw txError

      if (saleType === 'plan' && selectedPlanId) {
        const plan = plans.find(p => p.id === selectedPlanId)
        if (plan) {
            const startDate = new Date()
            const endDate = addDays(startDate, plan.duration_days) 

            const { error: memError } = await supabase.from('memberships').insert({
                organization_id: orgId,
                student_id: formData.student_id,
                plan_id: plan.id,
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
                price_paid: parseFloat(formData.amount),
                status: 'active'
            })
            if (memError) throw memError
        }
      }
      
      showToast(saleType === 'plan' ? 'Membresía activada y cobrada' : 'Ingreso registrado', 'success')
      setIsDrawerOpen(false)
      
      setFormData({ student_id: '', amount: '', payment_method: 'transfer', concept: '' })
      setSaleType('custom')
      setSelectedPlanId('')
      
      loadFinanceData()

    } catch (err: any) {
      showToast(err.message || 'Error al procesar', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatMoney = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
  
  const getMethodIcon = (method: string) => {
    if (method === 'cash') return <Banknote size={14} className="text-emerald-500"/>
    if (method === 'card') return <CreditCard size={14} className="text-blue-500"/>
    return <Landmark size={14} className="text-purple-500"/>
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-emerald-500" />
            Tesorería & Nómina
          </h1>
          <p className="text-zinc-400 text-sm">
            Balance de {format(currentDate, 'MMMM yyyy', { locale: es })}
          </p>
        </div>
        
        {activeTab === 'income' && (
            <button 
            onClick={() => setIsDrawerOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-lg shadow-emerald-500/20"
            >
            <Plus size={18} /> Registrar Ingreso
            </button>
        )}
      </div>

      {/* TABS */}
      <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 w-fit">
        <button
          onClick={() => setActiveTab('income')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'income' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <TrendingUp size={16} className={activeTab === 'income' ? 'text-emerald-500' : ''}/>
          Ingresos
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'payroll' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <TrendingDown size={16} className={activeTab === 'payroll' ? 'text-amber-500' : ''}/>
          Nómina (Staff)
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-zinc-500" size={30}/></div>
      ) : activeTab === 'income' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-zinc-500 font-medium uppercase text-xs tracking-widest">Total Recaudado</p>
                    <p className="text-4xl font-mono font-bold text-white mt-2">{formatMoney(incomeTotal)}</p>
                </div>
                <div className="h-12 w-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <DollarSign size={24}/>
                </div>
            </div>

            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-white">Últimos Movimientos</h3>
                    <span className="text-xs text-zinc-500">{transactions.length} registros</span>
                </div>
                {transactions.length === 0 ? (
                    <div className="p-10 text-center text-zinc-500 italic">No hay ingresos registrados.</div>
                ) : (
                    <div className="divide-y divide-zinc-800">
                        {transactions.map(tx => (
                            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-zinc-950 p-3 rounded text-zinc-400">
                                        {getMethodIcon(tx.payment_method)}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{tx.concept}</p>
                                        <p className="text-xs text-zinc-500">{tx.students?.first_name} {tx.students?.last_name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-emerald-400 font-bold font-mono">+ {formatMoney(tx.amount)}</p>
                                    <p className="text-[10px] text-zinc-600 uppercase">{format(new Date(tx.created_at), "d MMM, HH:mm")}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-zinc-500 font-medium uppercase text-xs tracking-widest">Nómina Estimada</p>
                    <p className="text-4xl font-mono font-bold text-white mt-2">{formatMoney(payrollTotal)}</p>
                </div>
                <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <Calculator size={24}/>
                </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-zinc-950 text-xs uppercase font-medium text-zinc-500 border-b border-zinc-800">
                        <tr>
                            <th className="px-6 py-4">Profesor</th>
                            <th className="px-6 py-4">Sueldo Base</th>
                            <th className="px-6 py-4">Clases Privadas</th>
                            <th className="px-6 py-4">Comisión</th>
                            <th className="px-6 py-4">Bono</th>
                            <th className="px-6 py-4 text-right text-white">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {payrollData.map((p) => (
                            <tr key={p.id} className="hover:bg-zinc-800/30">
                                <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                    {p.full_name}
                                    {p.type === 'professional' && <span className="text-[10px] bg-zinc-800 px-1 rounded text-zinc-500">EXT</span>}
                                </td>
                                <td className="px-6 py-4">{formatMoney(p.base_salary)}</td>
                                <td className="px-6 py-4">
                                    <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-xs font-bold border border-amber-500/20">
                                        {p.private_classes_count}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-zinc-300">{(p.commission_rate * 100)}%</td>
                                <td className="px-6 py-4 text-emerald-400 font-mono">+ {formatMoney(p.commission_amount)}</td>
                                <td className="px-6 py-4 text-right font-bold text-white font-mono">{formatMoney(p.total_payable)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* DRAWER: NUEVA VENTA */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Registrar Venta / Ingreso">
        <form onSubmit={handleCreateTransaction} className="space-y-6" autoComplete="off">
          
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button type="button" onClick={() => setSaleType('custom')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${saleType === 'custom' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>
                Cobro Simple
            </button>
            <button type="button" onClick={() => setSaleType('plan')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${saleType === 'plan' ? 'bg-indigo-600 text-white' : 'text-zinc-500'}`}>
                <Package size={12}/> Vender Membresía
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Alumno / Cliente</label>
            <select required className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white focus:border-emerald-500 outline-none" value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})}>
                <option value="">Seleccionar Alumno...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>

          {saleType === 'plan' ? (
            <div className="bg-indigo-900/10 border border-indigo-500/20 p-4 rounded-lg space-y-3">
                <label className="block text-xs font-bold text-indigo-400 uppercase">Seleccionar Plan</label>
                <select required className="w-full bg-zinc-900 border border-indigo-500/30 rounded p-3 text-white focus:border-indigo-500 outline-none" value={selectedPlanId} onChange={e => handlePlanChange(e.target.value)}>
                    <option value="">-- Elige una Membresía --</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({formatMoney(p.price)})</option>)}
                </select>
                {selectedPlanId && <div className="flex items-center gap-2 text-xs text-indigo-300"><CheckCircle2 size={12}/><span>Se activará automáticamente al guardar.</span></div>}
            </div>
          ) : (
            <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Concepto</label>
                <input type="text" required className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white focus:border-emerald-500 outline-none" placeholder="Ej: Clase suelta, Bebida, Inscripción..." value={formData.concept} onChange={e => setFormData({...formData, concept: e.target.value})} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Monto</label>
                <div className="relative">
                    <span className="absolute left-3 top-3 text-zinc-500">$</span>
                    <input type="number" required className={`w-full bg-zinc-900 border rounded p-3 pl-8 text-white outline-none font-mono ${saleType === 'plan' ? 'border-indigo-500/30 text-indigo-300' : 'border-zinc-700 focus:border-emerald-500'}`} placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Método</label>
                <select className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white focus:border-emerald-500 outline-none" value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value as any})}>
                    <option value="transfer">Transferencia</option>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                </select>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className={`w-full text-white font-bold py-4 rounded disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${saleType === 'plan' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {isSubmitting ? <Loader2 className="animate-spin"/> : (saleType === 'plan' ? 'ACTIVAR MEMBRESÍA & COBRAR' : 'REGISTRAR INGRESO')}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
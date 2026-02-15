import React, { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  DollarSign, Wallet, TrendingUp, TrendingDown, Plus, CreditCard, Banknote, Landmark, 
  Loader2, Calculator, Package, CheckCircle2,
  Zap, Droplets, Wrench, Megaphone, HelpCircle, Receipt, Users, AlertTriangle,
  Download, FileText, MessageCircle, CheckCircle
} from 'lucide-react'
import { Drawer } from '../components/Drawer'
import { EmptyState } from '../components/EmptyState'
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

interface PayrollItem {
  id: string 
  full_name: string
  type: string 
  base_salary: number
  commission_rate: number
  private_classes_count: number
  total_sales: number
  commission_amount: number
  total_payable: number
}

// 🟢 CORRECCIÓN: Interfaz ajustada para manejar el array que devuelve Supabase en el select
interface Plan {
  id: string
  name: string
  price: number
  duration_days: number
  service_id?: string | null
  service?: { name: string } | null
}

interface Expense {
  id: string
  amount: number
  category: string
  description: string
  created_at: string
  payment_method: string
}

export default function FinancePage() {
  const { profile } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  
  const orgId = (profile as any)?.organization_id
  const userId = (profile as any)?.id

  // ESTADOS GENERALES
  const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'payroll'>('income')
  const [loading, setLoading] = useState(false)
  const [currentDate] = useState(new Date())

  // ESTADOS DE DATOS
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeTotal, setIncomeTotal] = useState(0)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseTotal, setExpenseTotal] = useState(0)
  const [payrollData, setPayrollData] = useState<PayrollItem[]>([])
  const [payrollTotal, setPayrollTotal] = useState(0)

  // ESTADOS DEL FORMULARIO
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [students, setStudents] = useState<Student[]>([])
  const [plans, setPlans] = useState<Plan[]>([]) 

  const [saleType, setSaleType] = useState<'custom' | 'plan'>('custom') 
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income')

  const [selectedPlanId, setSelectedPlanId] = useState('')  
  
  // STATS MODAL NOMINA
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false)
  const [selectedPayrollItem, setSelectedPayrollItem] = useState<PayrollItem | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<PayrollItem | null>(null)

  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_method: 'transfer' as 'cash' | 'card' | 'transfer',
    concept: '',
    category: 'otros',
    description: ''
  })

  const loadFinanceData = useCallback(async () => {
    if (!orgId) return

    setLoading(true)
    try {
      const start = startOfMonth(currentDate).toISOString()
      const end = endOfMonth(currentDate).toISOString()

      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('*, students!fk_transactions_student(first_name, last_name)')
        .eq('organization_id', orgId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (txError) throw txError
      const txData = txs as any as Transaction[]
      setTransactions(txData)
      setIncomeTotal(txData.reduce((sum, t) => sum + Number(t.amount), 0))

      // --- FETCH EXPENSES ---
      const { data: expData, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', orgId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })
      
      if (expError) throw expError
      const expensesList = expData as Expense[]
      setExpenses(expensesList)
      setExpenseTotal(expensesList.reduce((sum, e) => sum + Number(e.amount), 0))

      const { data: allStaff } = await supabase
        .from('staff_details_view')
        .select('id, full_name, base_salary, commission_percentage, type')
        .eq('organization_id', orgId)
      
      const { data: appts } = await supabase
        .from('appointments')
        .select('profile_id, professional_id, price_at_booking')
        .eq('organization_id', orgId)
        .eq('is_private_class', true)
        .gte('start_time', start)
        .lte('start_time', end)

      if (allStaff && appts) {
        let totalPayrollCalc = 0
        
        const payrollList: PayrollItem[] = allStaff.map(person => {
            const myClasses = appts.filter(a => {
                if (person.type === 'system') return a.profile_id === person.id
                return a.professional_id === person.id
            })

            const count = myClasses.length
            const totalSales = myClasses.reduce((sum, c) => sum + (c.price_at_booking || 0), 0)
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
  }, [orgId, currentDate])

  useEffect(() => { 
      loadFinanceData() 
  }, [loadFinanceData]) 

  useEffect(() => {
    if (isDrawerOpen && orgId) {
      const loadSelects = async () => {
        const { data: stData } = await supabase.from('students').select('id, first_name, last_name').eq('organization_id', orgId)
        setStudents(stData || [])

        // 🟢 CORRECCIÓN: Normalizamos el array 'service' a un objeto único
        const { data: plData } = await supabase
            .from('plans')
            .select('id, name, price, duration_days, service_id, service:services!fk_plans_service(name)')
            .eq('organization_id', orgId)
            .eq('is_active', true)
        
        if (plData) {
            const normalizedPlans = plData.map((plan: any) => ({
                ...plan,
                service: Array.isArray(plan.service) ? plan.service[0] : plan.service
            }))
            setPlans(normalizedPlans)
        }
      }
      loadSelects()
    }
  }, [isDrawerOpen, orgId])

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId)
    const plan = plans.find(p => p.id === planId)
    if (plan) {
        const serviceName = plan.service?.name ? ` (${plan.service.name})` : ''
        setFormData(prev => ({
            ...prev,
            amount: plan.price.toString(),
            concept: `Membresía: ${plan.name}${serviceName}`
        }))
    }
  }

  const handleExportCSV = () => {
    // 1. Combine Data
    const txRows = transactions.map(t => ({
        Fecha: format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
        Tipo: 'Ingreso',
        Categoria: t.concept,
        Metodo: t.payment_method,
        Monto: t.amount,
        Detalle: t.students ? `${t.students.first_name} ${t.students.last_name}` : '-'
    }))

    const expRows = expenses.map(e => ({
        Fecha: format(new Date(e.created_at), 'yyyy-MM-dd HH:mm'),
        Tipo: 'Gasto',
        Categoria: e.category,
        Metodo: e.payment_method,
        Monto: -e.amount, // Negative for expenses
        Detalle: e.description
    }))

    const allRows = [...txRows, ...expRows].sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime())

    // 2. Convert to CSV
    const headers = ['Fecha', 'Tipo', 'Categoria', 'Metodo', 'Monto', 'Detalle']
    const csvContent = [
        headers.join(','),
        ...allRows.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    // 3. Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Finanzas_${format(currentDate, 'MMM_yyyy')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const generatePDF = () => {
    if (!paymentSuccess) return
    const doc = new jsPDF()
    
    // --- HEADER ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(24, 24, 27) // Zinc-900
    doc.text('ACADEMIA ALERIS', 20, 25)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(113, 113, 122) // Zinc-500
    doc.text('Comprobante de Pago de Nómina', 20, 31)
    
    const dateStr = format(new Date(), 'dd/MM/yyyy')
    doc.text(`Fecha de emisión: ${dateStr}`, 190, 25, { align: 'right' })

    // --- METADATA ---
    doc.setTextColor(63, 63, 70) // Zinc-700
    doc.setFontSize(11)
    
    doc.text(`Instructor:`, 20, 50)
    doc.setFont('helvetica', 'bold')
    doc.text(paymentSuccess.full_name, 45, 50)
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Periodo:`, 20, 58)
    doc.setFont('helvetica', 'bold')
    const periodStr = format(currentDate, 'MMMM yyyy', { locale: es })
    doc.text(periodStr.charAt(0).toUpperCase() + periodStr.slice(1), 45, 58)

    // --- TABLE ---
    const tableBody = [
        ['Sueldo Base', formatMoney(paymentSuccess.base_salary)],
        ['Comisiones', formatMoney(paymentSuccess.commission_amount)],
    ]

    autoTable(doc, {
        startY: 70,
        head: [['Concepto', 'Monto']],
        body: tableBody,
        theme: 'plain',
        headStyles: { 
            fillColor: [244, 244, 245], // Zinc-100
            textColor: [24, 24, 27], 
            fontStyle: 'bold',
            halign: 'left'
        },
        bodyStyles: {
            textColor: [82, 82, 91], // Zinc-600
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right', cellWidth: 50, fontStyle: 'bold' }
        },
        styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 6,
            lineColor: [228, 228, 231], // Zinc-200
            lineWidth: { bottom: 0.1 }
        }
    })

    // --- TOTAL ---
    const finalY = (doc as any).lastAutoTable.finalY + 10
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(24, 24, 27)
    doc.text('TOTAL PAGADO', 120, finalY)
    doc.text(formatMoney(paymentSuccess.total_payable), 190, finalY, { align: 'right' })

    // --- FOOTER ---
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(161, 161, 170) // Zinc-400
    doc.text('Documento generado automáticamente por ALERIS.ops', 105, 285, { align: 'center' })

    doc.save(`Nomina_${paymentSuccess.full_name.replace(/\s+/g, '_')}_${format(currentDate, 'MMM_yyyy')}.pdf`)
  }

  const handleWhatsApp = () => {
    if (!paymentSuccess) return
    
    const period = format(currentDate, 'MMMM yyyy', { locale: es })
    const periodCapitalized = period.charAt(0).toUpperCase() + period.slice(1)

    const message = `¡Hola *${paymentSuccess.full_name}*! 🎵\nTe confirmamos el pago de tu nómina correspondiente a *${periodCapitalized}*.\n\n💰 *Total Pagado: ${formatMoney(paymentSuccess.total_payable)}*\n\n*Desglose:*\n• Sueldo Base: ${formatMoney(paymentSuccess.base_salary)}\n• Comisiones: ${formatMoney(paymentSuccess.commission_amount)}\n\n¡Gracias por tu excelente trabajo en el equipo! 🚀`
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const branchId = (profile as any)?.assigned_branch_id 

      if (transactionType === 'income') {
          // --- INCOME LOGIC ---
          const { error: txError } = await supabase.from('transactions').insert({
            organization_id: orgId,
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
    
                const { data: membershipData, error: memError } = await supabase.from('memberships').insert({
                    organization_id: orgId,
                    student_id: formData.student_id,
                    plan_id: plan.id,
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    price_paid: parseFloat(formData.amount),
                    status: 'active'
                }).select()
                if (memError) throw memError
    
                if (membershipData && membershipData[0]) {
                    const membershipId = membershipData[0].id
                    const { data: recurringResult, error: recurringError } = await supabase
                        .rpc('generate_recurring_appointments', { p_membership_id: membershipId })
                    
                    if (recurringError) {
                        console.error('Error generando clases recurrentes:', recurringError)
                        showToast('Membresía creada, pero hubo un error al generar clases automáticas', 'warning')
                    } else if (recurringResult && recurringResult.length > 0) {
                        const appointmentsCreated = recurringResult[0].appointments_created
                        if (appointmentsCreated > 0) {
                            showToast(`Membresía activada con ${appointmentsCreated} clases programadas automáticamente 🎉`, 'success')
                            resetForm()
                            loadFinanceData()
                            return 
                        }
                    }
                }
            }
          }
          showToast(saleType === 'plan' ? 'Membresía activada y cobrada' : 'Ingreso registrado', 'success')

      } else {
          // --- EXPENSE LOGIC ---
          const { error: expError } = await supabase.from('expenses').insert({
              organization_id: orgId,
              amount: parseFloat(formData.amount),
              category: formData.category,
              description: formData.description || formData.concept, // Failover
              payment_method: formData.payment_method,
              created_by: userId
          })
          if (expError) throw expError
          showToast('Gasto registrado correctamente', 'success')
      }

      resetForm()
      loadFinanceData()

    } catch (err: any) {
      showToast(err.message || 'Error al procesar', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
      setIsDrawerOpen(false)
      setFormData({ student_id: '', amount: '', payment_method: 'transfer', concept: '', category: 'otros', description: '' })
      setSaleType('custom') // Reset to default
      setTransactionType('income') // Reset to default? Or keep? Let's reset.
      setSelectedPlanId('')
  }

  const handlePayClick = (item: PayrollItem) => {
    setSelectedPayrollItem(item)
    setPaymentSuccess(null) // Reset on open
    setIsPayrollModalOpen(true)
  }

  const handleConfirmPayment = async () => {
      if (!selectedPayrollItem) return
      
      setIsSubmitting(true)
      try {
          const { error } = await supabase.from('expenses').insert({
              organization_id: orgId,
              amount: selectedPayrollItem.total_payable,
              category: 'nómina',
              description: `Pago Nómina: ${selectedPayrollItem.full_name} (${format(currentDate, 'MMM yyyy')})`,
              payment_method: 'transfer',
              created_by: userId
          })
          if (error) throw error
          showToast('Pago de nómina registrado como gasto', 'success')
          loadFinanceData()

          // Show Success View
          setPaymentSuccess(selectedPayrollItem)
          
      } catch (err: any) {
          showToast('Error registrando pago', 'error')
          setIsPayrollModalOpen(false) // Close purely on error
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

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
        case 'servicios': return <Zap size={18} className="text-amber-400"/>
        case 'agua': return <Droplets size={18} className="text-cyan-400"/>
        case 'mantenimiento': return <Wrench size={18} className="text-zinc-400"/>
        case 'publicidad': return <Megaphone size={18} className="text-purple-400"/>
        case 'nómina': return <Users size={18} className="text-rose-400"/>
        default: return <HelpCircle size={18} className="text-zinc-500"/>
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-emerald-500" />
            Caja & Nómina
          </h1>
          <p className="text-zinc-400 text-sm">
            Balance de {format(currentDate, 'MMMM yyyy', { locale: es })}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={handleExportCSV}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold border border-zinc-700"
            >
                <Download size={18} /> <span className="hidden sm:inline">Exportar Mes</span>
            </button>

            {activeTab === 'income' && (
                <button 
                onClick={() => setIsDrawerOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-lg shadow-emerald-500/20"
                >
                <Plus size={18} /> Registrar Ingreso
                </button>
            )}
        </div>
      </div>

      {/* --- DASHBOARD CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Income */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
            <div className="relative z-10">
                <p className="text-zinc-500 font-medium uppercase text-xs tracking-widest flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-500"/> Ingresos
                </p>
                <p className="text-3xl font-mono font-bold text-white mt-2">{formatMoney(incomeTotal)}</p>
            </div>
            <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign size={64} className="text-emerald-500"/>
            </div>
        </div>

        {/* Expenses */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
            <div className="relative z-10">
                <p className="text-zinc-500 font-medium uppercase text-xs tracking-widest flex items-center gap-2">
                    <TrendingDown size={14} className="text-rose-500"/> Gastos
                </p>
                <p className="text-3xl font-mono font-bold text-white mt-2">{formatMoney(expenseTotal)}</p>
            </div>
            <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Receipt size={64} className="text-rose-500"/>
            </div>
        </div>

        {/* Balance */}
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 border border-indigo-500/30 p-6 rounded-xl relative overflow-hidden shadow-lg shadow-indigo-500/10">
            <div className="relative z-10">
                <p className="text-indigo-300 font-medium uppercase text-xs tracking-widest flex items-center gap-2">
                    <Wallet size={14}/> Balance Neto
                </p>
                <p className="text-3xl font-mono font-bold text-white mt-2">{formatMoney(incomeTotal - expenseTotal)}</p>
            </div>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('income')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'income' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <TrendingUp size={16} className={activeTab === 'income' ? 'text-emerald-500' : ''}/>
          Ingresos
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'expenses' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <TrendingDown size={16} className={activeTab === 'expenses' ? 'text-rose-500' : ''}/>
          Gastos
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'payroll' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Calculator size={16} className={activeTab === 'payroll' ? 'text-amber-500' : ''}/>
          Nómina (Staff)
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-zinc-500" size={30}/></div>
      ) : activeTab === 'income' ? (
        /* --- INCOME TAB --- */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/30">
                <h3 className="font-bold text-white flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500"/> Transacciones de Ingreso</h3>
                <span className="text-xs text-zinc-500">{transactions.length} registros</span>
            </div>
            {transactions.length === 0 ? (
                <EmptyState
                  icon={Banknote}
                  title="Aún no hay ingresos este mes"
                  description="Registra tu primer cobro o venta de membresía para empezar a ver tus finanzas."
                  actionLabel="Registrar Ingreso"
                  onAction={() => setIsDrawerOpen(true)}
                />
            ) : (
                <div className="divide-y divide-zinc-800">
                    {transactions.map(tx => (
                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-zinc-950 p-3 rounded-xl text-zinc-400 border border-zinc-800">
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
      ) : activeTab === 'expenses' ? (
        /* --- EXPENSES TAB --- */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/30">
                <h3 className="font-bold text-white flex items-center gap-2"><TrendingDown size={16} className="text-rose-500"/> Registro de Gastos</h3>
                <span className="text-xs text-zinc-500">{expenses.length} registros</span>
            </div>
            {expenses.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No hay gastos registrados"
                  description="Mantén el control registrando tus egresos operativos (luz, agua, renta)."
                  actionLabel="Registrar Gasto"
                  onAction={() => setIsDrawerOpen(true)} // Needs update to open expense drawer
                />
            ) : (
                <div className="divide-y divide-zinc-800">
                    {expenses.map(exp => (
                        <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                                    {getCategoryIcon(exp.category)}
                                </div>
                                <div>
                                    <p className="text-white font-medium capitalize">{exp.category}</p>
                                    <p className="text-xs text-zinc-500">{exp.description || 'Sin descripción'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-rose-400 font-bold font-mono">- {formatMoney(exp.amount)}</p>
                                <p className="text-[10px] text-zinc-600 uppercase">{format(new Date(exp.created_at), "d MMM, HH:mm")}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-bold text-white font-mono">{formatMoney(p.total_payable)}</span>
                                        <button 
                                            onClick={() => handlePayClick(p)}
                                            disabled={p.total_payable <= 0}
                                            className={`text-[10px] px-2 py-1 rounded transition-colors text-white ${
                                                p.total_payable <= 0 
                                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50' 
                                                : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                        >
                                            {p.total_payable <= 0 ? 'Sin saldo' : 'Pagar'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={transactionType === 'income' ? "Registrar Ingreso" : "Registrar Gasto"}>
        <form onSubmit={handleCreateTransaction} className="space-y-6" autoComplete="off">
          
          {/* TYPE SWITCHER */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 mb-6">
            <button type="button" onClick={() => setTransactionType('income')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${transactionType === 'income' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <TrendingUp size={14}/> INGRESOS
            </button>
            <button type="button" onClick={() => setTransactionType('expense')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${transactionType === 'expense' ? 'bg-rose-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <TrendingDown size={14}/> GASTOS
            </button>
          </div>

          {transactionType === 'income' ? (
              /* --- INCOME FORM --- */
              <>
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
                            {plans.map(p => <option key={p.id} value={p.id}>{p.name}{p.service ? ` — ${p.service.name}` : ''} ({formatMoney(p.price)})</option>)}
                        </select>
                        {selectedPlanId && <div className="flex items-center gap-2 text-xs text-indigo-300"><CheckCircle2 size={12}/><span>Se activará automáticamente al guardar.</span></div>}
                    </div>
                  ) : (
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Concepto</label>
                        <input type="text" required className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white focus:border-emerald-500 outline-none" placeholder="Ej: Clase suelta, Bebida, Inscripción..." value={formData.concept} onChange={e => setFormData({...formData, concept: e.target.value})} />
                    </div>
                  )}
              </>
          ) : (
              /* --- EXPENSE FORM --- */
              <>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Categoría</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['servicios', 'agua', 'mantenimiento', 'publicidad', 'nómina', 'otros'].map(cat => (
                            <button 
                                key={cat}
                                type="button"
                                onClick={() => setFormData({...formData, category: cat})}
                                className={`p-2 rounded border text-xs capitalize transition-all ${
                                    formData.category === cat 
                                    ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Descripción</label>
                    <input type="text" required className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-white focus:border-rose-500 outline-none" placeholder="Ej: Pago de luz Enero" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
              </>
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

          <button type="submit" disabled={isSubmitting} className={`w-full text-white font-bold py-4 rounded disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${
            transactionType === 'expense' 
                ? 'bg-rose-600 hover:bg-rose-700' 
                : (saleType === 'plan' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700')
          }`}>
            {isSubmitting ? <Loader2 className="animate-spin"/> : (transactionType === 'income' ? (saleType === 'plan' ? 'ACTIVAR MEMBRESÍA & COBRAR' : 'REGISTRAR INGRESO') : 'REGISTRAR GASTO')}
          </button>
        </form>
      </Drawer>
      {/* --- CONFIRMATION MODAL --- */}
      {isPayrollModalOpen && selectedPayrollItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {!paymentSuccess ? (
                    // --- CONFIRMATION VIEW ---
                    <>
                        <div className="p-6 text-center space-y-4">
                            <div className="h-12 w-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-500/20">
                                <AlertTriangle size={24}/>
                            </div>
                            
                            <h3 className="text-xl font-bold text-white">Confirmar Pago de Nómina</h3>
                            
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                ¿Estás seguro de que deseas registrar el pago de <span className="text-white font-bold">{selectedPayrollItem.full_name}</span> por un total de <span className="text-emerald-400 font-bold font-mono text-base">{formatMoney(selectedPayrollItem.total_payable)}</span>?
                            </p>
                            
                            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-500">
                                Esta acción generará un registro automático en la sección de <strong>Gastos</strong>.
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-950/30 border-t border-zinc-800 flex gap-3">
                            <button 
                                disabled={isSubmitting}
                                onClick={() => { setIsPayrollModalOpen(false); setSelectedPayrollItem(null) }}
                                className="flex-1 py-3 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                disabled={isSubmitting}
                                onClick={handleConfirmPayment}
                                className="flex-1 py-3 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : 'Confirmar Pago'}
                            </button>
                        </div>
                    </>
                ) : (
                    // --- SUCCESS VIEW (RECEIPT) ---
                    <>
                        <div className="p-6 text-center space-y-4">
                            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/20 shadow-lg shadow-emerald-500/20">
                                <CheckCircle size={40}/>
                            </div>
                            
                            <h3 className="text-2xl font-bold text-white">¡Pago Registrado!</h3>
                            
                            <p className="text-zinc-400 text-sm">
                                El pago a <span className="text-white">{paymentSuccess.full_name}</span> se ha guardado correctamente.
                            </p>

                            <div className="grid grid-cols-1 gap-3 mt-6">
                                <button 
                                    onClick={generatePDF}
                                    className="w-full py-3 rounded-lg text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-all flex items-center justify-center gap-2 border border-zinc-700"
                                >
                                    <FileText size={16} className="text-rose-400"/> Descargar Recibo (PDF)
                                </button>
                                <button 
                                    onClick={handleWhatsApp}
                                    className="w-full py-3 rounded-lg text-sm font-bold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 transition-all flex items-center justify-center gap-2 border border-emerald-600/30"
                                >
                                    <MessageCircle size={16}/> Enviar por WhatsApp
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-950/30 border-t border-zinc-800">
                            <button 
                                onClick={() => { setIsPayrollModalOpen(false); setSelectedPayrollItem(null); setPaymentSuccess(null); }}
                                className="w-full py-3 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}

    </div>
  )
}
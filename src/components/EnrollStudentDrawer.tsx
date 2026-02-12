import { useState, useEffect, useCallback } from 'react'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Drawer } from './Drawer'
import {
  Search, UserPlus, Check, Loader2, ChevronRight,
  GraduationCap, Calendar, Tag
} from 'lucide-react'

interface StudentOption {
  id: string
  first_name: string
  last_name: string
}

interface PlanOption {
  id: string
  name: string
  duration_days: number
  price: number
  service_names: string[]
}

interface EnrollStudentDrawerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSuccess: (message: string) => void
}

type Step = 'student' | 'plan' | 'confirm'

export function EnrollStudentDrawer({ isOpen, onClose, onSuccess }: EnrollStudentDrawerProps) {
  const { profile } = useAuth()
  const orgId = (profile as any)?.organization_id
  const branchId = (profile as any)?.assigned_branch_id

  const [step, setStep] = useState<Step>('student')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Student selection
  const [students, setStudents] = useState<StudentOption[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null)

  // Quick-create student
  const [quickFirstName, setQuickFirstName] = useState('')
  const [quickLastName, setQuickLastName] = useState('')
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [creatingStudent, setCreatingStudent] = useState(false)

  // Plan selection
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null)

  // Load students and plans on open
  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [{ data: stData }, { data: plData }] = await Promise.all([
        supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('organization_id', orgId)
          .order('first_name'),
        supabase
          .from('plans')
          .select(`
            id, name, duration_days, price,
            plan_services_access (service_id, services (name)),
            service:services!fk_plans_service (name)
          `)
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .order('name')
      ])

      setStudents(stData || [])
      setPlans((plData || []).map((p: any) => {
        // Prefer junction table, fallback to legacy FK
        const junctionNames = (p.plan_services_access || []).map((psa: any) => psa.services?.name).filter(Boolean)
        const names = junctionNames.length > 0 ? junctionNames : (p.service?.name ? [p.service.name] : [])
        return {
          id: p.id,
          name: p.name,
          duration_days: p.duration_days,
          price: p.price,
          service_names: names
        }
      }))
    } catch (err) {
      console.error('Error loading enrollment data:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    if (isOpen) {
      loadData()
      setStep('student')
      setSelectedStudent(null)
      setSelectedPlan(null)
      setSearchQuery('')
      setShowQuickCreate(false)
      setQuickFirstName('')
      setQuickLastName('')
    }
  }, [isOpen, loadData])

  // Filter students by search
  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Quick-create a student
  const handleQuickCreate = async () => {
    if (!quickFirstName.trim()) return
    setCreatingStudent(true)

    try {
      const { data, error } = await supabase
        .from('students')
        .insert({
          organization_id: orgId,
          branch_id: branchId || null,
          first_name: quickFirstName.trim(),
          last_name: quickLastName.trim() || '',
        })
        .select('id, first_name, last_name')
        .single()

      if (error) throw error

      // Add to local list and select
      setStudents(prev => [...prev, data])
      setSelectedStudent(data)
      setShowQuickCreate(false)
      setStep('plan')
    } catch (err: any) {
      console.error('Error creating student:', err)
    } finally {
      setCreatingStudent(false)
    }
  }

  // Select student and go to plan step
  const handleSelectStudent = (student: StudentOption) => {
    setSelectedStudent(student)
    setStep('plan')
  }

  // Select plan and go to confirm
  const handleSelectPlan = (plan: PlanOption) => {
    setSelectedPlan(plan)
    setStep('confirm')
  }

  // Final enrollment: INSERT into memberships
  const handleEnroll = async () => {
    if (!selectedStudent || !selectedPlan || !orgId) return
    setSaving(true)

    try {
      const startDate = new Date()
      const endDate = addDays(startDate, selectedPlan.duration_days)

      const { error } = await supabase
        .from('memberships')
        .insert({
          organization_id: orgId,
          student_id: selectedStudent.id,
          plan_id: selectedPlan.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          status: 'active'
        })

      if (error) throw error

      onSuccess(`¡${selectedStudent.first_name} inscrito en "${selectedPlan.name}"! Vigencia: ${selectedPlan.duration_days} días.`)
      onClose()
    } catch (err: any) {
      console.error('Error enrolling student:', err)
      onSuccess(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (step === 'confirm') setStep('plan')
    else if (step === 'plan') setStep('student')
  }

  // Format price
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Inscribir Alumno" size="md">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-indigo-500 mr-3" size={24} />
          <span className="text-zinc-400">Cargando datos...</span>
        </div>
      ) : step === 'student' ? (
        /* === STEP 1: SELECT STUDENT === */
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">1</div>
            <p className="text-sm text-zinc-400">Selecciona un alumno</p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar alumno..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none transition-colors"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {filteredStudents.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelectStudent(s)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-800 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all text-left group"
              >
                <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                  {s.first_name[0]}
                </div>
                <span className="text-sm text-white font-medium">{s.first_name} {s.last_name}</span>
                <ChevronRight size={16} className="ml-auto text-zinc-700 group-hover:text-indigo-400 transition-colors" />
              </button>
            ))}
          </div>

          {/* Quick create toggle */}
          {!showQuickCreate ? (
            <button
              onClick={() => setShowQuickCreate(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-zinc-700 rounded-xl text-sm text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors"
            >
              <UserPlus size={16} />
              Crear alumno rápido
            </button>
          ) : (
            <div className="space-y-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Nuevo Alumno</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nombre *"
                  value={quickFirstName}
                  onChange={e => setQuickFirstName(e.target.value)}
                  className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={quickLastName}
                  onChange={e => setQuickLastName(e.target.value)}
                  className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
              <button
                onClick={handleQuickCreate}
                disabled={!quickFirstName.trim() || creatingStudent}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingStudent ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                Crear e Inscribir
              </button>
            </div>
          )}
        </div>
      ) : step === 'plan' ? (
        /* === STEP 2: SELECT PLAN === */
        <div className="space-y-4">
          <button
            onClick={handleBack}
            className="text-xs text-indigo-400 font-bold uppercase tracking-wider hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            ← Cambiar alumno
          </button>

          <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <div className="h-9 w-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400">
              {selectedStudent?.first_name[0]}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{selectedStudent?.first_name} {selectedStudent?.last_name}</p>
              <p className="text-xs text-zinc-500">Alumno seleccionado</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">2</div>
            <p className="text-sm text-zinc-400">Selecciona un plan</p>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <GraduationCap size={32} className="mx-auto mb-2 text-zinc-700" />
              <p className="text-sm">No hay planes activos</p>
              <p className="text-xs text-zinc-600 mt-1">Crea planes en la sección de Servicios</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className="w-full text-left p-4 rounded-xl border border-zinc-800 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
                >
                  <p className="text-white font-semibold text-sm group-hover:text-indigo-400 transition-colors">{plan.name}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {plan.service_names.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Tag size={11} className="text-indigo-400" /> {plan.service_names.join(', ')}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Calendar size={11} /> {plan.duration_days} días
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 ml-auto">
                      {formatPrice(plan.price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* === STEP 3: CONFIRM === */
        <div className="space-y-4">
          <button
            onClick={handleBack}
            className="text-xs text-indigo-400 font-bold uppercase tracking-wider hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            ← Cambiar plan
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">3</div>
            <p className="text-sm text-zinc-400">Confirmar inscripción</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-lg font-bold text-indigo-400">
                {selectedStudent?.first_name[0]}
              </div>
              <div>
                <p className="text-white font-bold">{selectedStudent?.first_name} {selectedStudent?.last_name}</p>
                <p className="text-xs text-zinc-500">Alumno</p>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Plan</span>
                <span className="text-white font-semibold">{selectedPlan?.name}</span>
              </div>
              {selectedPlan && selectedPlan.service_names.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Incluye</span>
                  <span className="text-indigo-400">{selectedPlan.service_names.join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Duración</span>
                <span className="text-white">{selectedPlan?.duration_days} días</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Inicio</span>
                <span className="text-white">{format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-zinc-800 pt-2 mt-2">
                <span className="text-zinc-400 font-semibold">Precio</span>
                <span className="text-emerald-400 font-mono font-bold text-lg">{formatPrice(selectedPlan?.price || 0)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleEnroll}
            disabled={saving}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold rounded-xl hover:from-indigo-500 hover:to-indigo-400 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Check size={18} />
                Confirmar Inscripción
              </>
            )}
          </button>
        </div>
      )}
    </Drawer>
  )
}

import useSWR from 'swr'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface UseDataOptions {
  refreshInterval?: number
  revalidateOnFocus?: boolean
}

// ✅ Hook optimizado para estudiantes con caché
export function useStudents(
  orgId: string | undefined, 
  branchId?: string | null,
  options: UseDataOptions = {}
) {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? ['students', orgId, branchId] : null,
    async () => {
      let query = supabase
        .from('student_solvency_view')
        .select('*')
        .eq('organization_id', orgId!)
        .order('last_name', { ascending: true })
      
      if (branchId) query = query.eq('branch_id', branchId)
      
      const { data, error } = await query
      if (error) throw error
      return data
    },
    {
      revalidateOnFocus: options.revalidateOnFocus ?? false,
      refreshInterval: options.refreshInterval,
      dedupingInterval: 5000, // Deduplica requests en 5s
      keepPreviousData: true,
      onError: (err) => {
        console.error('Error loading students:', err)
      }
    }
  )

  return { 
    students: data || [], 
    error, 
    isLoading,
    refetch: mutate 
  }
}

// ✅ Hook optimizado para staff con caché
export function useStaff(orgId: string | undefined, options: UseDataOptions = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? ['staff', orgId] : null,
    async () => {
      const { data, error } = await supabase
        .from('staff_details_view') 
        .select('*')
        .eq('organization_id', orgId!)
        .order('full_name', { ascending: true })
      
      if (error) throw error
      return data
    },
    {
      revalidateOnFocus: options.revalidateOnFocus ?? false,
      refreshInterval: options.refreshInterval,
      dedupingInterval: 5000,
      keepPreviousData: true
    }
  )

  return { staff: data || [], error, isLoading, refetch: mutate }
}

// ✅ Hook optimizado para estadísticas del dashboard (paralelizado + caché)
export function useDashboardStats(
  orgId: string | undefined, 
  branchId?: string | null, 
  userRole?: string
) {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? ['dashboard-stats', orgId, branchId, userRole] : null,
    async () => {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const startMonth = startOfMonth(new Date()).toISOString()
      const endMonth = endOfMonth(new Date()).toISOString()

      // Construir queries
      let studentsQuery = supabase
        .from('student_solvency_view')
        .select('*')
        .eq('organization_id', orgId!)
      if (userRole === 'staff' && branchId) studentsQuery = studentsQuery.eq('branch_id', branchId)

      let agendaQuery = supabase
        .from('appointments')
        .select('id, start_time, students!fk_appointments_student(first_name, last_name)')
        .eq('organization_id', orgId!)
        .gte('start_time', `${todayStr}T00:00:00`)
        .lte('start_time', `${todayStr}T23:59:59`)
        .order('start_time', { ascending: true })
      if (userRole === 'staff' && branchId) agendaQuery = agendaQuery.eq('branch_id', branchId)

      let financeQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('organization_id', orgId!)
        .gte('created_at', startMonth)
        .lte('created_at', endMonth)
      if (userRole === 'staff' && branchId) financeQuery = financeQuery.eq('branch_id', branchId)

      const staffQuery = userRole === 'staff' && branchId
        ? supabase.from('branch_staff').select('profile_id').eq('branch_id', branchId)
        : supabase.from('staff_details_view').select('base_salary').eq('organization_id', orgId!).neq('role', 'owner')

      // ✅ Paralelizar todas las queries
      const [
        { data: students },
        { data: staffData },
        { data: appointments },
        { data: transactions }
      ] = await Promise.all([
        studentsQuery,
        staffQuery,
        agendaQuery,
        financeQuery
      ])

      // Calcular estadísticas
      const total = students?.length || 0
      const solventes = students?.filter(s => s.status_label === 'solvente').length || 0
      const staffCount = staffData?.length || 0
      const payrollSum = userRole === 'staff' && branchId 
        ? 0 
        : (staffData?.reduce((acc: number, curr: any) => acc + (curr.base_salary || 0), 0) || 0)
      const totalIncome = transactions?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0

      // Encontrar próxima clase
      const now = new Date()
      const next = appointments?.find(a => new Date(a.start_time) > now)
      const nextClass = next && next.students
        ? {
            time: format(new Date(next.start_time), 'HH:mm'),
            student: Array.isArray(next.students) 
              ? `${next.students[0].first_name}` 
              : `${(next.students as any).first_name} ${(next.students as any).last_name}`
          }
        : null

      return {
        totalStudents: total,
        solvencyRate: total > 0 ? Math.round((solventes / total) * 100) : 0,
        totalStaff: staffCount,
        todayAppointments: appointments?.length || 0,
        monthlyIncome: totalIncome,
        estimatedPayroll: payrollSum,
        nextClass
      }
    },
    {
      refreshInterval: 30000, // Refresca cada 30s
      revalidateOnFocus: true,
      dedupingInterval: 10000, // Deduplica agresivamente
      keepPreviousData: true
    }
  )

  return { stats: data, error, isLoading, refetch: mutate }
}

// ✅ Hook para branches
export function useBranches(orgId: string | undefined) {
  const { data, error, isLoading } = useSWR(
    orgId ? ['branches', orgId] : null,
    async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('organization_id', orgId!)
      
      if (error) throw error
      return data
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Branches cambian raramente
    }
  )

  return { branches: data || [], error, isLoading }
}


import { createClient } from '@supabase/supabase-js'

// Intentamos leer las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validación de seguridad para desarrollo
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🛑 ERROR CRÍTICO: Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env')
}

// Creamos el cliente
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
)

// ==========================================
// TYPES
// ==========================================
export type Profile = {
  id: string
  email: string
  full_name: string
  // Actualizamos la lista de roles permitidos:
  role: 'super_admin' | 'owner' | 'staff' | 'professional' | 'manager' | 'receptionist'
  organization_id: string
  assigned_branch_id?: string // Agregamos esto por si lo usas en el futuro
  created_at: string
  updated_at: string
}

export type Organization = {
  id: string
  owner_id: string
  name: string
  industry: 'dance' | 'fitness' | 'beauty' | 'workshop'
  settings: Record<string, any>
  created_at: string
  updated_at: string
}
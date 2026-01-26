import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  // ACTUALIZADO: Ahora acepta 'options' en lugar de parámetros sueltos para ser compatible con tu SignupPage
  signUp: (email: string, password: string, options?: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  const mountedRef = useRef(false)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle() 

      if (error) return null
      return data as Profile
    } catch (error) {
      return null
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    // 1. TEMPORIZADOR DE SEGURIDAD (3 segundos)
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current && loading) {
        setLoading(false)
      }
    }, 3000)

    // 2. ESCUCHA DE EVENTOS DE SUPABASE
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mountedRef.current) return

      setSession(newSession)
      setUser(newSession?.user ?? null)
      
      if (newSession?.user) {
        // Carga de perfil asíncrona
        fetchProfile(newSession.user.id).then(p => {
            if (mountedRef.current) setProfile(p)
        })
      } else if (event === 'SIGNED_OUT') {
         setProfile(null)
      }
      
      // Liberamos la carga en eventos clave
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
         setTimeout(() => { 
             if (mountedRef.current) setLoading(false) 
         }, 100)
      }
    })

    return () => {
      mountedRef.current = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [fetchProfile, loading]) // Mantenemos tus dependencias originales

  // --- MÉTODOS PÚBLICOS ---
  
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.user) {
      setUser(data.user)
      setSession(data.session)
      const p = await fetchProfile(data.user.id)
      setProfile(p)
    }
    setLoading(false)
    return { error }
  }, [fetchProfile])

  // 🔥 AQUÍ ESTÁ EL ARREGLO 🔥
  // 1. Cambiamos la firma para aceptar (email, password, options)
  // 2. Conectamos la función REAL de Supabase
  const signUp = useCallback(async (email: string, password: string, options?: any) => {
     setLoading(true)
     try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options // Pasamos los metadatos (nombre, org) para que el Trigger SQL funcione
        })

        if (error) throw error
        return { error: null, data }

     } catch (error: any) {
        return { error }
     } finally {
        if (mountedRef.current) setLoading(false)
     }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    setLoading(false)
  }, [])

  const value = useMemo(() => ({
      user, profile, session, loading, signIn, signUp, signOut,
    }), [user, profile, session, loading, signIn, signUp, signOut])

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
          <div className="w-8 h-8 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin mb-4" />
        </div>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth error')
  return context
}
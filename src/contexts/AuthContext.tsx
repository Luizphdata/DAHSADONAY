import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigError } from '../lib/supabase'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  configurationError: string | null
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(!supabaseConfigError)

  useEffect(() => {
    let isMounted = true

    if (!supabase) {
      setLoading(false)
      return
    }

    const client = supabase

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return

      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    async function restoreSession() {
      try {
        const {
          data: { session: nextSession },
        } = await client.auth.getSession()

        if (!isMounted) return

        setSession(nextSession)
        setUser(nextSession?.user ?? null)
      } catch {
        if (!isMounted) return

        setSession(null)
        setUser(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void restoreSession()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('La configuración de Supabase no está disponible.')
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw new Error('La configuración de Supabase no está disponible.')
    }

    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  const value = useMemo(
    () => ({ user, session, loading, configurationError: supabaseConfigError, signIn, signOut }),
    [loading, session, signIn, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.')
  }

  return context
}

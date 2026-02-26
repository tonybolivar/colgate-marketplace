import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still loading
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.email_confirmed_at) {
        supabase.auth.signOut()
        setUser(null)
        return
      }
      setUser(session?.user ?? null)
      if (session?.user) fetchIsAdmin(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && !session.user.email_confirmed_at) {
        supabase.auth.signOut()
        setUser(null)
        setIsAdmin(false)
        return
      }
      const prevUser = user
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchIsAdmin(session.user.id)
        if (event === 'SIGNED_IN') toast.success('Successfully logged in!')
      } else {
        setIsAdmin(false)
        if (event === 'SIGNED_OUT' && prevUser) toast.success('Successfully logged out!')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchIsAdmin(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin, status')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) {
      await supabase.auth.signOut()
      return
    }

    if (data.status === 'suspended' || data.status === 'banned') {
      await supabase.auth.signOut()
      return
    }

    setIsAdmin(data.is_admin ?? false)
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

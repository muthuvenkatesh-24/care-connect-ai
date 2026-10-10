import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthUser } from '../types/patient'
import { authService } from '../services/authService'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  signInDemo: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const demoUser = authService.readDemoSession()
    if (demoUser) {
      setUser(demoUser)
      setLoading(false)
      return
    }
    authService.current()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(email, password) {
      const nextUser = await authService.login(email, password)
      authService.clearDemoSession()
      setUser(nextUser)
    },
    async register(name, email, password) {
      const nextUser = await authService.register(name, email, password)
      authService.clearDemoSession()
      setUser(nextUser)
    },
    signInDemo() {
      setUser(authService.startDemoSession())
    },
    async logout() {
      if (user?.demo) authService.clearDemoSession()
      else await authService.logout()
      setUser(null)
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

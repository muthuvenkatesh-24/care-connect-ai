import type { AuthUser } from '../types/patient'
import { apiRequest } from './api'

const DEMO_SESSION_KEY = 'care-connect-demo-session'

export const authService = {
  current: () => apiRequest<AuthUser>('/api/auth/me'),
  login: (email: string, password: string) =>
    apiRequest<AuthUser>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    apiRequest<AuthUser>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  logout: () => apiRequest<void>('/api/auth/logout', { method: 'POST' }),
  readDemoSession: (): AuthUser | null => {
    try {
      const value = localStorage.getItem(DEMO_SESSION_KEY)
      return value ? JSON.parse(value) as AuthUser : null
    } catch {
      return null
    }
  },
  startDemoSession: (): AuthUser => {
    const user: AuthUser = {
      id: 0,
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      role: 'patient',
      demo: true,
    }
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user))
    return user
  },
  clearDemoSession: () => localStorage.removeItem(DEMO_SESSION_KEY),
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { addAppointment, addMetric, patientDemoService, replaceProfile, updateAppointment } from '../services/patientDemoService'
import { profileService } from '../services/profileService'
import type { Appointment, MetricEntry, PatientData, PatientProfile } from '../types/patient'

type PatientDataContextValue = {
  data: PatientData
  lastSaved: 'browser' | 'memory' | null
  loading: boolean
  error: string | null
  retry: () => void
  saveProfile: (profile: PatientProfile) => Promise<void>
  bookAppointment: (appointment: Appointment) => void
  cancelAppointment: (id: string) => void
  addMetricEntry: (metric: MetricEntry) => void
}

const PatientDataContext = createContext<PatientDataContextValue | null>(null)

export function PatientDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isDemo = !user || user.demo === true
  const [data, setData] = useState<PatientData>(
    () => patientDemoService.get(user?.id ?? 0, user?.name ?? 'Alex Morgan', user?.email ?? 'alex.morgan@example.com'),
  )
  const [lastSaved, setLastSaved] = useState<'browser' | 'memory' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (isDemo) {
      setData(patientDemoService.get(user?.id ?? 0, user?.name ?? 'Alex Morgan', user?.email ?? 'alex.morgan@example.com'))
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    profileService.get(user?.email ?? '')
      .then((profile) => { if (!cancelled) setData((current) => ({ ...current, profile })) })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load your profile.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id, attempt, isDemo])

  function commit(next: PatientData) {
    if (isDemo) {
      setData(next)
      setLastSaved(user && patientDemoService.save(user.id, next) ? 'browser' : 'memory')
    }
    // Non-demo sessions keep demo-sourced collections in-memory only for now; the profile itself
    // is persisted through saveProfile below.
    setData(next)
  }

  const value = useMemo<PatientDataContextValue>(() => ({
    data,
    lastSaved,
    loading,
    error,
    retry: () => setAttempt((n) => n + 1),
    async saveProfile(profile) {
      if (!isDemo) {
        const saved = await profileService.update(profile)
        setData((current) => ({ ...current, profile: saved }))
        setLastSaved('browser')
        return
      }
      commit(replaceProfile(data, profile))
    },
    bookAppointment: (appointment) => commit(addAppointment(data, appointment)),
    cancelAppointment: (id) => commit(updateAppointment(data, id, 'cancelled')),
    addMetricEntry: (metric) => commit(addMetric(data, metric)),
  }), [data, lastSaved, loading, error, user, isDemo])

  return <PatientDataContext.Provider value={value}>{children}</PatientDataContext.Provider>
}

export function usePatientData() {
  const context = useContext(PatientDataContext)
  if (!context) throw new Error('usePatientData must be used inside PatientDataProvider')
  return context
}

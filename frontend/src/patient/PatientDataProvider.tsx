import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { addAppointment, addMetric, patientDemoService, replaceProfile, updateAppointment } from '../services/patientDemoService'
import type { Appointment, MetricEntry, PatientData, PatientProfile } from '../types/patient'

type PatientDataContextValue = {
  data: PatientData
  lastSaved: 'browser' | 'memory' | null
  saveProfile: (profile: PatientProfile) => void
  bookAppointment: (appointment: Appointment) => void
  cancelAppointment: (id: string) => void
  addMetricEntry: (metric: MetricEntry) => void
}

const PatientDataContext = createContext<PatientDataContextValue | null>(null)

export function PatientDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [data, setData] = useState<PatientData>(() => patientDemoService.get(user?.id ?? 0, user?.name ?? 'Alex Morgan', user?.email ?? 'alex.morgan@example.com'))
  const [lastSaved, setLastSaved] = useState<'browser' | 'memory' | null>(null)

  useEffect(() => {
    if (user) setData(patientDemoService.get(user.id, user.name, user.email))
  }, [user])

  function commit(next: PatientData) {
    setData(next)
    setLastSaved(user && patientDemoService.save(user.id, next) ? 'browser' : 'memory')
  }

  const value = useMemo<PatientDataContextValue>(() => ({
    data,
    lastSaved,
    saveProfile: (profile) => commit(replaceProfile(data, profile)),
    bookAppointment: (appointment) => commit(addAppointment(data, appointment)),
    cancelAppointment: (id) => commit(updateAppointment(data, id, 'cancelled')),
    addMetricEntry: (metric) => commit(addMetric(data, metric)),
  }), [data, lastSaved, user])

  return <PatientDataContext.Provider value={value}>{children}</PatientDataContext.Provider>
}

export function usePatientData() {
  const context = useContext(PatientDataContext)
  if (!context) throw new Error('usePatientData must be used inside PatientDataProvider')
  return context
}

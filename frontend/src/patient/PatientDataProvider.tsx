import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { addAppointment, addMetric, patientDemoService, replaceProfile, updateAppointment } from '../services/patientDemoService'
import { profileService } from '../services/profileService'
import {
  appointmentApi,
  apptTime,
  initialsFor,
  logApi,
  scoreApi,
  toneFor,
  type ApiAppointment,
  type ApiHealthLog,
  type ApiHealthScore,
} from '../services/patientApiService'
import type { Appointment, MetricEntry, MetricType, PatientData, PatientProfile } from '../types/patient'

type PatientDataContextValue = {
  data: PatientData
  mode: 'demo' | 'live'
  healthScore: ApiHealthScore | null
  lastSaved: 'browser' | 'memory' | null
  loading: boolean
  error: string | null
  retry: () => void
  saveProfile: (profile: PatientProfile) => Promise<void>
  bookAppointment: (appointment: Appointment) => Promise<void>
  cancelAppointment: (id: string) => Promise<void>
  addMetricEntry: (metric: MetricEntry) => Promise<void>
  refreshScore: () => Promise<void>
}

const PatientDataContext = createContext<PatientDataContextValue | null>(null)

const metricTypeMap: Record<MetricType, ApiHealthLog['metric_type']> = {
  steps: 'steps',
  sleep: 'sleep',
  heartRate: 'heart_rate',
  weight: 'weight',
  water: 'water',
  exercise: 'exercise',
}

const metricTypeFromApi: Record<ApiHealthLog['metric_type'], MetricType> = {
  steps: 'steps',
  sleep: 'sleep',
  heart_rate: 'heartRate',
  weight: 'weight',
  water: 'water',
  exercise: 'exercise',
}

// Server appointments are the source of truth for live accounts; initials/tone are
// presentation-only and derived locally from the doctor name.
function fromApiAppointment(api: ApiAppointment): Appointment {
  return {
    id: `appt-${api.id}`,
    doctorId: '',
    doctorName: api.doctor_name,
    specialty: api.specialty ?? 'General care',
    date: api.appointment_date,
    time: apptTime(api.appointment_time),
    type: api.visit_type,
    status: api.status,
    location: api.location ?? (api.visit_type === 'Video visit' ? 'Secure video visit' : 'Clinic address on file'),
    initials: initialsFor(api.doctor_name),
    tone: toneFor(api.doctor_name),
  }
}

export function PatientDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isDemo = !user || user.demo === true
  const [data, setData] = useState<PatientData>(() =>
    patientDemoService.get(user?.id ?? 0, user?.name ?? 'Alex Morgan', user?.email ?? 'alex.morgan@example.com'),
  )
  const [healthScore, setHealthScore] = useState<ApiHealthScore | null>(null)
  const [lastSaved, setLastSaved] = useState<'browser' | 'memory' | null>(null)
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (isDemo) {
      setData(patientDemoService.get(user?.id ?? 0, user?.name ?? 'Alex Morgan', user?.email ?? 'alex.morgan@example.com'))
      setHealthScore(null)
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([profileService.get(user?.email ?? ''), appointmentApi.list(), logApi.list(), scoreApi.get()])
      .then(([profileApi, appointments, logs, score]) => {
        if (cancelled) return
        const metrics: MetricEntry[] = logs.map((log) => ({
          id: `log-${log.id}`,
          type: metricTypeFromApi[log.metric_type],
          value: log.value,
          date: log.log_date,
        }))
        setHealthScore(score)
        setData({
          profile: profileApi,
          appointments: appointments.map(fromApiAppointment).sort((a, b) => b.date.localeCompare(a.date)),
          metrics,
          components: [],
          scoreHistory: score.history,
        })
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load your health data.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id, user?.email, attempt, isDemo])

  const refreshScore = useCallback(async () => {
    if (isDemo) return
    try {
      const score = await scoreApi.get()
      setHealthScore(score)
    } catch {
      // The score banner stays as-is if a refresh fails; the next save retries.
    }
  }, [isDemo])

  function commit(next: PatientData) {
    if (isDemo) {
      setData(next)
      setLastSaved(user && patientDemoService.save(user.id, next) ? 'browser' : 'memory')
      return
    }
    setData(next)
  }

  const value = useMemo<PatientDataContextValue>(() => ({
    data,
    mode: isDemo ? 'demo' : 'live',
    healthScore,
    lastSaved,
    loading,
    error,
    retry: () => setAttempt((n) => n + 1),
    async saveProfile(profile) {
      if (!isDemo) {
        const saved = await profileService.update(profile)
        setData((current) => ({ ...current, profile: saved }))
        setLastSaved('browser')
        await refreshScore()
        return
      }
      commit(replaceProfile(data, profile))
    },
    async bookAppointment(appointment) {
      if (isDemo) {
        commit(addAppointment(data, appointment))
        return
      }
      // Live accounts book real, server-backed records; duplicates return 409 and surface in the UI.
      // Time arrives as “H:MM AM/PM” from the demo dialog; convert to the API's strict 24h form.
      const timeMatch = appointment.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
      if (!timeMatch) throw new Error('Please choose a valid appointment time.')
      const [, hourPart, minutePart, meridiem] = timeMatch
      let hour = Number(hourPart)
      if (meridiem?.toUpperCase() === 'PM' && hour !== 12) hour += 12
      if (meridiem?.toUpperCase() === 'AM' && hour === 12) hour = 0
      const created = await appointmentApi.create({
        doctor_name: appointment.doctorName,
        specialty: appointment.specialty || null,
        appointment_date: appointment.date,
        appointment_time: `${String(hour).padStart(2, '0')}:${minutePart}`,
        visit_type: appointment.type,
        location: appointment.type === 'Video visit' ? 'Secure video visit' : 'Clinic address on file',
      })
      commit({ ...data, appointments: [fromApiAppointment(created), ...data.appointments] })
    },
    async cancelAppointment(id) {
      if (isDemo) {
        commit(updateAppointment(data, id, 'cancelled'))
        return
      }
      const cancelled = await appointmentApi.cancel(Number(id.replace('appt-', '')))
      commit({
        ...data,
        appointments: data.appointments.map((item) => item.id === id ? fromApiAppointment(cancelled) : item),
      })
    },
    refreshScore: () => refreshScore(),
    async addMetricEntry(metric) {
      if (isDemo) {
        commit(addMetric(data, metric))
        return
      }
      // Re-logging the same metric for the same day updates the server value (idempotent).
      const created = await logApi.create(metric.date, metricTypeMap[metric.type], metric.value)
      setData((current) => {
        const stored: MetricEntry = { ...metric, id: `log-${created.id}` }
        const existing = current.metrics.findIndex((item) => item.type === metric.type && item.date === metric.date)
        return {
          ...current,
          metrics: existing >= 0
            ? current.metrics.map((item, index) => index === existing ? stored : item)
            : [stored, ...current.metrics],
        }
      })
      await refreshScore()
    },
  }), [data, healthScore, lastSaved, loading, error, user, isDemo, refreshScore])

  return <PatientDataContext.Provider value={value}>{children}</PatientDataContext.Provider>
}

export function usePatientData() {
  const context = useContext(PatientDataContext)
  if (!context) throw new Error('usePatientData must be used inside PatientDataProvider')
  return context
}

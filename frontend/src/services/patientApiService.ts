import { apiRequest } from './api'

// --- Types mirroring backend schemas/patient_data.py ---

export type ApiAppointment = {
  id: number
  doctor_name: string
  specialty: string | null
  appointment_date: string // YYYY-MM-DD
  appointment_time: string // HH:MM:SS
  visit_type: 'In person' | 'Video visit'
  location: string | null
  status: 'upcoming' | 'completed' | 'cancelled'
  notes: string | null
}

export type ApiAppointmentIn = {
  doctor_name: string
  specialty?: string | null
  appointment_date: string
  appointment_time: string // HH:MM 24h
  visit_type?: 'In person' | 'Video visit'
  location?: string | null
  notes?: string | null
}

export type ApiHealthLog = {
  id: number
  log_date: string
  metric_type: 'steps' | 'sleep' | 'heart_rate' | 'water' | 'exercise' | 'weight'
  value: number
}

export type ApiMedication = {
  id: number
  name: string
  dosage: string | null
  instructions: string | null
  schedule_time: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

export type ApiMedicationIn = {
  name: string
  dosage?: string | null
  instructions?: string | null
  schedule_time?: string | null
  start_date?: string | null
  end_date?: string | null
}

export type ApiMedicationLog = {
  id: number
  medication_id: number
  log_date: string
  status: 'taken' | 'missed'
}

export type ApiAdherence = {
  taken: number
  missed: number
  adherence_percent: number | null
}

export type ApiMedicalRecord = {
  id: number
  title: string
  record_type: string
  record_date: string | null
  notes: string | null
}

export type ApiPassport = {
  health_id: string
  access_code: string
  is_active: boolean
  created_at: string
}

export type ApiGrant = {
  id: number
  doctor_name: string
  doctor_email: string
  created_at: string
}

export type ApiDoctorPatientSummary = {
  patient_id: number
  patient_name: string
  granted_at: string
  score: number | null
  data_completeness: number | null
  active_medications: number
  upcoming_appointments: number
  last_logs: number
}

export type ApiHealthFactor = {
  key: string
  label: string
  value: number | null
  unit: string
  score: number | null
  status: 'good' | 'fair' | 'attention' | 'no data'
  detail: string
  weight: number
  suggestion: string | null
}

export type ApiHealthScore = {
  score: number | null
  completeness: 'complete' | 'partial' | 'insufficient'
  narrative: string
  factors: ApiHealthFactor[]
  disclaimer: string
  rules_version: string
  bmi: number | null
  bmi_category: string | null
  bmi_note: string
  history: { date: string; score: number }[]
}

export type ApiVerifyAccess = {
  patient_name: string
  accepted: boolean
  summary: ApiDoctorPatientSummary | null
}

function str(value: string | null | undefined, fallback = ''): string {
  return value ?? fallback
}

// --- Services ---

export const appointmentApi = {
  list: () => apiRequest<ApiAppointment[]>('/api/patients/me/appointments'),
  create: (data: ApiAppointmentIn) =>
    apiRequest<ApiAppointment>('/api/patients/me/appointments', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id: number) =>
    apiRequest<ApiAppointment>(`/api/patients/me/appointments/${id}/cancel`, { method: 'POST' }),
}

export const logApi = {
  list: () => apiRequest<ApiHealthLog[]>('/api/patients/me/logs?days=365'),
  create: (log_date: string, metric_type: ApiHealthLog['metric_type'], value: number) =>
    apiRequest<ApiHealthLog>('/api/patients/me/logs', {
      method: 'POST',
      body: JSON.stringify({ log_date, metric_type, value }),
    }),
  remove: (id: number) =>
    apiRequest<void>(`/api/patients/me/logs/${id}`, { method: 'DELETE' }),
}

export const medicationApi = {
  list: (includeInactive = false) =>
    apiRequest<ApiMedication[]>(`/api/patients/me/medications?include_inactive=${includeInactive}`),
  create: (data: ApiMedicationIn) =>
    apiRequest<ApiMedication>('/api/patients/me/medications', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, patch: Partial<ApiMedicationIn & { is_active: boolean }>) =>
    apiRequest<ApiMedication>(`/api/patients/me/medications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  logDay: (id: number, log_date: string, status: 'taken' | 'missed') =>
    apiRequest<ApiMedicationLog>(`/api/patients/me/medications/${id}/log`, {
      method: 'POST',
      body: JSON.stringify({ log_date, status }),
    }),
  adherence: () => apiRequest<ApiAdherence>('/api/patients/me/medications/adherence?days=30'),
}

export const recordApi = {
  list: () => apiRequest<ApiMedicalRecord[]>('/api/patients/me/records'),
  create: (data: { title: string; record_type?: string; record_date?: string | null; notes?: string | null }) =>
    apiRequest<ApiMedicalRecord>('/api/patients/me/records', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id: number) => apiRequest<void>(`/api/patients/me/records/${id}`, { method: 'DELETE' }),
}

export const passportApi = {
  get: () => apiRequest<ApiPassport>('/api/patients/me/passport'),
  rotate: () => apiRequest<ApiPassport>('/api/patients/me/passport/rotate', { method: 'POST' }),
  deactivate: () => apiRequest<ApiPassport>('/api/patients/me/passport/deactivate', { method: 'POST' }),
  link: () => apiRequest<{ link: string; is_active: boolean }>('/api/patients/me/passport/link'),
  qrUrl: () => '/api/patients/me/passport/qr.svg',
}

export const grantApi = {
  list: () => apiRequest<ApiGrant[]>('/api/patients/me/access'),
  create: (doctor_email: string, patient_note?: string | null) =>
    apiRequest<ApiGrant>('/api/patients/me/access', {
      method: 'POST',
      body: JSON.stringify({ doctor_email, patient_note: patient_note || null }),
    }),
  revoke: (id: number) => apiRequest<void>(`/api/patients/me/access/${id}`, { method: 'DELETE' }),
}

export const scoreApi = {
  get: () => apiRequest<ApiHealthScore>('/api/patients/me/health-score'),
}

export const doctorApi = {
  patients: () => apiRequest<ApiDoctorPatientSummary[]>('/api/doctor/patients'),
  patient: (id: number) => apiRequest<ApiDoctorPatientSummary>(`/api/doctor/patients/${id}`),
  verify: (code: string) => apiRequest<ApiVerifyAccess>(`/api/access/verify/${encodeURIComponent(code)}`),
}

// --- Presentation helpers shared by pages ---

export function apptTime(value: string): string {
  const [hourStr, minute] = value.split(':')
  const hour = Number(hourStr)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${minute} ${suffix}`
}

export function initialsFor(name: string): string {
  const parts = name.split(/@|\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? 'C').toUpperCase() + (parts[1]?.[0] ?? 'C').toUpperCase()
}

export function toneFor(name: string): string {
  const tones = ['mint', 'lavender', 'peach', 'sky']
  let hash = 0
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) % 997
  return tones[hash % tones.length]
}

export { str }

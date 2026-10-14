export type AuthUser = {
  id: number
  name: string
  email: string
  role: 'patient' | 'doctor'
  demo?: boolean
}

export type PatientProfile = {
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  bloodType: string
  heightCm: number
  weightKg: number
  phone: string
  email: string
  address: string
  emergencyContact: string
  emergencyPhone: string
  allergies: string
  conditions: string
  medications: string
}

export type Doctor = {
  id: string
  name: string
  specialty: string
  credentials: string
  rating: number
  reviews: number
  experience: number
  nextAvailable: string
  initials: string
  tone: string
  about: string
  visitFee: number
}

export type Appointment = {
  id: string
  doctorId: string
  doctorName: string
  specialty: string
  date: string
  time: string
  type: 'In person' | 'Video visit'
  status: 'upcoming' | 'completed' | 'cancelled'
  location: string
  initials: string
  tone: string
}

export type MetricType = 'steps' | 'sleep' | 'heartRate' | 'weight' | 'water' | 'exercise'

export type MetricEntry = {
  id: string
  type: MetricType
  value: number
  date: string
}

export type HealthComponent = {
  key: 'activity' | 'sleep' | 'vitals' | 'nutrition'
  label: string
  score: number
  note: string
}

export type PatientData = {
  profile: PatientProfile
  appointments: Appointment[]
  metrics: MetricEntry[]
  components: HealthComponent[]
  scoreHistory: { date: string; score: number }[]
}

export type ApiProfile = {
  email: string
  name: string
  phone: string | null
  date_of_birth: string | null
  gender: string | null
  address: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  blood_type: string | null
  height_cm: number | null
  weight_kg: number | null
  allergies: string | null
  conditions: string | null
  medications: string | null
}

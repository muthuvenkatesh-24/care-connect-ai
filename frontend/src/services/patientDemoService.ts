import type { Appointment, Doctor, HealthComponent, MetricEntry, PatientData, PatientProfile } from '../types/patient'

const doctors: Doctor[] = [
  {
    id: 'dr-chen', name: 'Dr. Maya Chen', specialty: 'Primary care', credentials: 'MD, FACP',
    rating: 4.9, reviews: 128, experience: 12, nextAvailable: 'Today, 2:30 PM', initials: 'MC', tone: 'mint',
    about: 'Thoughtful, preventive care for every stage of life.', visitFee: 85,
  },
  {
    id: 'dr-patel', name: 'Dr. Arjun Patel', specialty: 'Cardiology', credentials: 'MD, FACC',
    rating: 4.8, reviews: 96, experience: 15, nextAvailable: 'Tomorrow, 10:00 AM', initials: 'AP', tone: 'lavender',
    about: 'Helping patients build confidence in their heart health.', visitFee: 120,
  },
  {
    id: 'dr-williams', name: 'Dr. Olivia Williams', specialty: 'Dermatology', credentials: 'MD, FAAD',
    rating: 4.9, reviews: 214, experience: 9, nextAvailable: 'Thu, 11:15 AM', initials: 'OW', tone: 'peach',
    about: 'Evidence-led skin care with a personal touch.', visitFee: 95,
  },
  {
    id: 'dr-lee', name: 'Dr. Samuel Lee', specialty: 'Nutrition', credentials: 'RD, PhD',
    rating: 4.7, reviews: 83, experience: 11, nextAvailable: 'Fri, 9:30 AM', initials: 'SL', tone: 'sky',
    about: 'Practical nutrition plans that work in real life.', visitFee: 75,
  },
]

const initialComponents: HealthComponent[] = [
  { key: 'activity', label: 'Activity', score: 78, note: 'A few more active minutes can lift this score.' },
  { key: 'sleep', label: 'Sleep', score: 86, note: 'Your recent sleep routine is looking consistent.' },
  { key: 'vitals', label: 'Vitals', score: 82, note: 'Recent readings are within your usual range.' },
  { key: 'nutrition', label: 'Nutrition', score: 82, note: 'Regular, balanced meals support your progress.' },
]

function isoDate(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().slice(0, 10)
}

export function getDoctors(): Doctor[] {
  return doctors
}

export function createDemoPatientData(name: string, email: string): PatientData {
  const [firstName = 'Alex', ...lastParts] = name.trim().split(/\s+/)
  const lastName = lastParts.join(' ') || 'Morgan'
  const appointments: Appointment[] = [
    {
      id: 'appt-1', doctorId: 'dr-chen', doctorName: 'Dr. Maya Chen', specialty: 'Primary care',
      date: isoDate(2), time: '2:30 PM', type: 'Video visit', status: 'upcoming',
      location: 'Secure video visit', initials: 'MC', tone: 'mint',
    },
    {
      id: 'appt-2', doctorId: 'dr-patel', doctorName: 'Dr. Arjun Patel', specialty: 'Cardiology',
      date: isoDate(-18), time: '10:00 AM', type: 'In person', status: 'completed',
      location: 'Northside Health · Suite 204', initials: 'AP', tone: 'lavender',
    },
  ]
  const metrics: MetricEntry[] = [
    { id: 'metric-1', type: 'steps', value: 7240, date: isoDate(-1) },
    { id: 'metric-2', type: 'sleep', value: 7.7, date: isoDate(-1) },
    { id: 'metric-3', type: 'heartRate', value: 68, date: isoDate(0) },
    { id: 'metric-4', type: 'weight', value: 68.4, date: isoDate(-2) },
  ]
  const scoreHistory = [
    { date: '6 weeks ago', score: 73 }, { date: '5 weeks ago', score: 75 },
    { date: '4 weeks ago', score: 74 }, { date: '3 weeks ago', score: 78 },
    { date: '2 weeks ago', score: 79 }, { date: 'This week', score: 82 },
  ]
  return {
    profile: {
      firstName, lastName, dateOfBirth: '1992-06-14', gender: 'Prefer not to say', bloodType: 'O+',
      heightCm: 171, weightKg: 68.4, phone: '(415) 555-0184', email,
      address: '245 Willow Street, San Francisco, CA 94102',
      emergencyContact: 'Jamie Morgan', emergencyPhone: '(415) 555-0122',
      allergies: 'Penicillin', conditions: 'Seasonal allergies', medications: 'Loratadine · 10 mg',
    },
    appointments,
    metrics,
    components: initialComponents,
    scoreHistory,
  }
}

function storageKey(userId: number) {
  return `care-connect-patient-demo-${userId}`
}

export const patientDemoService = {
  get(userId: number, name: string, email: string): PatientData {
    try {
      const value = localStorage.getItem(storageKey(userId))
      if (value) return JSON.parse(value) as PatientData
    } catch {
      // A fresh in-memory demo state is still usable if browser storage is unavailable.
    }
    return createDemoPatientData(name, email)
  },
  save(userId: number, data: PatientData): boolean {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(data))
      return true
    } catch {
      return false
    }
  },
  clear(userId: number) {
    localStorage.removeItem(storageKey(userId))
  },
}

export function addAppointment(data: PatientData, appointment: Appointment): PatientData {
  return { ...data, appointments: [appointment, ...data.appointments] }
}

export function replaceProfile(data: PatientData, profile: PatientProfile): PatientData {
  return { ...data, profile }
}

export function addMetric(data: PatientData, metric: MetricEntry): PatientData {
  const components = data.components.map((component) => {
    if (metric.type === 'steps' && component.key === 'activity') {
      return { ...component, score: Math.min(100, Math.max(30, Math.round((metric.value / 8500) * 100))) }
    }
    if (metric.type === 'sleep' && component.key === 'sleep') {
      return { ...component, score: Math.min(100, Math.max(30, Math.round(100 - Math.abs(8 - metric.value) * 12))) }
    }
    if (metric.type === 'heartRate' && component.key === 'vitals') {
      return { ...component, score: Math.min(100, Math.max(30, Math.round(100 - Math.abs(70 - metric.value) * 1.5))) }
    }
    return component
  })
  const score = Math.round(components.reduce((sum, component) => sum + component.score, 0) / components.length)
  return {
    ...data,
    metrics: [metric, ...data.metrics],
    components,
    scoreHistory: [...data.scoreHistory.slice(1), { date: 'This week', score }],
  }
}

export function updateAppointment(data: PatientData, id: string, status: Appointment['status']): PatientData {
  return { ...data, appointments: data.appointments.map((item) => item.id === id ? { ...item, status } : item) }
}

export function scoreFor(components: HealthComponent[]): number {
  return Math.round(components.reduce((sum, component) => sum + component.score, 0) / components.length)
}

export function metricLabel(type: MetricEntry['type']): string {
  return ({ steps: 'Steps', sleep: 'Sleep', heartRate: 'Resting heart rate', weight: 'Weight' })[type]
}

export function metricUnit(type: MetricEntry['type']): string {
  return ({ steps: 'steps', sleep: 'hours', heartRate: 'bpm', weight: 'kg' })[type]
}

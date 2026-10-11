import type { ApiProfile, PatientProfile } from '../types/patient'
import { apiRequest } from './api'

function toApiPayload(profile: PatientProfile): Record<string, unknown> {
  return {
    phone: profile.phone || null,
    date_of_birth: profile.dateOfBirth || null,
    gender: profile.gender || null,
    address: profile.address || null,
    emergency_contact: profile.emergencyContact || null,
    emergency_phone: profile.emergencyPhone || null,
    blood_type: profile.bloodType || null,
    height_cm: Number.isFinite(profile.heightCm) && profile.heightCm > 0 ? profile.heightCm : null,
    weight_kg: Number.isFinite(profile.weightKg) && profile.weightKg > 0 ? profile.weightKg : null,
    allergies: profile.allergies || null,
    conditions: profile.conditions || null,
    medications: profile.medications || null,
  }
}

// Email and name live on the users table and are not part of the editable profile payload.
function toProfile(api: ApiProfile, fallbackEmail: string): PatientProfile {
  return {
    firstName: api.name.split(/\s+/)[0] ?? '',
    lastName: api.name.split(/\s+/).slice(1).join(' ') || '—',
    email: api.email || fallbackEmail,
    dateOfBirth: api.date_of_birth ?? '',
    gender: api.gender ?? 'Prefer not to say',
    bloodType: api.blood_type ?? 'Unknown',
    heightCm: api.height_cm ?? 0,
    weightKg: api.weight_kg ?? 0,
    phone: api.phone ?? '',
    address: api.address ?? '',
    emergencyContact: api.emergency_contact ?? '',
    emergencyPhone: api.emergency_phone ?? '',
    allergies: api.allergies ?? '',
    conditions: api.conditions ?? '',
    medications: api.medications ?? '',
  }
}

export const profileService = {
  get: (fallbackEmail: string) =>
    apiRequest<ApiProfile>('/api/patients/me/profile').then((api) => toProfile(api, fallbackEmail)),
  update: (profile: PatientProfile) =>
    apiRequest<ApiProfile>('/api/patients/me/profile', {
      method: 'PUT',
      body: JSON.stringify(toApiPayload(profile)),
    }).then((api) => toProfile(api, profile.email)),
}

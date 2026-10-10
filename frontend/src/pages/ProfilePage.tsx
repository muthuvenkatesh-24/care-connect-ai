import { useEffect, useState } from 'react'
import { Avatar, PageHeader } from '../components/UI'
import { Icon } from '../components/Icon'
import { usePatientData } from '../patient/PatientDataProvider'
import type { PatientProfile } from '../types/patient'

type ProfileTab = 'personal' | 'health'

export function ProfilePage() {
  const { data, saveProfile, lastSaved } = usePatientData()
  const [draft, setDraft] = useState(data.profile)
  const [tab, setTab] = useState<ProfileTab>('personal')
  const [saved, setSaved] = useState(false)

  useEffect(() => setDraft(data.profile), [data.profile])

  function set<K extends keyof PatientProfile>(key: K, value: PatientProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  function save() {
    saveProfile(draft)
    setSaved(true)
  }

  return (
    <>
      <PageHeader eyebrow="YOUR CARE DETAILS" title="My profile" description="Keep your health information current so your care team can get to know you." />
      <div className="profile-intro surface-card">
        <Avatar initials={`${draft.firstName[0] ?? ''}${draft.lastName[0] ?? ''}`} size="large" tone="mint" />
        <div><h2>{draft.firstName} {draft.lastName}</h2><p>{draft.email}</p><span className="profile-member"><Icon name="shield" size={14} /> Patient profile</span></div>
        <button className="button button-secondary profile-edit-shortcut" onClick={() => { setTab('personal'); document.getElementById('profile-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><Icon name="edit" size={15} /> Edit details</button>
      </div>
      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        <button role="tab" aria-selected={tab === 'personal'} className={tab === 'personal' ? 'profile-tab-active' : ''} onClick={() => setTab('personal')}>Personal information</button>
        <button role="tab" aria-selected={tab === 'health'} className={tab === 'health' ? 'profile-tab-active' : ''} onClick={() => setTab('health')}>Health information</button>
      </div>
      <form id="profile-form" className="surface-card profile-form" onSubmit={(event) => { event.preventDefault(); save() }}>
        {tab === 'personal' ? <>
          <div className="form-section-heading"><div><h2>Personal details</h2><p>Basic information for your patient profile.</p></div><span className="private-label"><Icon name="shield" size={14} /> Private</span></div>
          <div className="profile-fields">
            <label>First name<input value={draft.firstName} onChange={(event) => set('firstName', event.target.value)} required maxLength={60} /></label>
            <label>Last name<input value={draft.lastName} onChange={(event) => set('lastName', event.target.value)} required maxLength={60} /></label>
            <label>Email address<input type="email" value={draft.email} onChange={(event) => set('email', event.target.value)} required /></label>
            <label>Phone number<input type="tel" value={draft.phone} onChange={(event) => set('phone', event.target.value)} /></label>
            <label>Date of birth<input type="date" value={draft.dateOfBirth} onChange={(event) => set('dateOfBirth', event.target.value)} /></label>
            <label>Gender<select value={draft.gender} onChange={(event) => set('gender', event.target.value)}><option>Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary</option><option>Self describe</option></select></label>
            <label className="field-span-2">Home address<input value={draft.address} onChange={(event) => set('address', event.target.value)} /></label>
          </div>
          <div className="form-divider" />
          <div className="form-section-heading"><div><h2>Emergency contact</h2><p>Someone we can reach if you need support.</p></div></div>
          <div className="profile-fields">
            <label>Contact name<input value={draft.emergencyContact} onChange={(event) => set('emergencyContact', event.target.value)} /></label>
            <label>Contact phone<input type="tel" value={draft.emergencyPhone} onChange={(event) => set('emergencyPhone', event.target.value)} /></label>
          </div>
        </> : <>
          <div className="form-section-heading"><div><h2>Health background</h2><p>Details that help personalize your care conversations.</p></div><span className="private-label"><Icon name="shield" size={14} /> Private</span></div>
          <div className="profile-fields">
            <label>Blood type<select value={draft.bloodType} onChange={(event) => set('bloodType', event.target.value)}><option>Unknown</option>{['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'].map((type) => <option key={type}>{type}</option>)}</select></label>
            <label>Height (cm)<input type="number" min="50" max="250" value={draft.heightCm} onChange={(event) => set('heightCm', Number(event.target.value))} /></label>
            <label>Weight (kg)<input type="number" min="1" max="400" step="0.1" value={draft.weightKg} onChange={(event) => set('weightKg', Number(event.target.value))} /></label>
            <label className="field-span-2">Allergies<textarea rows={3} value={draft.allergies} onChange={(event) => set('allergies', event.target.value)} placeholder="List any known allergies" /></label>
            <label className="field-span-2">Ongoing conditions<textarea rows={3} value={draft.conditions} onChange={(event) => set('conditions', event.target.value)} placeholder="Conditions you'd like your care team to know about" /></label>
            <label className="field-span-2">Current medications<textarea rows={3} value={draft.medications} onChange={(event) => set('medications', event.target.value)} placeholder="Medication and dosage" /></label>
          </div>
        </>}
        <div className="profile-form-footer">
          <span className={saved ? 'save-confirmation' : 'save-hint'}>{saved ? <><Icon name="check" size={15} /> {lastSaved === 'browser' ? 'Saved in this browser' : 'Updated for this session'}</> : 'Changes stay in your browser demo.'}</span>
          <button type="submit" className="button button-primary"><Icon name="check" size={16} /> Save changes</button>
        </div>
      </form>
    </>
  )
}

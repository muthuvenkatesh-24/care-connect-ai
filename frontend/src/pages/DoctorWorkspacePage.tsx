import { useEffect, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Avatar, EmptyState, PageHeader, SectionTitle } from '../components/UI'
import { doctorApi, toneFor, type ApiDoctorPatientSummary, type ApiVerifyAccess } from '../services/patientApiService'

function completenessLabel(percent: number | null) {
  if (percent == null) return 'Unknown'
  if (percent >= 100) return 'Complete data'
  if (percent >= 60) return 'Partial data'
  return 'Sparse data'
}

function VerifyDialog() {
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApiVerifyAccess | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setResult(null)
    try {
      setResult(await doctorApi.verify(code.trim()))
    } catch (reason) {
      // A 404 from the API means the QR code is invalid, inactive, or unknown.
      setError(reason instanceof Error ? reason.message : 'That access code could not be verified.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="surface-card verify-card">
      <SectionTitle title="Verify a patient's QR access code" />
      <form className="provider-filters" onSubmit={submit}>
        <label className="search-control">
          <Icon name="search" size={17} />
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Paste the code scanned from the QR" required />
        </label>
        <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Verifying…' : 'Verify code'}</button>
      </form>
      {error && <div className="inline-error"><Icon name="shield" size={15} /><span>{error}</span></div>}
      {result && (
        <div className="verify-result">
          <p><strong>{result.patient_name}</strong> — {result.accepted ? 'this patient has granted you summary access.' : 'this patient has NOT granted you access. Only the name is shown — ask the patient to grant you access separately.'}</p>
          {result.summary && (
            <div className="upcoming-list">
              <div className="upcoming-item"><div className="upcoming-info"><strong>Wellness score</strong><span>{result.summary.score ?? 'Not enough data'}</span></div></div>
              <div className="upcoming-item"><div className="upcoming-info"><strong>Data completeness</strong><span>{completenessLabel(result.summary.data_completeness)}</span></div></div>
              <div className="upcoming-item"><div className="upcoming-info"><strong>Active medications</strong><span>{result.summary.active_medications}</span></div></div>
              <div className="upcoming-item"><div className="upcoming-info"><strong>Upcoming visit records</strong><span>{result.summary.upcoming_appointments}</span></div></div>
              <div className="upcoming-item"><div className="upcoming-info"><strong>Days since latest log</strong><span>{result.summary.last_logs}</span></div></div>
            </div>
          )}
        </div>
      )}
      <p className="demo-inline-note">The QR verify flow only ever reveals the patient's name and — with their explicit grant — the restricted aggregate summary. No logs, notes, or records are exchanged through QR scanning. Sign-in is required before any verification.</p>
    </section>
  )
}

export function DoctorWorkspacePage() {
  const [patients, setPatients] = useState<ApiDoctorPatientSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setPatients(await doctorApi.patients())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load your patient list.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return <>
    <PageHeader eyebrow="DOCTOR SPACE" title="Patient summaries" description="A restricted, consent-based view — only patients who granted you access appear here." />
    <VerifyDialog />

    <section className="surface-card">
      <SectionTitle title="Patients who shared their summary" action={<span className="small-muted">{patients?.length ?? 0} granted</span>} />
      {loading ? <div className="mini-empty">Loading your granted patients…</div>
        : error ? <div className="inline-error"><Icon name="shield" size={15} /><span>{error}</span><button className="button button-secondary button-small" onClick={() => void load()}>Retry</button></div>
        : patients && patients.length
          ? <div className="doctor-grid">{patients.map((patient) => <article className="doctor-card doctor-card-summary" key={patient.patient_id}>
            <div className="doctor-card-top"><Avatar initials={patient.patient_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()} tone={toneFor(patient.patient_name)} size="large" /></div>
            <h3>{patient.patient_name}</h3>
            <p className="doctor-credentials">Granted {new Date(patient.granted_at).toLocaleDateString()}</p>
            <div className="verify-result">
              <div className="upcoming-list">
                <div className="upcoming-item"><div className="upcoming-info"><strong>Wellness score</strong><span>{patient.score ?? 'Not enough data'}</span></div></div>
                <div className="upcoming-item"><div className="upcoming-info"><strong>Data completeness</strong><span>{completenessLabel(patient.data_completeness)}</span></div></div>
                <div className="upcoming-item"><div className="upcoming-info"><strong>Active medications</strong><span>{patient.active_medications}</span></div></div>
                <div className="upcoming-item"><div className="upcoming-info"><strong>Upcoming visit records</strong><span>{patient.upcoming_appointments}</span></div></div>
                <div className="upcoming-item"><div className="upcoming-info"><strong>Days since latest log</strong><span>{patient.last_logs}</span></div></div>
              </div>
            </div>
          </article>)}</div>
          : <EmptyState icon="shield" title="No patients have granted you access yet" description="When a patient shares their restricted summary, they will appear here. A doctor cannot read arbitrary patient data by changing an ID — consent is always server-verified." />}
    </section>
  </>
}

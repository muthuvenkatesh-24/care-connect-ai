import { useEffect, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Modal, PageHeader, SectionTitle, EmptyState } from '../components/UI'
import { usePatientData } from '../patient/PatientDataProvider'
import {
  grantApi,
  passportApi,
  recordApi,
  type ApiGrant,
  type ApiMedicalRecord,
  type ApiPassport,
} from '../services/patientApiService'

const RECORD_TYPES = ['Lab report', 'Prescription', 'Imaging', 'Visit summary', 'Other']

function AddRecordDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (data: { title: string; record_type: string; record_date: string | null; notes: string | null }) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [recordType, setRecordType] = useState(RECORD_TYPES[0])
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onAdd({ title: title.trim(), record_type: recordType, record_date: recordDate || null, notes: notes.trim() || null })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The record could not be saved.')
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return <Modal title="Add a medical record" description="Keep an index of your health documents — the details stay private to your account." onClose={onClose}>
    <form className="metric-entry-form" onSubmit={submit}>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} required autoFocus /></label>
      <div className="field-row">
        <label>Type<select value={recordType} onChange={(event) => setRecordType(event.target.value)}>{RECORD_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Date<input type="date" value={recordDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setRecordDate(event.target.value)} /></label>
      </div>
      <label>Notes<input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} /></label>
      {error && <div className="inline-error"><Icon name="shield" size={15} /><span>{error}</span></div>}
      <div className="booking-note"><Icon name="shield" size={16} /><span>This version stores record metadata only. Secure file upload for PDFs and scans is a planned enhancement, not yet available.</span></div>
      <div className="modal-footer inline-modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : <>Add record <Icon name="plus" size={15} /></>}</button></div>
    </form>
  </Modal>
}

function GrantDoctorDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (email: string, note: string | null) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onAdd(email.trim(), note.trim() || null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The grant could not be created.')
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return <Modal title="Give a doctor limited access" description="Share a restricted wellness summary — never your raw logs or notes." onClose={onClose}>
    <form className="metric-entry-form" onSubmit={submit}>
      <label>Doctor's account email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus /></label>
      <label>Note to the doctor (optional)<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} /></label>
      {error && <div className="inline-error"><Icon name="shield" size={15} /><span>{error}</span></div>}
      <div className="booking-note"><Icon name="shield" size={16} /><span>The doctor only sees your name, overall wellness score, completeness, active medication count, and upcoming visit count. You can revoke this at any time.</span></div>
      <div className="modal-footer inline-modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : <>Grant summary access <Icon name="arrow" size={15} /></>}</button></div>
    </form>
  </Modal>
}

export function PassportPage() {
  const { mode } = usePatientData()
  const [passport, setPassport] = useState<ApiPassport | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [records, setRecords] = useState<ApiMedicalRecord[]>([])
  const [grants, setGrants] = useState<ApiGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'record' | 'grant' | null>(null)
  const [qrOpen, setQrOpen] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [passportData, linkData, recordList, grantList] = await Promise.all([
        passportApi.get(),
        passportApi.link(),
        recordApi.list(),
        grantApi.list(),
      ])
      setPassport(passportData)
      setLink(linkData.link)
      setRecords(recordList)
      setGrants(grantList)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load your passport.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function rotate() {
    setActionError(null)
    try {
      const updated = await passportApi.rotate()
      setPassport(updated)
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Rotating the access code failed.')
    }
  }

  async function toggleActive() {
    setActionError(null)
    try {
      const updated = passport?.is_active ? await passportApi.deactivate() : await passportApi.rotate()
      setPassport(updated)
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'The passport could not be updated.')
    }
  }

  async function addRecord(data: { title: string; record_type: string; record_date: string | null; notes: string | null }) {
    const created = await recordApi.create(data)
    setRecords((current) => [created, ...current])
    setDialog(null)
  }

  async function removeRecord(id: number) {
    if (!window.confirm('Delete this record entry?')) return
    setActionError(null)
    try {
      await recordApi.remove(id)
      setRecords((current) => current.filter((item) => item.id !== id))
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'The record could not be deleted.')
    }
  }

  async function addGrant(email: string, note: string | null) {
    const created = await grantApi.create(email, note)
    setGrants((current) => [created, ...current])
    setDialog(null)
  }

  async function revokeGrant(id: number) {
    if (!window.confirm(`Revoke this doctor's summary access?`)) return
    setActionError(null)
    try {
      await grantApi.revoke(id)
      setGrants((current) => current.filter((item) => item.id !== id))
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'The grant could not be revoked.')
    }
  }

  return <>
    <PageHeader eyebrow="YOUR PORTABLE HEALTH IDENTITY" title="Health Passport" description="A unique health ID and an opaque QR code that doctors can verify with your consent." />

    <section className="surface-card passport-card">
      <div className="section-title"><div><h2>Your Health Passport</h2><p>{mode === 'demo' ? 'Demo mode: passport data is illustrative.' : 'Passport details are saved to your account.'}</p></div></div>
      {loading ? <div className="mini-empty">Loading your passport…</div>
        : error ? <div className="inline-error"><Icon name="shield" size={15} /><span>{error}</span><button className="button button-secondary button-small" onClick={() => void load()}>Retry</button></div>
        : passport && (
          <div className="passport-grid">
            <div className="passport-id">
              <span className="small-muted">HEALTH ID</span>
              <strong>{passport.health_id}</strong>
            </div>
            <div className="passport-actions">
              <span className={`status-pill ${passport.is_active ? 'status-upcoming' : 'status-cancelled'}`}><i /> {passport.is_active ? 'QR active' : 'QR deactivated'}</span>
              <button className="button button-small button-secondary" onClick={() => setQrOpen(true)} disabled={!passport.is_active}><Icon name="shield" size={15} /> Show QR</button>
              <button className="button button-small button-secondary" onClick={() => void rotate()}>Rotate code</button>
              <button className="quiet-link button-as-link" onClick={() => void toggleActive()}>{passport.is_active ? 'Deactivate' : 'Re-activate (new code)'}</button>
            </div>
            {actionError && <div className="inline-error"><Icon name="shield" size={15} /><span>{actionError}</span></div>}
          </div>
        )}
      <p className="demo-inline-note">The QR code encodes only an opaque, revocable access code — no medical history travels in it. Scanning leads a signed-in doctor to a consent-gated summary; anyone without an active grant from you sees nothing. Rotating the code instantly invalidates every copy of the old QR.</p>
    </section>

    <section className="surface-card">
      <SectionTitle title="Doctors with summary access" action={<button className="button button-secondary button-small" onClick={() => setDialog('grant')}><Icon name="plus" size={15} /> Grant access</button>} />
      {grants.length ? <div className="activity-list">{grants.map((grant) => <div className="activity-item" key={grant.id}>
        <span className="activity-icon activity-icon-appointment"><Icon name="user" size={17} /></span>
        <div><strong>{grant.doctor_name}</strong><span>{grant.doctor_email}</span></div>
        <button className="quiet-link button-as-link" onClick={() => void revokeGrant(grant.id)}>Revoke</button>
      </div>)}</div>
        : <EmptyState icon="shield" title="No doctors have access" description="Grant summary access to a doctor by their account email, and revoke it whenever you like." action={<button className="button button-primary" onClick={() => setDialog('grant')}><Icon name="plus" size={16} /> Grant access</button>} />}
    </section>

    <section className="surface-card">
      <SectionTitle title="Medical records" action={<button className="button button-secondary button-small" onClick={() => setDialog('record')}><Icon name="plus" size={15} /> Add record</button>} />
      {records.length ? <div className="activity-list">{records.map((record) => <div className="activity-item" key={record.id}>
        <span className="activity-icon activity-icon-steps"><Icon name="heart" size={17} /></span>
        <div><strong>{record.title}</strong><span>{record.record_type}{record.record_date ? ` · ${record.record_date}` : ''}{record.notes ? ` · ${record.notes}` : ''}</span></div>
        <button className="quiet-link button-as-link" onClick={() => void removeRecord(record.id)}>Delete</button>
      </div>)}</div>
        : <EmptyState icon="calendar" title="No records yet" description="Add titles, types, and dates for your lab reports, prescriptions, and visit summaries." action={<button className="button button-primary" onClick={() => setDialog('record')}><Icon name="plus" size={16} /> Add record</button>} />}
    </section>
    {qrOpen && passport?.is_active && (
      <Modal title="Your passport QR" description="This code contains only your opaque access code." onClose={() => setQrOpen(false)}>
        <div className="passport-qr-wrap">
          <img src={passportApi.qrUrl()} alt="Health Passport QR code" width={220} height={220} />
          {link && <code className="passport-link">{link}</code>}
          <p className="small-muted">Show this QR only to a doctor you trust, and rotate the code afterwards to revoke copies.</p>
        </div>
      </Modal>
    )}
    {dialog === 'record' && <AddRecordDialog onClose={() => setDialog(null)} onAdd={addRecord} />}
    {dialog === 'grant' && <GrantDoctorDialog onClose={() => setDialog(null)} onAdd={addGrant} />}
  </>
}

import { useEffect, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Modal, PageHeader, SectionTitle, EmptyState } from '../components/UI'
import { usePatientData } from '../patient/PatientDataProvider'
import { medicationApi, type ApiMedication, type ApiAdherence } from '../services/patientApiService'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function AddMedicationDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (data: { name: string; dosage: string | null; instructions: string | null; schedule_time: string | null; start_date: string | null; end_date: string | null }) => Promise<void> }) {
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [schedule, setSchedule] = useState('')
  const [instructions, setInstructions] = useState('')
  const [start, setStart] = useState(todayStr())
  const [end, setEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onAdd({
        name: name.trim(),
        dosage: dosage.trim() || null,
        instructions: instructions.trim() || null,
        schedule_time: schedule || null,
        start_date: start || null,
        end_date: end || null,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The medication could not be saved.')
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return <Modal title="Add a medication" description="Track what you take and when, so adherence stays visible." onClose={onClose}>
    <form className="metric-entry-form" onSubmit={submit}>
      <label>Medicine name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoFocus /></label>
      <div className="field-row">
        <label>Dose (e.g. 10 mg)<input value={dosage} onChange={(event) => setDosage(event.target.value)} maxLength={80} /></label>
        <label>Daily time<input type="time" value={schedule} onChange={(event) => setSchedule(event.target.value)} /></label>
      </div>
      <div className="field-row">
        <label>Start date<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label>End date (optional)<input type="date" value={end} min={start || undefined} onChange={(event) => setEnd(event.target.value)} /></label>
      </div>
      <label>Instructions<input value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={300} placeholder="e.g. with breakfast" /></label>
      {error && <div className="inline-error"><Icon name="shield" size={15} /><span>{error}</span></div>}
      <div className="booking-note"><Icon name="shield" size={16} /><span>This records what your clinician prescribed for your own tracking. Never change a prescribed dose on your own — ask your doctor or pharmacist.</span></div>
      <div className="modal-footer inline-modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : <>Add medication <Icon name="plus" size={15} /></>}</button></div>
    </form>
  </Modal>
}

function scheduleLabel(medication: ApiMedication) {
  const bits: string[] = []

  if (medication.schedule_time) {
    const [hourStr, minute] = medication.schedule_time.split(':')
    const hour = Number(hourStr)
    const label = `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`
    bits.push(`daily at ${label}`)
  }
  if (medication.start_date) bits.push(`from ${medication.start_date}`)
  if (medication.end_date) bits.push(`until ${medication.end_date}`)
  return bits.join(' · ')
}

export function MedicationsPage() {
  const { mode } = usePatientData()
  const [medications, setMedications] = useState<ApiMedication[]>([])
  const [adherence, setAdherence] = useState<ApiAdherence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [list, stats] = await Promise.all([medicationApi.list(showInactive), medicationApi.adherence()])
      setMedications(list)
      setAdherence(stats)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load your medications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [showInactive]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addMedication(data: { name: string; dosage: string | null; instructions: string | null; schedule_time: string | null; start_date: string | null; end_date: string | null }) {
    const created = await medicationApi.create(data)
    setMedications((current) => showInactive ? [...current, created] : [created, ...current])
    setDialogOpen(false)
  }

  async function logDay(medication: ApiMedication, status: 'taken' | 'missed') {
    setLogError(null)
    try {
      await medicationApi.logDay(medication.id, todayStr(), status)
      await load()
    } catch (reason) {
      setLogError(reason instanceof Error ? reason.message : 'The adherence entry could not be saved.')
    }
  }

  async function toggleActive(medication: ApiMedication) {
    setLogError(null)
    try {
      const updated = await medicationApi.update(medication.id, { is_active: !medication.is_active })
      setMedications((current) => current.map((item) => item.id === updated.id && !showInactive ? null : item.id === updated.id ? updated : item).filter(Boolean) as ApiMedication[])
    } catch (reason) {
      setLogError(reason instanceof Error ? reason.message : 'The medication could not be updated.')
    }
  }

  const activeCount = medications.filter((item) => item.is_active).length

  return <>
    <PageHeader eyebrow="YOUR DAILY ROUTINE" title="Medications" description="Keep your schedule and adherence in one clear view." action={<button className="button button-primary" onClick={() => setDialogOpen(true)}><Icon name="plus" size={17} /> Add medication</button>} />

    {mode === 'live' && adherence && (
      <section className="surface-card medications-adherence-card">
        <SectionTitle title="Last 30 days" action={<span className="small-muted">{adherence.adherence_percent != null ? `${adherence.adherence_percent}% adherence` : 'No doses logged yet'}</span>} />
        <div className="adherence-stats">
          <div className="adherence-stat"><strong>{adherence.taken}</strong><span>taken</span></div>
          <div className="adherence-stat adherence-missed"><strong>{adherence.missed}</strong><span>missed</span></div>
        </div>
      </section>
    )}

    <section className="surface-card visits-section-card">
      <div className="section-title"><div><h2>Your medications</h2><p>{activeCount} active · {medications.length} total</p></div>
        <label className="small-muted toggle-inactive"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /> Show stopped</label>
      </div>
      {logError && <div className="inline-error"><Icon name="shield" size={15} /><span>{logError}</span></div>}
      {loading ? <div className="mini-empty">Loading medications…</div>
        : error ? <div className="inline-error"><Icon name="shield" size={15} /><span>{error}</span><button className="button button-secondary button-small" onClick={() => void load()}>Retry</button></div>
        : medications.length === 0
          ? <EmptyState icon="heart" title={showInactive ? 'No medications recorded' : 'No active medications'} description="Add what you take and when, and daily adherence becomes easy to track." action={<button className="button button-primary" onClick={() => setDialogOpen(true)}><Icon name="plus" size={16} /> Add medication</button>} />
          : <div className="visit-list">{medications.map((medication) => <article className={`visit-card medication-card ${medication.is_active ? '' : 'medication-inactive'}`} key={medication.id}>
            <div className="visit-main medication-main">
              <div className="visit-person"><span className="activity-icon activity-icon-steps"><Icon name="heart" size={18} /></span>
                <div><h3>{medication.name}</h3><p>{medication.dosage ?? 'Dose not recorded'}</p></div>
              </div>
              <div className="visit-details"><span><Icon name="clock" size={15} /> {scheduleLabel(medication) || 'No schedule set'}</span>{medication.instructions && <span><Icon name="user" size={15} /> {medication.instructions}</span>}</div>
            </div>
            <div className="visit-actions">
              {medication.is_active
                ? <>
                  <span className="status-pill status-upcoming"><i /> Active</span>
                  <button className="button button-small button-secondary" onClick={() => void logDay(medication, 'taken')}>Taken today</button>
                  <button className="button button-small button-secondary" onClick={() => void logDay(medication, 'missed')}>Missed today</button>
                  <button className="quiet-link button-as-link" onClick={() => void toggleActive(medication)}>Stop tracking</button>
                </>
                : <>
                  <span className="status-pill status-cancelled">{showInactive ? 'Stopped' : <i />}</span>
                  <button className="quiet-link button-as-link" onClick={() => void toggleActive(medication)}>Re-activate</button>
                </>}
            </div>
          </article>)}</div>}
      <p className="demo-inline-note">These are your own tracking records saved to your CareConnect account. They are not prescriptions and do not send reminders — speak with your doctor or pharmacist before making changes to any medication.</p>
    </section>
    {dialogOpen && <AddMedicationDialog onClose={() => setDialogOpen(false)} onAdd={addMedication} />}
  </>
}

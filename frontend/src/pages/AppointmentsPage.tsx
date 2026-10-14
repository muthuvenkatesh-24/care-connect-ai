import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, EmptyState, Modal, PageHeader } from '../components/UI'
import { Icon } from '../components/Icon'
import { usePatientData } from '../patient/PatientDataProvider'
import { getDoctors } from '../services/patientDemoService'
import type { Appointment, Doctor } from '../types/patient'

type VisitTab = 'upcoming' | 'past'

function BookingDialog({ doctor, mode, onClose, onBook }: { doctor?: Doctor; mode: 'demo' | 'live'; onClose: () => void; onBook: (appointment: Appointment) => Promise<void> }) {
  const doctors = getDoctors()
  const [selectedId, setSelectedId] = useState(doctor?.id ?? doctors[0].id)
  const [date, setDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10) })
  const [time, setTime] = useState('10:00 AM')
  const [type, setType] = useState<Appointment['type']>('Video visit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedDoctor = doctors.find((item) => item.id === selectedId) ?? doctors[0]

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onBook({
        id: `appt-${Date.now()}`, doctorId: selectedDoctor.id, doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty, date, time, type, status: 'upcoming',
        location: type === 'Video visit' ? 'Secure video visit' : 'Clinic address on file',
        initials: selectedDoctor.initials, tone: selectedDoctor.tone,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The booking could not be saved.')
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return <Modal title="Book an appointment" description="Choose a provider and a time that works for you." onClose={onClose}>
    <form className="booking-form" onSubmit={submit}>
      <label>Choose a provider<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{doctors.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.specialty}</option>)}</select></label>
      <div className="booking-doctor-summary"><Avatar initials={selectedDoctor.initials} tone={selectedDoctor.tone} /><div><strong>{selectedDoctor.name}</strong><span>{selectedDoctor.credentials} · {selectedDoctor.experience} years experience</span></div><strong className="booking-fee">${selectedDoctor.visitFee}</strong></div>
      <div className="field-row"><label>Date<input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required /></label><label>Time<select value={time} onChange={(event) => setTime(event.target.value)}>{['9:00 AM', '10:00 AM', '11:15 AM', '1:00 PM', '2:30 PM', '3:45 PM'].map((slot) => <option key={slot}>{slot}</option>)}</select></label></div>
      <label>Visit type<select value={type} onChange={(event) => setType(event.target.value as Appointment['type'])}><option>Video visit</option><option>In person</option></select></label>
      {error && <div className="inline-error"><Icon name="shield" size={15} /><span>{error}</span></div>}
      <div className="booking-note"><Icon name="shield" size={16} /><span>{mode === 'live'
        ? 'This creates a patient-managed appointment record in your CareConnect account. It is not sent to the clinic and does not confirm a slot with the provider.'
        : 'This demo booking stays in this browser. It is not sent to a clinic.'}</span></div>
      <div className="modal-footer inline-modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : <>Confirm appointment <Icon name="arrow" size={15} /></>}</button></div>
    </form>
  </Modal>
}

function VisitCard({ appointment, onCancel }: { appointment: Appointment; onCancel?: (id: string) => void }) {
  return <article className="visit-card">
    <div className="visit-date-block"><span>{new Date(`${appointment.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span><strong>{new Date(`${appointment.date}T12:00:00`).toLocaleDateString(undefined, { day: '2-digit' })}</strong><small>{new Date(`${appointment.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</small></div>
    <div className="visit-main"><div className="visit-person"><Avatar initials={appointment.initials} tone={appointment.tone} size="large" /><div><h3>{appointment.doctorName}</h3><p>{appointment.specialty} <span>·</span> {appointment.type}</p></div></div>
      <div className="visit-details"><span><Icon name="clock" size={15} /> {appointment.time}</span><span><Icon name={appointment.type === 'Video visit' ? 'video' : 'pin'} size={15} /> {appointment.location}</span></div>
    </div>
    <div className="visit-actions">{appointment.status === 'upcoming' ? <><span className="status-pill status-upcoming"><i /> Upcoming</span><button className="button button-small button-secondary" onClick={() => onCancel?.(appointment.id)}>Cancel visit</button></> : <span className={`status-pill ${appointment.status === 'completed' ? 'status-completed' : 'status-cancelled'}`}>{appointment.status === 'completed' ? 'Completed' : 'Cancelled'}</span>}</div>
  </article>
}

export function AppointmentsPage() {
  const { data, mode, bookAppointment, cancelAppointment } = usePatientData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<VisitTab>('upcoming')
  const [specialty, setSpecialty] = useState('All specialties')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | undefined>()
  const [bookingOpen, setBookingOpen] = useState(searchParams.get('book') === '1')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const doctors = getDoctors()
  const specialties = ['All specialties', ...new Set(doctors.map((doctor) => doctor.specialty))]
  const filteredDoctors = useMemo(() => doctors.filter((doctor) =>
    (specialty === 'All specialties' || doctor.specialty === specialty)
    && `${doctor.name} ${doctor.specialty}`.toLowerCase().includes(search.toLowerCase()),
  ), [doctors, specialty, search])
  const appointments = data.appointments.filter((item) => tab === 'upcoming' ? item.status === 'upcoming' : item.status !== 'upcoming')
    .sort((a, b) => tab === 'upcoming' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
  const emptyAction = tab === 'upcoming'
    ? <button className="button button-primary" onClick={() => openBooking()}><Icon name="plus" size={16} /> Book a visit</button>
    : undefined

  function closeBooking() {
    setBookingOpen(false)
    setBookingDoctor(undefined)
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete('book'); return next }, { replace: true })
  }

  async function confirmBooking(appointment: Appointment) {
    try {
      await bookAppointment(appointment)
    } catch {
      return // the dialog keeps the server error visible
    }
    setTab('upcoming')
    closeBooking()
  }

  function openBooking(doctor?: Doctor) {
    setBookingDoctor(doctor)
    setBookingOpen(true)
  }

  return <>
    <PageHeader eyebrow="CARE THAT FITS YOUR LIFE" title="Appointments" description="Find the right care, on a day that works for you." action={<button className="button button-primary" onClick={() => openBooking()}><Icon name="plus" size={17} /> Book a visit</button>} />
    <section className="surface-card appointment-search-card">
      <div className="section-title"><div><h2>Find your care team</h2><p>Explore trusted providers across the care you need.</p></div><span className="provider-count">{doctors.length} providers</span></div>
      <div className="provider-filters"><label className="search-control"><Icon name="search" size={17} /><input placeholder="Search by name or specialty" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="select-control"><Icon name="filter" size={17} /><select value={specialty} onChange={(event) => setSpecialty(event.target.value)} aria-label="Filter by specialty">{specialties.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      {filteredDoctors.length ? <div className="doctor-grid">{filteredDoctors.map((doctor) => <article className="doctor-card" key={doctor.id}>
      <div className="doctor-card-top"><Avatar initials={doctor.initials} tone={doctor.tone} size="large" /><span className="provider-online"><i /> Accepting patients</span></div>
        <h3>{doctor.name}</h3><p className="doctor-credentials">{doctor.credentials} <span>·</span> {doctor.experience} years experience</p>
        <span className="specialty-pill">{doctor.specialty}</span>
        <p className="doctor-about">{doctor.about}</p>
        <div className="doctor-rating"><span><Icon name="star" size={15} /> {doctor.rating}</span><small>({doctor.reviews} patient reviews)</small></div>
        <div className="doctor-availability"><span><Icon name="clock" size={14} /> Next available</span><strong>{doctor.nextAvailable}</strong></div>
        <div className="doctor-card-footer"><span>From <strong>${doctor.visitFee}</strong> / visit</span><button className="button button-small button-primary" onClick={() => openBooking(doctor)}>Book visit</button></div>
      </article>)}</div> : <EmptyState icon="heart" title="No providers match that search" description="Try another name or choose a different specialty." action={<button className="button button-secondary" onClick={() => { setSearch(''); setSpecialty('All specialties') }}>Clear filters</button>} />}
    </section>

    <section className="visits-section">
      <div className="section-title"><div><h2>Your visits</h2><p>Keep track of what's coming up and where you've been.</p></div></div>
      {cancelError && <div className="inline-error"><Icon name="shield" size={15} /><span>{cancelError}</span></div>}
      <div className="segmented-tabs" role="tablist" aria-label="Appointment history">
        <button role="tab" aria-selected={tab === 'upcoming'} className={tab === 'upcoming' ? 'tab-active' : ''} onClick={() => setTab('upcoming')}>Upcoming <span>{data.appointments.filter((item) => item.status === 'upcoming').length}</span></button>
        <button role="tab" aria-selected={tab === 'past'} className={tab === 'past' ? 'tab-active' : ''} onClick={() => setTab('past')}>Past visits</button>
      </div>
      {appointments.length > 0 ? (
        <div className="visit-list">
          {appointments.map((appointment) => <VisitCard key={appointment.id} appointment={appointment} onCancel={async (id) => {
            if (!window.confirm(mode === 'live' ? 'Cancel this appointment record?' : 'Cancel this demo appointment?')) return
            setCancelError(null)
            try { await cancelAppointment(id) }
            catch (reason) { setCancelError(reason instanceof Error ? reason.message : 'The appointment could not be cancelled.') }
          }} />)}
        </div>
      ) : (
        <div className="surface-card">
          <EmptyState title={tab === 'upcoming' ? 'Nothing on your calendar yet' : 'No past visits to show'} description={tab === 'upcoming' ? 'Book a visit with a provider when you are ready.' : 'Completed appointments will appear here.'} action={emptyAction} />
        </div>
      )}
      {tab === 'upcoming' && appointments.length > 0 && <p className="demo-inline-note">Bookings are patient-managed records saved to {mode === 'live' ? 'your CareConnect account — they do not notify the clinic or add the provider to your care team' : 'this browser'}. {mode === 'live' ? 'Bring the details to your provider to arrange the actual visit.' : 'They do not notify a provider.'}</p>}
    </section>
    {bookingOpen && <BookingDialog doctor={bookingDoctor} mode={mode} onClose={closeBooking} onBook={confirmBooking} />}
  </>
}

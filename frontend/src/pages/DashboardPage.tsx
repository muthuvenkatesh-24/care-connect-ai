import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar, PageHeader, SectionTitle } from '../components/UI'
import { Icon } from '../components/Icon'
import { ScoreRing } from '../components/ScoreRing'
import { TrendChart } from '../components/TrendChart'
import { usePatientData } from '../patient/PatientDataProvider'
import { metricLabel, metricUnit, scoreFor } from '../services/patientDemoService'
import type { MetricEntry } from '../types/patient'

function metricDisplay(metric: MetricEntry) {
  if (metric.type === 'sleep') return `${metric.value}h`
  if (metric.type === 'heartRate') return `${metric.value} bpm`
  if (metric.type === 'weight') return `${metric.value} kg`
  return metric.value.toLocaleString()
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data } = usePatientData()
  const score = scoreFor(data.components)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const upcoming = data.appointments.filter((item) => item.status === 'upcoming').slice(0, 2)
  const metrics = [
    { label: 'Resting heart rate', value: '68', unit: 'bpm', icon: 'pulse' as const, note: 'Within your usual range', tone: 'mint' },
    { label: 'Blood pressure', value: '118/76', unit: 'mmHg', icon: 'heart' as const, note: 'Recent reading', tone: 'rose' },
    { label: 'Sleep last night', value: '7.7', unit: 'hrs', icon: 'moon' as const, note: 'A restful night', tone: 'lavender' },
    { label: 'Daily steps', value: '7,240', unit: 'steps', icon: 'steps' as const, note: '72% of your daily goal', tone: 'sky' },
  ]

  return (
    <>
      <PageHeader eyebrow="YOUR HEALTH, AT A GLANCE" title={`${greeting}, ${data.profile.firstName}`} description="A little progress every day adds up. Here's your health snapshot." action={<Link className="button button-primary" to="/appointments?book=1"><Icon name="plus" size={17} /> Book an appointment</Link>} />
      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="hero-live-dot" /> YOUR PERSONAL HEALTH SCORE</div>
          <h2>You're building<br />healthy momentum.</h2>
          <p>Your recent habits are moving in the right direction. Keep showing up for yourself.</p>
          <div className="hero-trend"><span><Icon name="trend" size={15} /> +9 pts</span><span>over the last 6 weeks</span></div>
          <Link to="/health-score" className="hero-link">Explore your health score <Icon name="arrow" size={15} /></Link>
        </div>
        <div className="hero-score-wrap"><ScoreRing score={score} size={164} dark /><span className="score-status"><span /> Good progress</span></div>
        <div className="hero-arc hero-arc-one" /><div className="hero-arc hero-arc-two" />
      </section>

      <div className="section-title metrics-section-title"><div><h2>Your health metrics</h2><p>Recent readings from your health profile</p></div><Link to="/health-score" className="text-link">View all <Icon name="arrow" size={14} /></Link></div>
      <section className="metric-grid">
        {metrics.map((metric) => <article className="metric-card" key={metric.label}>
          <div className={`metric-icon metric-icon-${metric.tone}`}><Icon name={metric.icon} size={18} /></div>
          <p>{metric.label}</p><strong>{metric.value}<small> {metric.unit}</small></strong><span className="metric-note"><i />{metric.note}</span>
        </article>)}
      </section>

      <div className="dashboard-columns">
        <section className="surface-card dashboard-chart-card">
          <SectionTitle title="Your score over time" action={<Link className="quiet-link" to="/health-score">Details <Icon name="arrow" size={13} /></Link>} />
          <div className="chart-current"><strong>{score}</strong><span>/100</span><em><Icon name="trend" size={14} /> +6%</em><small>since last month</small></div>
          <TrendChart values={data.scoreHistory.map((entry) => entry.score)} labels={data.scoreHistory.map((entry) => entry.date)} height={148} />
        </section>
        <section className="surface-card upcoming-card">
          <SectionTitle title="Coming up" action={<Link className="quiet-link" to="/appointments">All visits <Icon name="arrow" size={13} /></Link>} />
          {upcoming.length ? <div className="upcoming-list">{upcoming.map((appointment) => <article className="upcoming-item" key={appointment.id}>
            <div className="appointment-date"><strong>{new Date(`${appointment.date}T12:00:00`).toLocaleDateString(undefined, { day: '2-digit' })}</strong><span>{new Date(`${appointment.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span></div>
            <Avatar initials={appointment.initials} tone={appointment.tone} />
            <div className="upcoming-info"><strong>{appointment.doctorName}</strong><span>{appointment.specialty}</span><small><Icon name="clock" size={13} /> {appointment.time} · {appointment.type}</small></div>
            <Link className="icon-button subtle-icon" aria-label={`View ${appointment.doctorName} appointment`} to="/appointments"><Icon name="arrow" size={16} /></Link>
          </article>)}</div> : <div className="mini-empty">No upcoming visits yet. <Link to="/appointments">Find a doctor</Link></div>}
          <Link to="/appointments?book=1" className="add-appointment"><Icon name="plus" size={16} /> Schedule a visit</Link>
        </section>
      </div>

      <section className="surface-card activity-card">
        <SectionTitle title="Recent activity" action={<Link className="quiet-link" to="/health-score">See health history <Icon name="arrow" size={13} /></Link>} />
        <div className="activity-list">
          {data.metrics.slice(0, 3).map((metric, index) => <div className="activity-item" key={metric.id}>
            <span className={`activity-icon activity-icon-${index}`}><Icon name={metric.type === 'sleep' ? 'moon' : metric.type === 'steps' ? 'steps' : metric.type === 'weight' ? 'weight' : 'pulse'} size={17} /></span>
            <div><strong>{metricLabel(metric.type)} logged</strong><span>{metricDisplay(metric)} <i>·</i> {dateLabel(metric.date)}</span></div>
            <span className="activity-category">{metricUnit(metric.type)}</span>
          </div>)}
          {data.appointments.filter((item) => item.status === 'completed').slice(0, 1).map((item) => <div className="activity-item" key={item.id}>
            <span className="activity-icon activity-icon-appointment"><Icon name="calendar" size={17} /></span>
            <div><strong>Visit with {item.doctorName}</strong><span>{item.specialty} <i>·</i> {dateLabel(item.date)}</span></div>
            <span className="activity-category">Visit complete</span>
          </div>)}
        </div>
      </section>
      <p className="dashboard-note">Hi{user?.name ? ` ${user.name.split(' ')[0]}` : ''} — your overview is based on the latest information in your demo profile.</p>
    </>
  )
}

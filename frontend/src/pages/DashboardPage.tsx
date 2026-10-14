import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar, EmptyState, PageHeader, SectionTitle } from '../components/UI'
import { Icon } from '../components/Icon'
import { ScoreRing } from '../components/ScoreRing'
import { TrendChart } from '../components/TrendChart'
import { usePatientData } from '../patient/PatientDataProvider'
import { metricLabel, scoreFor } from '../services/patientDemoService'
import type { MetricEntry } from '../types/patient'

function metricDisplay(metric: MetricEntry) {
  if (metric.type === 'sleep') return `${metric.value}h`
  if (metric.type === 'heartRate') return `${metric.value} bpm`
  if (metric.type === 'weight') return `${metric.value} kg`
  if (metric.type === 'water') return `${metric.value} glasses`
  if (metric.type === 'exercise') return `${metric.value} min`
  return metric.value.toLocaleString()
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Latest value of each metric type for the live dashboards; demo accounts keep
// their curated example cards.
function latestByType(metrics: MetricEntry[]) {
  const latest = new Map<string, MetricEntry>()
  for (const metric of metrics) {
    if (!latest.has(metric.type)) latest.set(metric.type, metric)
  }
  return latest
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data, mode, healthScore, loading, error, retry } = usePatientData()
  const score = mode === 'live' ? (healthScore?.score ?? null) : scoreFor(data.components)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const upcoming = data.appointments
    .filter((item) => item.status === 'upcoming')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 2)

  const latest = latestByType(data.metrics)
  const sleep = latest.get('sleep')
  const heartRate = latest.get('heartRate')
  const steps = latest.get('steps')
  const bpmLabel = (value: number) => (value <= 60 ? 'Low for most adults' : value <= 100 ? 'Within the usual adult range' : 'Above the usual adult range')

  const metricCards: { label: string; value: string; unit: string; icon: 'pulse' | 'heart' | 'moon' | 'steps'; note: string; tone: string }[] | null = mode === 'live'
    ? (heartRate || sleep || steps || latest.get('water') || latest.get('exercise')
      ? [
        heartRate ? { label: 'Resting heart rate', value: String(heartRate.value), unit: 'bpm', icon: 'pulse' as const, note: bpmLabel(heartRate.value), tone: 'mint' } : null,
        sleep ? { label: 'Sleep logged', value: String(sleep.value), unit: 'hrs', icon: 'moon' as const, note: `Logged ${dateLabel(sleep.date)}`, tone: 'lavender' } : null,
        steps ? { label: 'Daily steps', value: steps.value.toLocaleString(), unit: 'steps', icon: 'steps' as const, note: `Logged ${dateLabel(steps.date)}`, tone: 'sky' } : null,
        latest.get('water') ? { label: 'Water', value: String(latest.get('water')!.value), unit: 'glasses', icon: 'heart' as const, note: `Logged ${dateLabel(latest.get('water')!.date)}`, tone: 'rose' } : null,
      ].filter(Boolean) as { label: string; value: string; unit: string; icon: 'pulse' | 'heart' | 'moon' | 'steps'; note: string; tone: string }[]
      : null)
    : [
      { label: 'Resting heart rate', value: '68', unit: 'bpm', icon: 'pulse' as const, note: 'Within your usual range', tone: 'mint' },
      { label: 'Blood pressure', value: '118/76', unit: 'mmHg', icon: 'heart' as const, note: 'Recent reading', tone: 'rose' },
      { label: 'Sleep last night', value: '7.7', unit: 'hrs', icon: 'moon' as const, note: 'A restful night', tone: 'lavender' },
      { label: 'Daily steps', value: '7,240', unit: 'steps', icon: 'steps' as const, note: '72% of your daily goal', tone: 'sky' },
    ]

  return (
    <>
      <PageHeader eyebrow="YOUR HEALTH, AT A GLANCE" title={`${greeting}, ${data.profile.firstName}`} description="A little progress every day adds up. Here's your health snapshot." action={<Link className="button button-primary" to="/appointments?book=1"><Icon name="plus" size={17} /> Book an appointment</Link>} />

      {mode === 'live' && error && (
        <section className="surface-card dashboard-error-card">
          <div className="inline-error"><Icon name="shield" size={16} /><span>{error}</span></div>
          <button className="button button-secondary button-small" onClick={retry}>Try again</button>
        </section>
      )}
      {mode === 'live' && loading && !error && <p className="dashboard-note">Loading your health data…</p>}

      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="hero-live-dot" /> YOUR PERSONAL HEALTH SCORE</div>
          <h2>You're building<br />healthy momentum.</h2>
          <p>{score != null ? 'Your recent habits are moving in the right direction. Keep showing up for yourself.' : 'Log a few daily metrics and your wellness score will start taking shape here.'}</p>
          <Link to="/health-score" className="hero-link">Explore your health score <Icon name="arrow" size={15} /></Link>
        </div>
        {score != null
          ? <div className="hero-score-wrap"><ScoreRing score={score} size={164} dark /><span className="score-status"><span /> {mode === 'live' && healthScore?.completeness === 'insufficient' ? 'Building' : 'Good progress'}</span></div>
          : <div className="hero-score-wrap"><span className="score-status score-status-incomplete"><Icon name="shield" size={16} /> Incomplete data</span></div>}
        <div className="hero-arc hero-arc-one" /><div className="hero-arc hero-arc-two" />
      </section>

      {mode === 'live' && healthScore?.bmi != null && (
        <section className="surface-card dashboard-bmi-card">
          <SectionTitle title="Body mass index (BMI)" action={<span className="small-muted">{healthScore.bmi_category ?? '—'}</span>} />
          <div className="bmi-row"><strong>{healthScore.bmi}</strong><span>kg/m²</span><p className="small-muted">{healthScore.bmi_note}</p></div>
        </section>
      )}

      <div className="section-title metrics-section-title"><div><h2>Your health metrics</h2><p>{mode === 'live' ? 'Your most recent logged readings' : 'Recent readings from your demo profile'}</p></div><Link to="/health-score" className="text-link">View all <Icon name="arrow" size={14} /></Link></div>
      {metricCards && metricCards.length > 0 ? (
        <section className="metric-grid">
          {metricCards.map((metric) => <article className="metric-card" key={metric.label}>
            <div className={`metric-icon metric-icon-${metric.tone}`}><Icon name={metric.icon} size={18} /></div>
            <p>{metric.label}</p><strong>{metric.value}<small> {metric.unit}</small></strong><span className="metric-note"><i />{metric.note}</span>
          </article>)}
        </section>
      ) : (
        <section className="surface-card"><EmptyState icon="heart" title={mode === 'live' ? 'No metrics logged yet' : 'No recent readings'} description={mode === 'live' ? 'Log sleep, steps, heart rate, water, or exercise to bring this overview to life.' : 'Add a reading from the health score page to see it here.'} action={<Link className="button button-primary" to="/health-score"><Icon name="plus" size={16} /> Log a metric</Link>} /></section>
      )}

      <div className="dashboard-columns">
        <section className="surface-card dashboard-chart-card">
          <SectionTitle title="Your score over time" action={<Link className="quiet-link" to="/health-score">Details <Icon name="arrow" size={13} /></Link>} />
          {data.scoreHistory.length > 1
            ? <>
              <div className="chart-current"><strong>{score ?? '—'}</strong><span>/100</span><small>{mode === 'live' ? 'from your logged days' : 'demo series'}</small></div>
              <TrendChart values={data.scoreHistory.map((entry) => entry.score)} labels={data.scoreHistory.map((entry) => entry.date)} height={148} />
            </>
            : <div className="mini-empty">{mode === 'live' ? 'Your trend appears after two or more logged days.' : 'No trend yet.'}</div>}
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
        {data.metrics.length || data.appointments.some((item) => item.status === 'completed') ? (
          <div className="activity-list">
            {data.metrics.slice(0, 3).map((metric) => <div className="activity-item" key={metric.id}>
              <span className={`activity-icon activity-icon-${metric.type}`}><Icon name={metric.type === 'sleep' ? 'moon' : metric.type === 'steps' ? 'steps' : metric.type === 'weight' ? 'weight' : metric.type === 'exercise' ? 'steps' : 'pulse'} size={17} /></span>
              <div><strong>{metricLabel(metric.type)} logged</strong><span>{metricDisplay(metric)} <i>·</i> {dateLabel(metric.date)}</span></div>
              <span className="activity-category">{mode === 'live' ? 'Saved' : 'Demo'}</span>
            </div>)}
            {data.appointments.filter((item) => item.status === 'completed').slice(0, 1).map((item) => <div className="activity-item" key={item.id}>
              <span className="activity-icon activity-icon-appointment"><Icon name="calendar" size={17} /></span>
              <div><strong>Record for visit with {item.doctorName}</strong><span>{item.specialty} <i>·</i> {dateLabel(item.date)}</span></div>
              <span className="activity-category">Visit record</span>
            </div>)}
          </div>
        ) : <div className="mini-empty">Activity appears here once you log metrics or record visits.</div>}
      </section>
      <p className="dashboard-note">{mode === 'live'
        ? 'Your overview reflects the data saved to your CareConnect account. Health score is a wellness estimate, not medical advice.'
        : `Hi${user?.name ? ` ${user.name.split(' ')[0]}` : ''} — this overview is based on sample demo data stored in your browser.`}</p>
    </>
  )
}

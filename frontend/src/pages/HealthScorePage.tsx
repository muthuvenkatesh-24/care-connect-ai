import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Modal, PageHeader, SectionTitle } from '../components/UI'
import { ScoreRing } from '../components/ScoreRing'
import { TrendChart } from '../components/TrendChart'
import { usePatientData } from '../patient/PatientDataProvider'
import { metricLabel, metricUnit, scoreFor } from '../services/patientDemoService'
import type { MetricEntry, MetricType } from '../types/patient'

const metricOptions: { type: MetricType; label: string; unit: string; min: number; max: number; step: string }[] = [
  { type: 'steps', label: 'Daily steps', unit: 'steps', min: 1, max: 200000, step: '1' },
  { type: 'sleep', label: 'Sleep', unit: 'hours', min: 0.1, max: 24, step: '0.1' },
  { type: 'heartRate', label: 'Resting heart rate', unit: 'bpm', min: 25, max: 250, step: '1' },
  { type: 'weight', label: 'Weight', unit: 'kg', min: 20, max: 500, step: '0.1' },
  { type: 'water', label: 'Water', unit: 'glasses', min: 0.1, max: 32, step: '0.5' },
  { type: 'exercise', label: 'Active minutes', unit: 'minutes', min: 1, max: 1200, step: '1' },
]

function MetricDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (metric: MetricEntry) => Promise<void> }) {
  const [type, setType] = useState<MetricType>('steps')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const option = metricOptions.find((item) => item.type === type) ?? metricOptions[0]

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const entry = Number(value)
    if (!Number.isFinite(entry) || entry < option.min || entry > option.max) {
      setError(`Value must be between ${option.min} and ${option.max} ${option.unit}.`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onAdd({ id: `metric-${Date.now()}`, type, value: entry, date })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The entry could not be saved.')
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return <Modal title="Log a health metric" description="Add a recent reading to your personal wellness timeline." onClose={onClose}>
    <form className="metric-entry-form" onSubmit={submit}>
      <label>Metric<select value={type} onChange={(event) => { setType(event.target.value as MetricType); setValue(''); setError(null) }}>{metricOptions.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
      <div className="field-row"><label>Value ({option.unit})<input type="number" value={value} onChange={(event) => setValue(event.target.value)} min={option.min} max={option.max} step={option.step} required autoFocus /></label><label>Date<input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required /></label></div>
      {error && <div className="inline-error"><Icon name="shield" size={15} /><span>{error}</span></div>}
      <div className="booking-note"><Icon name="sparkle" size={16} /><span>Your score may adjust for steps, sleep, and resting heart rate. This is a wellness estimate, not a clinical assessment.</span></div>
      <div className="modal-footer inline-modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : <>Add metric <Icon name="plus" size={15} /></>}</button></div>
    </form>
  </Modal>
}

function displayMetric(metric: MetricEntry) {
  const unit = metricUnit(metric.type)
  const value = metric.type === 'steps' ? metric.value.toLocaleString() : metric.value
  return `${value} ${unit}`
}

type HealthFactorLike = {
  key: string
  label: string
  value: number | null
  unit: string
  score: number | null
  status: string
  detail: string
  suggestion: string | null
}

function factorIcon(key: string): 'steps' | 'moon' | 'pulse' | 'weight' | 'heart' {
  if (key === 'steps' || key === 'exercise') return 'steps'
  if (key === 'sleep') return 'moon'
  if (key === 'heart_rate') return 'pulse'
  if (key === 'weight' || key === 'bmi') return 'weight'
  return 'heart'
}

export function HealthScorePage() {
  const { data, mode, healthScore, addMetricEntry } = usePatientData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const isLive = mode === 'live'
  const demoScore = scoreFor(data.components)
  const score = isLive ? (healthScore?.score ?? null) : demoScore
  const metricIcons: Record<string, 'steps' | 'moon' | 'pulse' | 'weight' | 'heart'> = { steps: 'steps', sleep: 'moon', heartRate: 'pulse', weight: 'weight', water: 'heart', exercise: 'steps' }

  return <>
    <PageHeader eyebrow="YOUR WELL-BEING, IN PERSPECTIVE" title="Health score" description="See how your everyday habits and recent readings add up over time." action={<button className="button button-primary" onClick={() => setDialogOpen(true)}><Icon name="plus" size={17} /> Log a metric</button>} />
    <section className="score-overview surface-card">
      <div className="score-overview-copy"><span className="score-label"><Icon name="sparkle" size={16} /> PERSONAL WELLNESS SNAPSHOT</span><h2>A clearer picture<br />of your progress.</h2>
        <p>{isLive
          ? (healthScore?.narrative ?? 'Log a few daily metrics and your wellness score will begin to take shape.')
          : 'Your score brings together activity, sleep, vitals, and nutrition habits to help you spot positive patterns.'}</p>
        {score !== null
          ? <div className="score-overview-trend"><span><Icon name="trend" size={15} /> Score {score}</span><span>{isLive && healthScore?.completeness === 'partial' ? 'from the factors you have logged' : 'recent wellness factors'}</span></div>
          : <div className="score-overview-trend incomplete"><span><Icon name="shield" size={15} /> Not enough data yet</span><span>log sleep, steps, or other metrics to build your score</span></div>}
        <span className="score-updated"><Icon name="clock" size={14} /> {isLive ? 'Computed from your saved health logs' : 'Updated with your latest demo entries'}</span></div>
      {score !== null
        ? <div className="score-overview-ring"><ScoreRing score={score} size={190} /><span className="score-ring-caption">{isLive && healthScore?.completeness === 'insufficient' ? 'Building' : 'Good progress'}</span></div>
        : <div className="score-overview-ring"><span className="score-ring-empty"><Icon name="shield" size={34} /></span><span className="score-ring-caption">Incomplete data</span></div>}
    </section>

    {isLive && healthScore?.bmi != null && (
      <section className="surface-card bmi-card">
        <SectionTitle title="Body mass index (BMI)" action={<span className="small-muted">{healthScore.bmi_category ?? '—'}</span>} />
        <div className="bmi-row"><strong>{healthScore.bmi}</strong><span>kg/m²</span><p className="small-muted">{healthScore.bmi_note}</p></div>
      </section>
    )}

    <div className="score-sections-grid">
      <section className="surface-card score-breakdown-card">
        <SectionTitle title="What shapes your score" action={<span className="small-muted">{isLive ? `${healthScore?.factors.length ?? 0} documented factors` : '4 components'}</span>} />
        {isLive ? (
          <div className="component-list">{(healthScore?.factors ?? []).map((factor) => {
            const typed = factor as HealthFactorLike
            const percent = typed.score ?? 0
            return <article className="component-row" key={typed.key}>
              <span className="component-icon component-mixed"><Icon name={factorIcon(typed.key)} size={18} /></span>
              <div className="component-copy"><div><strong>{typed.label}</strong><span>{typed.value != null ? `${typed.value} ${typed.unit}` : 'No data yet'}<small>{typed.score != null ? ` · ${typed.score}/100` : ''}</small></span></div>
                <div className="progress-track"><i style={{ width: `${percent}%` }} /></div>
                <p>{typed.detail}{typed.suggestion ? ` Suggestion: ${typed.suggestion}` : ''}</p>
              </div>
            </article>
          })}</div>
        ) : (
          <div className="component-list">{data.components.map((component) => <article className="component-row" key={component.key}>
            <span className={`component-icon component-${component.key}`}><Icon name={component.key === 'activity' ? 'steps' : component.key === 'sleep' ? 'moon' : component.key === 'vitals' ? 'pulse' : 'heart'} size={18} /></span>
            <div className="component-copy"><div><strong>{component.label}</strong><span>{component.score}<small>/100</small></span></div><div className="progress-track"><i style={{ width: `${component.score}%` }} /></div><p>{component.note}</p></div>
          </article>)}</div>
        )}
        <div className="score-method-note"><Icon name="shield" size={15} /><span>{isLive && healthScore
          ? healthScore.disclaimer
          : 'Designed for everyday reflection. Your score is a wellness estimate, not medical advice or a diagnosis.'}</span></div>
      </section>

      <section className="surface-card trend-card">
        <SectionTitle title="Your progress" action={<span className="trend-period">Last {data.scoreHistory.length} logged days</span>} />
        {data.scoreHistory.length > 1
          ? <>
            <div className="trend-summary"><strong>{score ?? '—'}</strong><span>current score</span></div>
            <TrendChart values={data.scoreHistory.map((entry) => entry.score)} labels={data.scoreHistory.map((entry) => entry.date)} height={210} />
            <p className="chart-footnote">The score covers only the days you actually logged data — no values are invented for the days in between.</p>
          </>
          : <div className="mini-empty">Your trend line appears after at least two days of logged data.</div>}
      </section>
    </div>

    <section className="surface-card metric-history-card">
      <SectionTitle title="Recent health entries" action={<button className="quiet-link button-as-link" onClick={() => setDialogOpen(true)}>Add entry <Icon name="plus" size={14} /></button>} />
      {data.metrics.length ? <div className="metric-history-list">{data.metrics.slice(0, 8).map((metric) => <article className="metric-history-row" key={metric.id}>
        <span className={`activity-icon activity-icon-${metric.type}`}><Icon name={metricIcons[metric.type]} size={17} /></span>
        <div><strong>{metricLabel(metric.type)}</strong><span>{new Date(`${metric.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
        <strong className="metric-entry-value">{displayMetric(metric)}</strong>
        <span className="metric-entry-source">{isLive ? 'Saved to your account' : 'Browser demo'}</span>
      </article>)}</div> : <div className="mini-empty">No entries yet. Add your first reading to start a trend.</div>}
      <div className="metric-history-footer"><span>{isLive ? 'Entries are saved to your CareConnect account.' : 'Entries are stored in this browser only.'}</span><button className="button button-secondary button-small" onClick={() => setDialogOpen(true)}><Icon name="plus" size={15} /> Add a reading</button></div>
    </section>
    {dialogOpen && <MetricDialog onClose={() => setDialogOpen(false)} onAdd={async (metric) => { await addMetricEntry(metric); setDialogOpen(false) }} />}
  </>
}

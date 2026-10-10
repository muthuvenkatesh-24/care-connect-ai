import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Modal, PageHeader, SectionTitle } from '../components/UI'
import { ScoreRing } from '../components/ScoreRing'
import { TrendChart } from '../components/TrendChart'
import { usePatientData } from '../patient/PatientDataProvider'
import { metricLabel, metricUnit, scoreFor } from '../services/patientDemoService'
import type { MetricEntry, MetricType } from '../types/patient'

const metricOptions: { type: MetricType; label: string; unit: string; min: number; max: number; step: string }[] = [
  { type: 'steps', label: 'Daily steps', unit: 'steps', min: 0, max: 100000, step: '1' },
  { type: 'sleep', label: 'Sleep', unit: 'hours', min: 0, max: 24, step: '0.1' },
  { type: 'heartRate', label: 'Resting heart rate', unit: 'bpm', min: 25, max: 250, step: '1' },
  { type: 'weight', label: 'Weight', unit: 'kg', min: 1, max: 500, step: '0.1' },
]

function MetricDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (metric: MetricEntry) => void }) {
  const [type, setType] = useState<MetricType>('steps')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const option = metricOptions.find((item) => item.type === type) ?? metricOptions[0]

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const entry = Number(value)
    if (!Number.isFinite(entry)) return
    onAdd({ id: `metric-${Date.now()}`, type, value: entry, date })
  }

  return <Modal title="Log a health metric" description="Add a recent reading to your personal demo timeline." onClose={onClose}>
    <form className="metric-entry-form" onSubmit={submit}>
      <label>Metric<select value={type} onChange={(event) => { setType(event.target.value as MetricType); setValue('') }}>{metricOptions.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
      <div className="field-row"><label>Value ({option.unit})<input type="number" value={value} onChange={(event) => setValue(event.target.value)} min={option.min} max={option.max} step={option.step} required autoFocus /></label><label>Date<input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required /></label></div>
      <div className="booking-note"><Icon name="sparkle" size={16} /><span>Your score may adjust for steps, sleep, and resting heart rate. This is a demo estimate, not a clinical assessment.</span></div>
      <div className="modal-footer inline-modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">Add metric <Icon name="plus" size={15} /></button></div>
    </form>
  </Modal>
}

function displayMetric(metric: MetricEntry) {
  const unit = metricUnit(metric.type)
  const value = metric.type === 'steps' ? metric.value.toLocaleString() : metric.value
  return `${value} ${unit}`
}

export function HealthScorePage() {
  const { data, addMetricEntry } = usePatientData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const score = scoreFor(data.components)
  const metricIcons: Record<string, 'steps' | 'moon' | 'pulse' | 'weight'> = { steps: 'steps', sleep: 'moon', heartRate: 'pulse', weight: 'weight' }

  return <>
    <PageHeader eyebrow="YOUR WELL-BEING, IN PERSPECTIVE" title="Health score" description="See how your everyday habits and recent readings add up over time." action={<button className="button button-primary" onClick={() => setDialogOpen(true)}><Icon name="plus" size={17} /> Log a metric</button>} />
    <section className="score-overview surface-card">
      <div className="score-overview-copy"><span className="score-label"><Icon name="sparkle" size={16} /> PERSONAL WELLNESS SNAPSHOT</span><h2>A clearer picture<br />of your progress.</h2><p>Your score brings together activity, sleep, vitals, and nutrition habits to help you spot positive patterns.</p><div className="score-overview-trend"><span><Icon name="trend" size={15} /> Up 9 points</span><span>in the last six weeks</span></div><span className="score-updated"><Icon name="clock" size={14} /> Updated with your latest demo entries</span></div>
      <div className="score-overview-ring"><ScoreRing score={score} size={190} /><span className="score-ring-caption">Good progress</span></div>
    </section>

    <div className="score-sections-grid">
      <section className="surface-card score-breakdown-card">
        <SectionTitle title="What shapes your score" action={<span className="small-muted">4 components</span>} />
        <div className="component-list">{data.components.map((component) => <article className="component-row" key={component.key}>
          <span className={`component-icon component-${component.key}`}><Icon name={component.key === 'activity' ? 'steps' : component.key === 'sleep' ? 'moon' : component.key === 'vitals' ? 'pulse' : 'heart'} size={18} /></span>
          <div className="component-copy"><div><strong>{component.label}</strong><span>{component.score}<small>/100</small></span></div><div className="progress-track"><i style={{ width: `${component.score}%` }} /></div><p>{component.note}</p></div>
        </article>)}</div>
        <div className="score-method-note"><Icon name="shield" size={15} /><span>Designed for everyday reflection. Your score is a wellness estimate, not medical advice or a diagnosis.</span></div>
      </section>
      <section className="surface-card trend-card">
        <SectionTitle title="Your progress" action={<span className="trend-period">Last 6 weeks <Icon name="chevron" size={14} /></span>} />
        <div className="trend-summary"><strong>{score}</strong><span>current score</span><em><Icon name="trend" size={14} /> +9%</em></div>
        <TrendChart values={data.scoreHistory.map((entry) => entry.score)} labels={data.scoreHistory.map((entry) => entry.date)} height={210} />
        <p className="chart-footnote">Small, consistent habits make a meaningful difference over time.</p>
      </section>
    </div>

    <section className="surface-card metric-history-card">
      <SectionTitle title="Recent health entries" action={<button className="quiet-link button-as-link" onClick={() => setDialogOpen(true)}>Add entry <Icon name="plus" size={14} /></button>} />
      {data.metrics.length ? <div className="metric-history-list">{data.metrics.slice(0, 8).map((metric) => <article className="metric-history-row" key={metric.id}>
        <span className={`activity-icon activity-icon-${metric.type}`}><Icon name={metricIcons[metric.type]} size={17} /></span>
        <div><strong>{metricLabel(metric.type)}</strong><span>{new Date(`${metric.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
        <strong className="metric-entry-value">{displayMetric(metric)}</strong>
        <span className="metric-entry-source">Browser demo</span>
      </article>)}</div> : <div className="mini-empty">No entries yet. Add your first reading to start a trend.</div>}
      <div className="metric-history-footer"><span>Entries are stored in this browser only.</span><button className="button button-secondary button-small" onClick={() => setDialogOpen(true)}><Icon name="plus" size={15} /> Add a reading</button></div>
    </section>
    {dialogOpen && <MetricDialog onClose={() => setDialogOpen(false)} onAdd={(metric) => { addMetricEntry(metric); setDialogOpen(false) }} />}
  </>
}

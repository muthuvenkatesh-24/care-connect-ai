import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { PageHeader, SectionTitle } from '../components/UI'

// Curated educational reference — not generated at runtime, not an ML model,
// and not a diagnostic tool. Urgency flags are intentionally broad: any flagged
// symptom shows the emergency-care banner immediately, before any scoring.
type Symptom = {
  id: string
  label: string
  urgent?: boolean
}

type Disease = {
  id: string
  name: string
  summary: string
  symptoms: Symptom[]
  riskFactors: string[]
  prevention: string[]
  whenToSeekCare: string
}

const diseases: Disease[] = [
  {
    id: 'diabetes',
    name: 'Type 2 diabetes',
    summary: 'A long-term condition in which blood glucose stays higher than the body can manage. Early awareness of everyday warning signs supports timely professional checks.',
    symptoms: [
      { id: 'frequent-thirst', label: 'Frequent thirst or dry mouth' },
      { id: 'frequent-urination', label: 'Urinating often, especially at night' },
      { id: 'fatigue', label: 'Persistent tiredness' },
      { id: 'blurred-vision', label: 'Blurred vision' },
      { id: 'slow-healing', label: 'Cuts or wounds that heal slowly' },
      { id: 'tingling', label: 'Tingling or numbness in hands or feet' },
    ],
    riskFactors: [
      'Family history of diabetes',
      'Higher body-mass index, especially around the waist',
      'Low physical activity levels',
      'Age over 35 with other risk factors',
      'History of gestational diabetes',
    ],
    prevention: [
      'Regular movement — walking counts — across most days of the week',
      'Balanced meals with fibre-rich carbohydrates',
      'Routine check-ups that include blood glucose when advised',
      'Maintaining a weight healthy for your body',
    ],
    whenToSeekCare: 'Ask a professional about a glucose check if several symptoms above persist for a couple of weeks, or sooner if you also lose weight without trying.',
  },
  {
    id: 'hypertension',
    name: 'High blood pressure (hypertension)',
    summary: 'Often called a silent condition because it rarely has obvious symptoms day to day. Home or clinic readings are the reliable way to know where you stand.',
    symptoms: [
      { id: 'headaches', label: 'Recurrent morning headaches' },
      { id: 'dizziness', label: 'Dizziness or light-headedness' },
      { id: 'vision-changes', label: 'Sudden vision changes', urgent: true },
      { id: 'nosebleeds', label: 'Frequent nosebleeds' },
      { id: 'breathlessness-mild', label: 'Breathlessness on mild exertion' },
      { id: 'chest-pain', label: 'Chest pain or pressure', urgent: true },
    ],
    riskFactors: [
      'Diet high in salt',
      'Family history of hypertension',
      'Higher alcohol intake',
      'Chronic stress or poor sleep',
      'High body-mass index and low activity',
    ],
    prevention: [
      'Watch sodium in processed foods',
      'Aim for regular cardiovascular activity',
      'Have blood pressure checked at least yearly, more often if advised',
      'Handle stress with rest and routine',
    ],
    whenToSeekCare: 'A single high reading does not equal a diagnosis. Persistent readings at or above 130/80 deserve a professional conversation.',
  },
  {
    id: 'heart-disease',
    name: 'Heart disease (coronary artery disease)',
    summary: 'Narrowed or stiffened coronary arteries can reduce blood flow to the heart muscle. Recognising acute warning signs early is critical.',
    symptoms: [
      { id: 'chest-pain', label: 'Chest pain, pressure, or tightness', urgent: true },
      { id: 'left-arm-discomfort', label: 'Discomfort spreading to arm, jaw, or back', urgent: true },
      { id: 'shortness-breath', label: 'Shortness of breath at rest or with light activity', urgent: true },
      { id: 'palpitations', label: 'Racing or irregular heartbeat' },
      { id: 'sweating', label: 'Cold sweat with other discomfort', urgent: true },
      { id: 'swollen-ankles', label: 'Swollen ankles or feet' },
    ],
    riskFactors: [
      'Smoking or vaping',
      'High blood pressure or diabetes',
      'Elevated cholesterol',
      'Family history of early heart disease',
      'Long sedentary routine',
    ],
    prevention: [
      'No tobacco, in any form',
      'Regular activity your body can handle',
      'Blood pressure, cholesterol, and glucose checks as advised',
      'A diet patterned toward vegetables, whole grains, and lean proteins',
    ],
    whenToSeekCare: 'Never self-assess chest symptoms. Any pressing chest pain, breathlessness at rest, or faintness needs emergency evaluation immediately.',
  },
]

// Illustrative rule mapping used for the optional demo bucket. It is intentionally
// coarse, printed in full in the UI, and never shown as a probability.
const RULE_HINTS: Record<string, string[]> = {
  diabetes: ['frequent-thirst', 'frequent-urination', 'fatigue', 'blurred-vision', 'slow-healing', 'tingling'],
  hypertension: ['headaches', 'dizziness', 'vision-changes', 'nosebleeds', 'breathlessness-mild'],
  'heart-disease': ['chest-pain', 'left-arm-discomfort', 'shortness-breath', 'palpitations', 'sweating', 'swollen-ankles'],
}

export function SymptomEducationPage() {
  const [activeDisease, setActiveDisease] = useState<Disease>(diseases[0])
  const [selected, setSelected] = useState<string[]>([])

  const urgentSelected = useMemo(
    () => selected.some((id) => diseases.flatMap((disease) => disease.symptoms).find((symptom) => symptom.id === id)?.urgent),
    [selected],
  )

  const demoBucket = useMemo(() => {
    if (selected.length < 2) return null
    const matches = diseases
      .map((disease) => ({ disease, overlap: RULE_HINTS[disease.id].filter((id) => selected.includes(id)).length }))
      .sort((a, b) => b.overlap - a.overlap)
    const [first, second] = matches
    if (first.overlap >= 2) {
      return {
        disease: first.disease,
        reason: `${first.overlap} of your selected symptoms are commonly discussed for ${first.disease.name.toLowerCase()}.`,
        second: second?.overlap && second.overlap >= 1 ? second.disease : null,
      }
    }
    return null
  }, [selected])

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  return <>
    <PageHeader eyebrow="LEARN BEFORE YOU WORRY" title="Symptom education" description="Curated information about diabetes, hypertension, and heart disease — see which symptoms people commonly describe and what the guidelines say." />
    <section className="surface-card education-band">
      <div className="booking-note education-note"><Icon name="shield" size={16} /><span>
        <strong>Educational reference only — not a diagnosis.</strong> Selecting symptoms here never produces a diagnosis. Automated ML-based risk estimation is a future enhancement; nothing on this page is an ML prediction.
      </span></div>
      {(urgentSelected || selected.length === 0) && (
        <div className="urgent-banner"><strong>{urgentSelected ? 'Get urgent medical help now' : 'In an emergency, act first'}</strong>
          <p>Chest pain or pressure, severe difficulty breathing, fainting, or stroke warning signs (face drooping, arm weakness, sudden confused speech) need immediate emergency care. Do not wait for a web tool — call your local emergency number.</p></div>
      )}
    </section>

    <div className="score-sections-grid">
      <section className="surface-card score-breakdown-card">
        <SectionTitle title="Select what you're experiencing" action={<span className="small-muted">{selected.length} selected</span>} />
        <div className="symptom-chip-row">{activeDisease.symptoms.map((symptom) => (
          <button key={symptom.id} className={`symptom-chip ${selected.includes(symptom.id) ? 'symptom-chip-active' : ''}`} onClick={() => toggle(symptom.id)}>
            {symptom.urgent ? <Icon name="shield" size={13} /> : null}{symptom.label}
          </button>
        ))}</div>
        {selected.length > 0 && (
          <div className="edu-bucket">
            {demoBucket
              ? <>
                <p><strong>Notes others commonly see with these symptoms:</strong> this pattern is often described when people discuss <strong>{demoBucket.disease.name}</strong>. {demoBucket.reason}{demoBucket.second ? ` Some of these symptoms overlap with ${demoBucket.second.name.toLowerCase()} too.` : ''} This is pattern comparison for learning — it is not a diagnosis, risk percentage, or ML output.</p>
              </>
              : <p>Select at least two symptoms to see commonly discussed related conditions. One symptom alone is never enough context to compare anything.</p>}
            <p className="small-muted">Rule used (illustrative only): the count of your selected symptoms that appear on each condition's curated “commonly described” list; the condition with the largest count is named. Buckets below 2 matches are suppressed. No probabilities, no clinical validation.</p>
          </div>
        )}
      </section>

      <section className="surface-card trend-card">
        <SectionTitle title="Disease overview" />
        <div className="disease-tabs">{diseases.map((disease) => (
          <button key={disease.id} className={`tab-button ${activeDisease.id === disease.id ? 'tab-active' : ''}`} onClick={() => { setActiveDisease(disease); setSelected([]) }}>{disease.name}</button>
        ))}</div>
        <p>{activeDisease.summary}</p>
        <h3>Commonly described symptoms</h3>
        <ul className="edu-list">{activeDisease.symptoms.map((symptom) => <li key={symptom.id}>{symptom.label}{symptom.urgent ? ' — urgent' : ''}</li>)}</ul>
        <h3>Common risk factors — risk factors are not symptoms</h3>
        <ul className="edu-list">{activeDisease.riskFactors.map((item) => <li key={item}>{item}</li>)}</ul>
        <h3>Prevention guidance</h3>
        <ul className="edu-list">{activeDisease.prevention.map((item) => <li key={item}>{item}</li>)}</ul>
        <h3>When to seek professional care</h3>
        <p>{activeDisease.whenToSeekCare}</p>
        <div className="score-method-note"><Icon name="shield" size={15} /><span>Symptoms, risk factors, and conditions are separate things: a symptom is what you feel, a risk factor is background that raises the chance of a condition, and a condition can only be diagnosed by a professional. This page is a study aid for conversations with a doctor.</span></div>
      </section>
    </div>
  </>
}

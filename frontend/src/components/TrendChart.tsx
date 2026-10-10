export function TrendChart({ values, labels, height = 150 }: { values: number[]; labels: string[]; height?: number }) {
  const width = 620
  const pad = { top: 16, right: 12, bottom: 28, left: 12 }
  const min = Math.min(...values) - 5
  const max = Math.max(...values) + 5
  const coords = values.map((value, index) => ({
    x: pad.left + (index / Math.max(values.length - 1, 1)) * (width - pad.left - pad.right),
    y: pad.top + (1 - (value - min) / (max - min || 1)) * (height - pad.top - pad.bottom),
  }))
  const points = coords.map((point) => `${point.x},${point.y}`).join(' ')
  const area = `${pad.left},${height - pad.bottom} ${points} ${width - pad.right},${height - pad.bottom}`
  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Health score trend">
        <defs><linearGradient id="score-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0d8065" stopOpacity=".16" /><stop offset="100%" stopColor="#0d8065" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((fraction) => <line key={fraction} x1={pad.left} x2={width - pad.right} y1={pad.top + fraction * (height - pad.top - pad.bottom)} y2={pad.top + fraction * (height - pad.top - pad.bottom)} className="chart-grid" />)}
        <polygon points={area} fill="url(#score-area)" />
        <polyline points={points} fill="none" stroke="#0d8065" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={index === values.length - 1 ? 5 : 3} className={index === values.length - 1 ? 'chart-dot-current' : 'chart-dot'} />)}
      </svg>
      <div className="chart-labels">{labels.map((label) => <span key={label}>{label}</span>)}</div>
    </div>
  )
}

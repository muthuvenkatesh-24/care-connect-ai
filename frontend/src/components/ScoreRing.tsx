export function ScoreRing({ score, size = 148, dark = false }: { score: number; size?: number; dark?: boolean }) {
  const stroke = size > 130 ? 10 : 8
  const radius = (size - stroke) / 2
  const circumference = radius * 2 * Math.PI
  return (
    <div className={`score-ring ${dark ? 'score-ring-dark' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="score-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle className="score-progress" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke}
          strokeDasharray={`${circumference}`} strokeDashoffset={`${circumference * (1 - score / 100)}`} />
      </svg>
      <div className="score-ring-label"><strong>{score}</strong><span>out of 100</span></div>
    </div>
  )
}

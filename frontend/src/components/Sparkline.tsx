/** A small line of recent closes. Neutral ink: colour stays reserved for bullish/bearish leans. */
export function Sparkline({ values, label, width = 88, height = 28 }: { values: number[]; label: string; width?: number; height?: number }) {
  if (values.length < 2) return null
  const lo = Math.min(...values), hi = Math.max(...values)
  const span = hi - lo || 1
  const x = (i: number) => (i / (values.length - 1)) * (width - 4) + 2
  const y = (v: number) => height - 2 - ((v - lo) / span) * (height - 4)
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="shrink-0">
      <polyline points={points} pathLength={1} className="draw" fill="none" stroke="var(--ink-2)" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.25} fill="var(--ink)" />
    </svg>
  )
}

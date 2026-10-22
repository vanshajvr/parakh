import type { CalibrationRow, YearRow } from '../lib/metrics'
import { useElementWidth } from '../lib/useElementWidth'

const label = 'fill-muted text-[10px]'

/** Parakh vs a coin flip vs always saying "beats the index", on an honest 45–55% scale. */
export function DotStrip({ hitRate, baseRate }: { hitRate: number; baseRate: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const x = (v: number) => 8 + ((v - 0.45) / 0.1) * (width - 16)
  const pctLabel = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, '')}%`
  return (
    <div ref={ref}>
      <svg width={width} height={80} role="img" className="block overflow-visible"
        aria-label={`On a 45 to 55 percent scale: always saying "beats the index" ${pctLabel(baseRate)}, coin flip 50%, Parakh ${pctLabel(hitRate)}`}>
        <line x1={8} x2={width - 8} y1={36} y2={36} className="stroke-line-2" strokeWidth={2} />
        <circle cx={x(baseRate)} cy={36} r={6} className="fill-surface stroke-muted" strokeWidth={2} />
        <circle cx={x(0.5)} cy={36} r={6} className="fill-muted" />
        <circle cx={x(hitRate)} cy={36} r={8} className="fill-ink" />
        <text x={x(hitRate)} y={17} textAnchor="middle" className="fill-ink text-[11px] font-semibold">Parakh {pctLabel(hitRate)}</text>
        <text x={x(0.5)} y={60} textAnchor="middle" className={label}>Coin flip 50%</text>
        <text x={x(baseRate)} y={75} textAnchor="middle" className={label}>Always "beats index" {pctLabel(baseRate)}</text>
        <text x={8} y={60} className={label}>45%</text>
        <text x={width - 8} y={60} textAnchor="end" className={label}>55%</text>
      </svg>
    </div>
  )
}

/** Hit rate per year as bars above or below the 50% line. */
export function YearBars({ rows }: { rows: YearRow[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const height = 150, mid = 72
  // Px per percentage point: 11 at most, less if a big year would run into the labels.
  const maxDev = Math.max(...rows.map((r) => Math.abs(((r.hit_rate ?? 0.5) - 0.5) * 100)), 0.1)
  const scale = Math.min(11, (mid - 18) / maxDev, (height - 18 - mid - 14) / maxDev)
  const left = 28 // room for the 50% label
  const slot = (width - left) / rows.length
  const bar = Math.min(32, slot * 0.68)
  return (
    <div ref={ref}>
      <svg width={width} height={height} role="img" className="block"
        aria-label={`Hit rate by year compared with 50 percent: ${rows.map((r) => `${r.year} ${((r.hit_rate ?? 0) * 100).toFixed(1)}`).join(', ')}`}>
        {rows.map((r, i) => {
          const dev = ((r.hit_rate ?? 0.5) - 0.5) * 100
          const h = Math.abs(dev) * scale
          const cx = left + slot * i + slot / 2
          const above = dev >= 0
          return (
            <g key={r.year}>
              <rect x={cx - bar / 2} y={above ? mid - h : mid} width={bar} height={Math.max(h, 1)} rx={3}
                className={above ? 'fill-ink-2' : 'fill-line-2'} />
              <text x={cx} y={above ? mid - h - 5 : mid + h + 12} textAnchor="middle" className="fill-ink text-[10px]">
                {((r.hit_rate ?? 0) * 100).toFixed(1)}
              </text>
              <text x={cx} y={height - 4} textAnchor="middle" className={label}>{r.year}</text>
            </g>
          )
        })}
        <line x1={left} x2={width} y1={mid} y2={mid} className="stroke-muted" strokeDasharray="3 3" />
        <text x={0} y={mid + 3} className="fill-muted text-[10px]">50%</text>
      </svg>
    </div>
  )
}

/** Predicted chance vs how often it happened. Dots near the diagonal mean honest probabilities. */
export function CalibrationChart({ rows }: { rows: CalibrationRow[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const size = Math.min(width, 360)
  const lo = 0.45, hi = 0.55, pad = 30
  const x = (v: number) => pad + ((v - lo) / (hi - lo)) * (size - pad - 8)
  const y = (v: number) => size - pad - ((v - lo) / (hi - lo)) * (size - pad - 8)
  const maxN = Math.max(...rows.map((r) => r.n))
  const clamp = (v: number) => Math.min(hi, Math.max(lo, v))
  return (
    <div ref={ref}>
      <svg width={size} height={size} role="img" className="block"
        aria-label="Calibration chart: the chance Parakh gave versus how often stocks actually beat the index, between 45 and 55 percent. Points close to the diagonal mean the stated chances can be taken at face value.">
        <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} className="stroke-line-2" strokeDasharray="4 4" />
        <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(lo)} className="stroke-line" />
        <line x1={x(lo)} y1={y(lo)} x2={x(lo)} y2={y(hi)} className="stroke-line" />
        {rows.map((r) => (
          <circle key={r.predicted} cx={x(clamp(r.predicted))} cy={y(clamp(r.actual))} r={3 + 6 * Math.sqrt(r.n / maxN)}
            className="fill-ink" fillOpacity={0.7} />
        ))}
        {[lo, 0.5, hi].map((v) => (
          <g key={v}>
            <text x={x(v)} y={size - pad + 16} textAnchor="middle" className={label}>{Math.round(v * 100)}%</text>
            <text x={pad - 6} y={y(v) + 3} textAnchor="end" className={label}>{Math.round(v * 100)}%</text>
          </g>
        ))}
        <text x={x(hi)} y={y(hi) + 14} textAnchor="end" className="fill-muted text-[10px]">perfectly honest</text>
      </svg>
    </div>
  )
}

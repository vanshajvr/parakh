import type { Day } from '../../lib/sim/engine'
import { money } from '../../lib/format'

type Props = {
  you: Day[]
  fund: Day[]
  /** Days in the whole period, so the lines grow across a fixed width as time plays. */
  length: number
  startLabel: string
  endLabel: string
  label: string
  youLabel: string
  fundLabel: string
}

const W = 640, H = 240, PAD_X = 8, PAD_TOP = 12, PAD_BOTTOM = 8

/**
 * Your money against the same money left in the index fund. Neutral ink for you and a dashed
 * grey for the fund: blue and orange stay reserved for Parakh's leans (D-018).
 */
export function ValueChart({ you, fund, length, startLabel, endLabel, label, youLabel, fundLabel }: Props) {
  const values = [...you, ...fund].map((d) => d.value)
  const lo = Math.min(...values), hi = Math.max(...values)
  const pad = (hi - lo) * 0.08 || hi * 0.05 || 1
  const min = lo - pad, max = hi + pad
  const x = (i: number) => PAD_X + (i / Math.max(1, length - 1)) * (W - 2 * PAD_X)
  const y = (v: number) => PAD_TOP + (1 - (v - min) / (max - min)) * (H - PAD_TOP - PAD_BOTTOM)
  const path = (days: Day[]) => days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('')
  const now = you.at(-1)
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-4 rounded bg-ink" />{youLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="w-4 border-t-2 border-dashed border-muted" />{fundLabel}</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-56 w-full lg:h-72" role="img" aria-label={label}>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={W} y1={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)} y2={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
              stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={path(fund)} fill="none" stroke="var(--muted)" strokeWidth={2} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          <path d={path(you)} fill="none" stroke="var(--ink)" strokeWidth={2.25} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {now && <circle cx={x(you.length - 1)} cy={y(now.value)} r={4} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
        </svg>
        <span className="pointer-events-none absolute top-0 right-0 text-[11px] text-muted tabular-nums">{money(max)}</span>
        <span className="pointer-events-none absolute right-0 bottom-0 text-[11px] text-muted tabular-nums">{money(min)}</span>
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </figure>
  )
}

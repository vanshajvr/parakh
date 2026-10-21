import { useState, type PointerEvent } from 'react'
import { inRange, nearestIndex, niceTicks, type Marker, type Point, type Range } from '../lib/chart'
import { price, shortDate } from '../lib/format'
import { useElementWidth } from '../lib/useElementWidth'

const RANGES: Range[] = ['1M', '6M', '1Y']
const PAD = { top: 8, right: 4, bottom: 22, left: 4 }

const monthLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })

type Props = { name: string; points: Point[]; markers: Marker[]; height?: number }

/** Price line with past calls marked: colour = lean, filled = right, hollow = wrong (decision D-020). */
export function PriceChart({ name, points: all, markers: allMarkers, height = 200 }: Props) {
  const [range, setRange] = useState<Range>('1Y')
  const [hover, setHover] = useState<number | null>(null)
  const [ref, width] = useElementWidth<HTMLDivElement>()

  const points = inRange(all, range)
  if (points.length < 2) return <p className="m-0 text-sm text-muted">Not enough price history to draw a chart.</p>

  const closes = points.map((p) => p.close)
  const lo = Math.min(...closes) * 0.985
  const hi = Math.max(...closes) * 1.01
  const innerW = width - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * innerW
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH
  const index = new Map(points.map((p, i) => [p.date, i]))
  const visible = allMarkers.filter((m) => index.has(m.date))

  const months: { label: string; i: number }[] = []
  points.forEach((p, i) => {
    const month = p.date.slice(0, 7)
    if (i > 0 && month !== points[i - 1].date.slice(0, 7)) months.push({ label: monthLabel(p.date), i })
  })
  const every = Math.ceil(months.length / 4) || 1
  const shown = hover ?? points.length - 1

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    setHover(nearestIndex(points.length, (e.clientX - box.left - PAD.left) / innerW))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-2" aria-live="polite">
          {shortDate(points[shown].date)} · <strong className="font-semibold text-ink">{price(points[shown].close)}</strong>
        </span>
        <div role="group" aria-label="Chart range" className="flex gap-1 rounded-full bg-chip p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => { setRange(r); setHover(null) }}
              className={`h-8 cursor-pointer rounded-full px-3 text-xs ${range === r ? 'bg-surface font-semibold text-ink shadow-sm' : 'font-medium text-muted'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div ref={ref} className="w-full">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${name}'s price over the selected period, from ${price(points[0].close)} to ${price(points[points.length - 1].close)}, with ${visible.length} past calls marked`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="block touch-pan-y overflow-visible"
        >
          {niceTicks(lo, hi).map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-chip" />
              <text x={PAD.left + 2} y={y(t) - 4} className="fill-muted text-[10px]">{price(t).replace(/\.00$/, '')}</text>
            </g>
          ))}
          {months.filter((_, k) => k % every === 0).map((m) => (
            <text key={m.i} x={x(m.i)} y={height - 4} className="fill-muted text-[10px]">{m.label}</text>
          ))}
          <polyline
            fill="none"
            strokeWidth={1.75}
            strokeLinejoin="round"
            className="stroke-ink"
            points={points.map((p, i) => `${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(' ')}
          />
          {visible.map((m) => {
            const i = index.get(m.date)!
            const colour = m.lean === 'bullish' ? 'var(--bull)' : 'var(--bear-mark)'
            return (
              <circle
                key={m.date}
                cx={x(i)}
                cy={y(points[i].close)}
                r={m.live ? 5 : 3.5}
                stroke={m.live && m.hit == null ? 'var(--ink)' : colour}
                strokeWidth={1.6}
                fill={m.hit ? colour : 'var(--surface)'}
              />
            )
          })}
          {hover != null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={height - PAD.bottom} className="stroke-line-2" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(points[hover].close)} r={4} className="fill-ink" />
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}

export function ChartLegend() {
  const dot = (fill: string, stroke = fill) => (
    <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.8" fill={fill} stroke={stroke} strokeWidth="1.4" /></svg>
  )
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5">{dot('var(--bull)')}Bullish call</span>
        <span className="inline-flex items-center gap-1.5">{dot('var(--bear-mark)')}Bearish call</span>
        <span className="inline-flex items-center gap-1.5">{dot('var(--muted)')}Filled = right</span>
        <span className="inline-flex items-center gap-1.5">{dot('var(--surface)', 'var(--muted)')}Hollow = wrong</span>
      </div>
      <p className="m-0 text-xs leading-relaxed text-muted">
        Small markers are simulated calls from testing. Larger ones are live calls; they're outlined until they're scored.
      </p>
    </div>
  )
}

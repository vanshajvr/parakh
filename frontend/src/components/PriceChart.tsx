import { useState, type PointerEvent } from 'react'
import { candleReading, hasCandles, inRange, nearestIndex, niceTicks, type Marker, type Point, type Range } from '../lib/chart'
import { price, shortDate } from '../lib/format'
import { useElementWidth } from '../lib/useElementWidth'

const RANGES: Range[] = ['1M', '3M', '6M', '1Y']
const PAD = { top: 8, right: 4, bottom: 22, left: 4 }

const monthLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })

export type ChartStyle = 'line' | 'candles'

type Props = {
  name: string
  points: Point[]
  markers?: Marker[]
  height?: number
  defaultRange?: Range
  defaultStyle?: ChartStyle
  /** How values are written: rupees for stocks, plain points for the index. */
  format?: (v: number) => string
}

/**
 * Price chart with past calls marked: colour = lean, filled = right, hollow = wrong (decision D-020).
 * With open/high/low data it can also draw daily candles in neutral ink: hollow when the day closed
 * above its open, filled when it closed below (decision D-028). Call markers sit above the candles.
 */
export function PriceChart({ name, points: all, markers: allMarkers = [], height = 200, defaultRange = '1Y', defaultStyle = 'line', format = price }: Props) {
  const [range, setRange] = useState<Range>(defaultRange)
  const [chosenStyle, setStyle] = useState<ChartStyle>(defaultStyle)
  const [hover, setHover] = useState<number | null>(null)
  const [ref, width] = useElementWidth<HTMLDivElement>()

  const points = inRange(all, range)
  if (points.length < 2) return <p className="m-0 text-sm text-muted">Not enough price history to draw a chart.</p>

  const candles = hasCandles(points) ? points : null
  const style: ChartStyle = candles ? chosenStyle : 'line'
  const lows = style === 'candles' && candles ? candles.map((c) => c.low) : points.map((p) => p.close)
  const highs = style === 'candles' && candles ? candles.map((c) => c.high) : points.map((p) => p.close)
  const lo = Math.min(...lows) * 0.985
  const hi = Math.max(...highs) * 1.01
  const innerW = width - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * innerW
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH
  const index = new Map(points.map((p, i) => [p.date, i]))
  const visible = allMarkers.filter((m) => index.has(m.date))
  const bodyW = Math.max(1, Math.min(9, (innerW / points.length) * 0.62))

  const months: { label: string; i: number }[] = []
  points.forEach((p, i) => {
    const month = p.date.slice(0, 7)
    if (i > 0 && month !== points[i - 1].date.slice(0, 7)) months.push({ label: monthLabel(p.date), i })
  })
  const every = Math.ceil(months.length / 4) || 1
  const shown = hover ?? points.length - 1
  const shownCandle = style === 'candles' && candles ? candles[shown] : null
  const prevClose = shown > 0 ? points[shown - 1].close : null
  const markerY = (i: number) => (style === 'candles' && candles ? y(candles[i].high) - 7 : y(points[i].close))

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    setHover(nearestIndex(points.length, (e.clientX - box.left - PAD.left) / innerW))
  }

  const toggle = (options: readonly string[], value: string, onChange: (v: string) => void, label: string) => (
    <div role="group" aria-label={label} className="flex gap-1 rounded-full bg-chip p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => { onChange(o); setHover(null) }}
          className={`h-8 cursor-pointer rounded-full px-3 text-xs capitalize ${value === o ? 'bg-surface font-semibold text-ink shadow-sm' : 'font-medium text-muted'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-ink-2" aria-live="polite">
          {shortDate(points[shown].date)} ·{' '}
          {shownCandle ? (
            <span className="tabular-nums">
              <span className="whitespace-nowrap">O {format(shownCandle.open)}</span> ·{' '}
              <span className="whitespace-nowrap">H {format(shownCandle.high)}</span> ·{' '}
              <span className="whitespace-nowrap">L {format(shownCandle.low)}</span> ·{' '}
              <strong className="font-semibold whitespace-nowrap text-ink">C {format(shownCandle.close)}</strong>
            </span>
          ) : (
            <strong className="font-semibold text-ink">{format(points[shown].close)}</strong>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          {candles && toggle(['line', 'candles'], style, (v) => setStyle(v as ChartStyle), 'Chart style')}
          {toggle(RANGES, range, (v) => setRange(v as Range), 'Chart range')}
        </div>
      </div>
      <div ref={ref} className="w-full">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${name}'s price over the selected period, from ${format(points[0].close)} to ${format(points[points.length - 1].close)}${visible.length ? `, with ${visible.length} past calls marked` : ''}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="block touch-pan-y overflow-visible"
        >
          {niceTicks(lo, hi).map((t) => (
            <line key={t} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-chip" />
          ))}
          {months.filter((_, k) => k % every === 0).map((m) => (
            <text key={m.i} x={x(m.i)} y={height - 4} className="fill-muted text-[10px]">{m.label}</text>
          ))}
          {style === 'candles' && candles ? (
            candles.map((c, i) => {
              const up = c.close >= c.open
              const top = y(Math.max(c.open, c.close)), bottom = y(Math.min(c.open, c.close))
              return (
                <g key={c.date}>
                  <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke="var(--ink-2)" strokeWidth={1} />
                  <rect
                    x={x(i) - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bottom - top)}
                    fill={up ? 'var(--surface)' : 'var(--ink-2)'} stroke="var(--ink-2)" strokeWidth={1}
                  />
                </g>
              )
            })
          ) : (
            <polyline
              fill="none"
              strokeWidth={1.75}
              strokeLinejoin="round"
              className="stroke-ink"
              points={points.map((p, i) => `${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(' ')}
            />
          )}
          {/* Price labels after the series, with a halo, so candles never hide them. */}
          {niceTicks(lo, hi).map((t) => (
            <text key={t} x={PAD.left + 2} y={y(t) - 4} className="fill-muted text-[10px]"
              stroke="var(--surface)" strokeWidth={3} paintOrder="stroke">{format(t).replace(/\.00$/, '')}</text>
          ))}
          {visible.map((m) => {
            const i = index.get(m.date)!
            const colour = m.lean === 'bullish' ? 'var(--bull)' : 'var(--bear-mark)'
            return (
              <circle
                key={m.date}
                cx={x(i)}
                cy={markerY(i)}
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
              {style === 'line' && <circle cx={x(hover)} cy={y(points[hover].close)} r={4} className="fill-ink" />}
            </g>
          )}
        </svg>
      </div>
      {shownCandle && (
        <p className="m-0 text-[13px] leading-relaxed text-ink-2" aria-live="polite">
          <span className="font-medium text-ink">{hover == null ? 'Latest day' : shortDate(shownCandle.date)}:</span>{' '}
          {candleReading(shownCandle, prevClose, format)}
        </p>
      )}
    </div>
  )
}

export function ChartLegend({ candles = false }: { candles?: boolean }) {
  const dot = (fill: string, stroke = fill) => (
    <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.8" fill={fill} stroke={stroke} strokeWidth="1.4" /></svg>
  )
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5">{dot('var(--bull)')}Bullish call</span>
        <span className="inline-flex items-center gap-1.5">{dot('var(--bear-mark)')}Bearish call</span>
        <span className="inline-flex items-center gap-1.5">{dot('var(--muted)')}Filled dot = right</span>
        <span className="inline-flex items-center gap-1.5">{dot('var(--surface)', 'var(--muted)')}Hollow dot = wrong</span>
        {candles && <CandleKey />}
      </div>
      <p className="m-0 text-xs leading-relaxed text-muted">
        Small markers are simulated calls from testing. Larger ones are live calls; they're outlined until they're scored.
      </p>
    </div>
  )
}

/** "Hollow candle = closed above its open; filled = closed below", for chart legends. */
export function CandleKey() {
  const candle = (fill: string) => (
    <svg width="9" height="14" aria-hidden="true">
      <line x1="4.5" x2="4.5" y1="0" y2="14" stroke="var(--ink-2)" />
      <rect x="1" y="3" width="7" height="8" fill={fill} stroke="var(--ink-2)" />
    </svg>
  )
  return (
    <>
      <span className="inline-flex items-center gap-1.5">{candle('var(--surface)')}Hollow candle = closed above its open</span>
      <span className="inline-flex items-center gap-1.5">{candle('var(--ink-2)')}Filled candle = closed below its open</span>
    </>
  )
}

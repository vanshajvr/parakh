import { useI18n } from '../i18n'

// Standard candle colours (decision D-029). Blue and orange stay reserved for Parakh's leans.
export const UP = '#26a69a'
export const DOWN = '#ef5350'

/** What the chart's marks mean. `calls` adds the past-call markers used on stock pages. */
export function ChartKey({ calls = false }: { calls?: boolean }) {
  const { m } = useI18n()
  const k = m.chart.key
  const candle = (colour: string) => (
    <svg width="9" height="14" aria-hidden="true">
      <line x1="4.5" x2="4.5" y1="0" y2="14" stroke={colour} />
      <rect x="1" y="3" width="7" height="8" fill={colour} />
    </svg>
  )
  const dot = (colour: string) => <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill={colour} /></svg>
  const line = (colour: string, w: number) => <span aria-hidden className="w-3.5 rounded" style={{ height: w, background: colour }} />
  return (
    <div className="flex flex-col gap-2 text-xs text-ink-2">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5">{candle(UP)}{k.green}</span>
        <span className="inline-flex items-center gap-1.5">{candle(DOWN)}{k.red}</span>
        <span className="inline-flex items-center gap-1.5">{line('var(--ink-2)', 1)}{k.closeLine}</span>
        <span className="inline-flex items-center gap-1.5">{line('var(--link)', 2)}{k.average}</span>
        {calls && (
          <>
            <span className="inline-flex items-center gap-1.5">{dot('var(--bull)')}{k.bullish}</span>
            <span className="inline-flex items-center gap-1.5">{dot('var(--bear-mark)')}{k.bearish}</span>
            <span>{k.marks}</span>
          </>
        )}
      </div>
      {calls && (
        <p className="m-0 leading-relaxed text-muted">{k.dots}</p>
      )}
      <p className="m-0 leading-relaxed text-muted">{k.howTo}</p>
    </div>
  )
}

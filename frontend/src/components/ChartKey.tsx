// Standard candle colours (decision D-029). Blue and orange stay reserved for Parakh's leans.
export const UP = '#26a69a'
export const DOWN = '#ef5350'

/** What the chart's marks mean. `calls` adds the past-call markers used on stock pages. */
export function ChartKey({ calls = false }: { calls?: boolean }) {
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
        <span className="inline-flex items-center gap-1.5">{candle(UP)}Green candle = closed above its open</span>
        <span className="inline-flex items-center gap-1.5">{candle(DOWN)}Red candle = closed below its open</span>
        <span className="inline-flex items-center gap-1.5">{line('var(--ink-2)', 1)}Close line</span>
        <span className="inline-flex items-center gap-1.5">{line('var(--link)', 2)}20-day average: the trend, smoothed</span>
        {calls && (
          <>
            <span className="inline-flex items-center gap-1.5">{dot('var(--bull)')}Bullish call</span>
            <span className="inline-flex items-center gap-1.5">{dot('var(--bear-mark)')}Bearish call</span>
            <span>✓ right · ✗ wrong</span>
          </>
        )}
      </div>
      {calls && (
        <p className="m-0 leading-relaxed text-muted">
          Small dots are simulated calls from testing; larger ones are live calls, with no mark until they're scored.
        </p>
      )}
      <p className="m-0 leading-relaxed text-muted">Scroll or pinch to zoom, drag to move through time, and hover or tap a day to read it.</p>
    </div>
  )
}

import type { StockDetail } from '../api/client'

export type Range = '1M' | '6M' | '1Y'
export const RANGE_DAYS: Record<Range, number> = { '1M': 31, '6M': 183, '1Y': 366 }

export type Point = { date: string; close: number }
export type Marker = { date: string; lean: 'bullish' | 'bearish'; hit: boolean | null; live: boolean }

/** Prices within `range` of the latest date. */
export function inRange(points: Point[], range: Range): Point[] {
  if (points.length === 0) return points
  const last = new Date(points[points.length - 1].date).getTime()
  const cutoff = last - RANGE_DAYS[range] * 86_400_000
  return points.filter((p) => new Date(p.date).getTime() >= cutoff)
}

/** Past calls on this stock as chart markers. Live calls win over simulated ones on the same day. */
export function markers(stock: StockDetail): Marker[] {
  const live = new Map<string, Marker>()
  for (const c of stock.live_calls) {
    if (c.lean === 'no_call') continue
    live.set(c.as_of, { date: c.as_of, lean: c.lean, hit: c.hit ?? null, live: true })
  }
  const simulated = stock.simulated_calls
    .filter((c) => c.lean !== 'no_call' && !live.has(c.date))
    .map((c) => ({
      date: c.date,
      lean: c.lean as Marker['lean'],
      hit: (c.lean === 'bullish') === c.beat_index,
      live: false,
    }))
  return [...simulated, ...live.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** About `target` round price levels within [lo, hi], e.g. 4000, 4500, 5000. */
export function niceTicks(lo: number, hi: number, target = 3): number[] {
  const magnitude = 10 ** Math.floor(Math.log10((hi - lo) / target))
  const tickCount = (step: number) => Math.floor(hi / step) - Math.ceil(lo / step) + 1
  // The round step whose tick count is closest to the target, preferring more ticks on a tie.
  const step = [1, 2, 2.5, 5, 10]
    .map((m) => m * magnitude)
    .reduce((best, s) => {
      const d = Math.abs(tickCount(s) - target), bestD = Math.abs(tickCount(best) - target)
      return d < bestD || (d === bestD && tickCount(s) > tickCount(best)) ? s : best
    })
  const ticks: number[] = []
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(Math.round(t * 100) / 100)
  return ticks
}

/** Index of the point nearest to a fraction (0–1) of the way across the chart. */
export function nearestIndex(n: number, fraction: number): number {
  return Math.min(n - 1, Math.max(0, Math.round(fraction * (n - 1))))
}

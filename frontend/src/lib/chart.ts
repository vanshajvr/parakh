import type { StockDetail } from '../api/client'
import { en, type Messages } from '../i18n/en'

export type Range = '1M' | '3M' | '6M' | '1Y'
export const RANGE_DAYS: Record<Range, number> = { '1M': 31, '3M': 92, '6M': 183, '1Y': 366 }

/** One trading day's prices. */
export type Candle = { date: string; open: number; high: number; low: number; close: number }

/**
 * One day's candle in plain words. A candle's colour compares the close with that day's open, not
 * with the day before, which is a common beginner confusion, so both are spelled out.
 */
export function candleReading(c: Candle, prevClose: number | null, fmt: (v: number) => string, m: Messages = en): string {
  const change = prevClose == null ? null : (c.close / prevClose - 1) * 100
  return m.chart.reading(fmt(c.low), fmt(c.high), fmt(c.open), fmt(c.close), c.close >= c.open, change)
}
export type Marker = { date: string; lean: 'bullish' | 'bearish'; hit: boolean | null; live: boolean }

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


/** Trailing n-day average of `values`; null until there are n values to average. */
export function movingAverage(values: number[], n: number): (number | null)[] {
  let sum = 0
  return values.map((v, i) => {
    sum += v
    if (i >= n) sum -= values[i - n]
    return i >= n - 1 ? sum / n : null
  })
}

import type { StockDetail } from '../api/client'

export type Range = '1M' | '3M' | '6M' | '1Y'
export const RANGE_DAYS: Record<Range, number> = { '1M': 31, '3M': 92, '6M': 183, '1Y': 366 }

/** One trading day's prices. */
export type Candle = { date: string; open: number; high: number; low: number; close: number }

/**
 * One day's candle in plain words. A candle's colour compares the close with that day's open, not
 * with the day before, which is a common beginner confusion, so both are spelled out.
 */
export function candleReading(c: Candle, prevClose: number | null, fmt: (v: number) => string): string {
  const body = c.close >= c.open
    ? `closed above where it opened (${fmt(c.open)} → ${fmt(c.close)}), so the candle is green`
    : `closed below where it opened (${fmt(c.open)} → ${fmt(c.close)}), so the candle is red`
  const range = `It traded between ${fmt(c.low)} and ${fmt(c.high)} during the day`
  if (prevClose == null) return `${range}, and ${body}.`
  const change = (c.close / prevClose - 1) * 100
  const vsYesterday = Math.abs(change) < 0.005 ? 'unchanged from' : `${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% from`
  return `${range}, and ${body}. That close was ${vsYesterday} the day before.`
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

import type { Signal } from '../api/client'
import { capitalize, count, pct } from './format'

/** The factors that pushed the call in its own direction, strongest first (as in the API's reason). */
export function drivers(signal: Signal, n = 2): string[] {
  const direction = signal.lean === 'bullish' ? 'towards outperforming' : 'towards lagging'
  return signal.factors.filter((f) => f.pushes === direction).slice(0, n).map((f) => capitalize(f.text))
}

/** "51.5% chance it lags the index" for a bearish call, "beats" for a bullish one. */
export function chance(signal: Signal): string {
  if (signal.lean === 'bearish') return `${pct(1 - signal.p_outperform)} chance it lags the index`
  return `${pct(signal.p_outperform)} chance it beats the index`
}

export function headline(signal: Signal): string {
  if (signal.lean === 'bullish') return 'Leaning towards outperforming the NIFTY 50.'
  if (signal.lean === 'bearish') return 'Leaning towards lagging the NIFTY 50. The data suggests waiting.'
  return 'No clear edge today: the signals are mixed or weak.'
}

const WEAK = /\b(below|down|fell|underperformed|oversold|bottom)\b/
const STRONG = /\b(above|up|rose|outperformed|overbought|top)\b/

/**
 * True when the top factor seems to point the "wrong" way for the lean, e.g. a bullish call driven
 * by a falling trend. The model often bets on reversals, and the UI should say so (decision D-013).
 */
export function looksLikeReversal(signal: Signal): boolean {
  const top = drivers(signal, 1)[0]?.toLowerCase() ?? ''
  if (signal.lean === 'bullish') return WEAK.test(top)
  if (signal.lean === 'bearish') return STRONG.test(top)
  return false
}

/** Short receipt that stays visible on a collapsed card. */
export function receiptShort(signal: Signal): string | null {
  const r = signal.receipt
  return r.band_hit_rate == null ? null : `${pct(r.band_hit_rate)} right in testing`
}

/** Full receipt shown when a card is expanded. */
export function receiptLong(signal: Signal): string {
  const r = signal.receipt
  const parts: string[] = []
  if (r.band_hit_rate != null) {
    parts.push(`${signal.confidence} calls were right ${pct(r.band_hit_rate)} of the time across ${count(r.band_n_calls)} testing calls.`)
  }
  if (r.stock_hit_rate != null) {
    parts.push(`On ${signal.name} specifically: ${pct(r.stock_hit_rate)} over ${count(r.stock_n_calls)} calls.`)
  }
  if (r.stock_below_coin_flip) {
    parts.push('With this few calls, part of that gap from 50% may be chance, but weigh this call with it in mind.')
  }
  return parts.join(' ')
}

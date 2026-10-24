import type { Signal, Today } from '../api/client'
import { en, type Messages } from '../i18n/en'
import { capitalize, count, pct } from './format'

/** The factors that pushed the call in its own direction, strongest first (as in the API's reason). */
function pushing(signal: Signal) {
  const direction = signal.lean === 'bullish' ? 'towards outperforming' : 'towards lagging'
  return signal.factors.filter((f) => f.pushes === direction)
}

/** Those factors as sentences, in the reader's language. */
export function drivers(signal: Signal, n = 2, m: Messages = en): string[] {
  return pushing(signal).slice(0, n).map((f) => capitalize(m.call.factor(f.feature, f.value) ?? f.text))
}

/** "51.5% chance it lags the index" for a bearish call, "beats" for a bullish one. */
export function chance(signal: Signal, m: Messages = en): string {
  if (signal.lean === 'bearish') return m.call.chanceLags(pct(1 - signal.p_outperform))
  return m.call.chanceBeats(pct(signal.p_outperform))
}

export function headline(signal: Signal, m: Messages = en): string {
  return m.call.headline[signal.lean]
}

const WEAK = /\b(below|down|fell|underperformed|oversold|bottom)\b/
const STRONG = /\b(above|up|rose|outperformed|overbought|top)\b/

/**
 * True when the top factor seems to point the "wrong" way for the lean, e.g. a bullish call driven
 * by a falling trend. The model often bets on reversals, and the UI should say so (decision D-013).
 */
export function looksLikeReversal(signal: Signal): boolean {
  const top = pushing(signal)[0]?.text.toLowerCase() ?? ''
  if (signal.lean === 'bullish') return WEAK.test(top)
  if (signal.lean === 'bearish') return STRONG.test(top)
  return false
}

type Receipt = Signal['receipt']

/** "likely 41–53%": the range the stock's true hit rate probably sits in, or null if unknown. */
export function stockRange(r: Receipt, m: Messages = en): string | null {
  if (r.stock_hit_low == null || r.stock_hit_high == null) return null
  return m.call.range(Math.round(r.stock_hit_low * 100), Math.round(r.stock_hit_high * 100))
}

/** What a below-50% record on one stock does and doesn't tell you (decision D-024). */
export function stockCaveat(r: Receipt, m: Messages = en): string {
  return r.stock_clearly_below ? m.call.caveatClear : m.call.caveatMaybe
}

/** Short receipt that stays visible on a collapsed card. */
export function receiptShort(signal: Signal, m: Messages = en): string | null {
  const r = signal.receipt
  return r.band_hit_rate == null ? null : m.call.rightInTesting(pct(r.band_hit_rate))
}

/** Full receipt shown when a card is expanded. */
export function receiptLong(signal: Signal, m: Messages = en): string {
  const r = signal.receipt
  const parts: string[] = []
  if (r.band_hit_rate != null) parts.push(m.call.receiptAll(pct(r.band_hit_rate), count(r.band_n_calls)))
  if (r.stock_hit_rate != null) {
    parts.push(m.call.receiptStock(signal.name, pct(r.stock_hit_rate), count(r.stock_n_calls), stockRange(r, m)))
  }
  if (r.stock_below_coin_flip) parts.push(stockCaveat(r, m))
  return parts.join(' ')
}

export type OpenCall = Today['open_calls'][number]

/** "ahead of the index by 2.0%" / "behind the index by 0.8%" */
export function gapText(excess: number, m: Messages = en): string {
  const size = pct(Math.abs(excess))
  return excess >= 0 ? m.openCalls.ahead(size) : m.openCalls.behind(size)
}

export function statusText(call: OpenCall, m: Messages = en): string {
  if (call.on_track == null) return m.openCalls.startsNext
  return call.on_track ? m.openCalls.onTrack : m.openCalls.offTrack
}

type NoCall = NonNullable<Signal['no_call']>

/** How close a no-call stock came to a call: 0 at the average, 1 at the line where calls began. */
export function closeness(d: NoCall): number | null {
  return d.calls_from == null ? null : Math.min(1, Math.abs(d.move) / Math.abs(d.calls_from))
}

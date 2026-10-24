import type { Signal, Today } from '../api/client'
import { en, type Messages } from '../i18n/en'
import { closeness, gapText } from './calls'
import { pct } from './format'

export type Suggestion = { text: string; to: string }

const RULE = 'ret_5d_vs_peers'

/**
 * Up to four things worth a look today, built from the day's data: the clearest call, the stock
 * that came closest to one, a call in progress, and the biggest move. The glossary closes the list.
 */
export function suggestions(data: Today, m: Messages = en): Suggestion[] {
  const out: Suggestion[] = []
  const page = (s: { symbol: string }) => `/stocks/${s.symbol}`
  // Each suggestion is about a different stock.
  const fresh = (s: { symbol: string }) => !out.some((o) => o.to === page(s))
  const calls = data.signals.filter((s) => s.lean !== 'no_call')

  const strongest = [...calls].sort((a, b) => Math.abs(b.p_outperform - 0.5) - Math.abs(a.p_outperform - 0.5))[0]
  if (strongest) {
    const move = strongest.factors.find((f) => f.feature === RULE)?.value
    out.push({
      text: move == null
        ? m.suggest.strongest(strongest.symbol)
        : m.suggest.strongestRule(strongest.symbol, pct(Math.abs(move)), move > 0, m.lean[strongest.lean]),
      to: page(strongest),
    })
  }

  const near = data.signals
    .filter((s): s is Signal & { no_call: NonNullable<Signal['no_call']> } => s.no_call != null && fresh(s))
    .map((s) => ({ s, share: closeness(s.no_call) ?? 0 }))
    .sort((a, b) => b.share - a.share)[0]
  if (near && near.share > 0) out.push({ text: m.suggest.closest(near.s.symbol, near.share), to: page(near.s) })

  const running = (data.open_calls ?? []).filter((c) => c.as_of !== data.as_of && c.excess_return != null && fresh(c))
  const furthest = [...running].sort((a, b) => Math.abs(b.excess_return!) - Math.abs(a.excess_return!))[0]
  if (furthest) {
    out.push({ text: m.suggest.open(furthest.symbol, gapText(furthest.excess_return!, m), furthest.sessions_done, furthest.horizon), to: page(furthest) })
  } else {
    const mover = data.signals.filter((s) => s.change_1d != null && fresh(s)).sort((a, b) => Math.abs(b.change_1d!) - Math.abs(a.change_1d!))[0]
    if (mover) out.push({ text: m.suggest.mover(mover.symbol, pct(Math.abs(mover.change_1d!)), mover.change_1d! > 0), to: page(mover) })
  }

  out.push({ text: m.suggest.glossary, to: '/glossary' })
  return out
}

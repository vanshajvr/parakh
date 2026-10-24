import type { Market, Result } from './engine'
import { salesInFalls, summarise, type Summary } from './results'

/**
 * The report card (decision D-040): what a finished game says about the choices made in it. Each
 * note points at one short lesson. Notes describe what happened next in the data, never what the
 * player "should" have done: the period is over, and hindsight is easy.
 */

export type PromptKind = 'fall' | 'rise' | 'drawdown'
export type Choice = 'hold' | 'sell' | 'buy'

/** A moment the game stopped to ask, and what the player chose. */
export type Prompt = { day: number; kind: PromptKind; change: number; choice?: Choice }

export type LessonId = 'panic' | 'fomo' | 'timeInMarket' | 'costs' | 'cash' | 'concentration' | 'luck' | 'indexFund' | 'survivorship' | 'sip'

export type Note =
  | { kind: 'decision'; prompt: Prompt & { choice: Choice }; fundAfter: number | null; lesson: LessonId }
  | { kind: 'fallSale'; day: number; symbol: string; marketFall: number; fundAfter: number | null; lesson: 'panic' }
  | { kind: 'costs'; charges: number; trades: number; shareOfGain: number | null; lesson: 'costs' }
  | { kind: 'cash'; share: number; lesson: 'cash' }
  | { kind: 'concentration'; symbol: string; share: number; lesson: 'concentration' }
  | { kind: 'stockPicking'; lesson: 'survivorship' }
  | { kind: 'sip'; instalments: number; lesson: 'sip' }
  | { kind: 'result'; gap: number; lesson: 'luck' | 'indexFund' }

export type Report = { you: Summary; fund: Summary; notes: Note[]; lessons: LessonId[] }

/** About a month of trading days: how far ahead "what happened next" looks. */
export const NEXT = 21
const MANY_TRADES = 6
const CASH_HEAVY = 0.3
const CONCENTRATED = 0.5

export function fundChange(market: Market, from: number, days = NEXT): number | null {
  const fund = market.close[market.indexFund]
  const a = fund[from], b = fund[Math.min(from + days, market.dates.length - 1)]
  return a != null && b != null ? b / a - 1 : null
}

function lessonFor(p: Prompt & { choice: Choice }): LessonId {
  if (p.choice === 'sell' && p.kind !== 'rise') return 'panic'
  if (p.choice === 'buy' && p.kind === 'rise') return 'fomo'
  return 'timeInMarket'
}

export function buildReport(market: Market, result: Result, fund: Result, prompts: Prompt[]): Report {
  const you = summarise(result), index = summarise(fund)
  const notes: Note[] = []

  const decided = prompts.filter((p): p is Prompt & { choice: Choice } => p.choice != null)
  for (const p of decided) notes.push({ kind: 'decision', prompt: p, fundAfter: fundChange(market, p.day), lesson: lessonFor(p) })

  // Sales in a fall that weren't already an answer to a prompt (those fill the morning after it).
  const answered = new Set(decided.filter((p) => p.choice === 'sell').map((p) => p.day + 1))
  for (const s of salesInFalls(market, result).filter((s) => !answered.has(s.day))) {
    notes.push({ kind: 'fallSale', day: s.day, symbol: s.symbol, marketFall: s.marketFall, fundAfter: s.fundAfter, lesson: 'panic' })
  }

  if (you.trades >= MANY_TRADES) {
    notes.push({ kind: 'costs', charges: you.chargesPaid, trades: you.trades, shareOfGain: you.gain > 0 ? you.chargesPaid / you.gain : null, lesson: 'costs' })
  }

  const cashShare = result.days.reduce((sum, d) => sum + (d.value > 0 ? d.cash / d.value : 0), 0) / Math.max(1, result.days.length)
  if (cashShare >= CASH_HEAVY) notes.push({ kind: 'cash', share: cashShare, lesson: 'cash' })

  const last = result.days.at(-1)?.day ?? 0
  const end = you.value
  const biggest = Object.entries(result.holdings)
    .filter(([s]) => s !== market.indexFund)
    .map(([symbol, qty]) => ({ symbol, share: end > 0 ? (qty * (market.close[symbol][last] ?? 0)) / end : 0 }))
    .sort((a, b) => b.share - a.share)[0]
  if (biggest && biggest.share >= CONCENTRATED) notes.push({ kind: 'concentration', ...biggest, lesson: 'concentration' })

  if (result.fills.some((f) => !f.sip && f.side === 'buy' && f.symbol !== market.indexFund)) notes.push({ kind: 'stockPicking', lesson: 'survivorship' })

  const instalments = result.fills.filter((f) => f.sip).length
  if (instalments > 1) notes.push({ kind: 'sip', instalments, lesson: 'sip' })

  const gap = you.value - index.value
  notes.push({ kind: 'result', gap, lesson: gap > 0 ? 'luck' : 'indexFund' })

  return { you, fund: index, notes, lessons: [...new Set(notes.map((n) => n.lesson))] }
}

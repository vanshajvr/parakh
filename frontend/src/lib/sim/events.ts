import type { Day, Market } from './engine'
import { growth } from './results'

/**
 * Moments when the game stops and asks what you'll do (decision D-039): a sharp fall or rise in
 * the market, or a deep fall in your own portfolio. At most one every 21 trading days (about a
 * month), so it doesn't nag.
 */

export type MarketEvent = { day: number; kind: 'fall' | 'rise'; change: number }
export type PortfolioEvent = { day: number; kind: 'drawdown'; change: number }

const FALL = -0.1, FALL_DAYS = 10
const RISE = 0.1, RISE_DAYS = 20
const DRAWDOWN = -0.15
export const COOLDOWN = 21

export function marketEvents(market: Market, start: number, end: number): MarketEvent[] {
  const fund = market.close[market.indexFund]
  const events: MarketEvent[] = []
  let quietUntil = start
  for (let d = start + 1; d <= end; d++) {
    const now = fund[d]
    if (now == null || d < quietUntil) continue
    const back = (n: number) => fund.slice(Math.max(start, d - n), d).filter((v): v is number => v != null)
    const high = Math.max(...back(FALL_DAYS)), low = Math.min(...back(RISE_DAYS))
    const event: MarketEvent | null =
      now / high - 1 <= FALL ? { day: d, kind: 'fall', change: now / high - 1 }
      : now / low - 1 >= RISE ? { day: d, kind: 'rise', change: now / low - 1 }
      : null
    if (event) {
      events.push(event)
      quietUntil = d + COOLDOWN
    }
  }
  return events
}

/** The day's portfolio event, if your holdings have just fallen 15% from their peak. */
export function portfolioEvent(days: Day[], quietSince: number | null): PortfolioEvent | null {
  const g = growth(days)
  const today = days.at(-1)
  if (!today || (quietSince != null && today.day - quietSince < COOLDOWN)) return null
  const change = g[g.length - 1] / Math.max(...g) - 1
  return change <= DRAWDOWN ? { day: today.day, kind: 'drawdown', change } : null
}

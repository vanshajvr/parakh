import type { Day, Market, Result } from './engine'

export type Summary = {
  value: number
  invested: number
  gain: number
  /** Gain over money put in. */
  returnPct: number
  /** The deepest fall from a peak, with SIP instalments taken out so new money doesn't hide it. */
  worstFall: number
  trades: number
  chargesPaid: number
}

/** Growth of ₹1 kept invested the whole time: each day's change with that day's new money left out. */
export function growth(days: Day[]): number[] {
  const out = [1]
  for (let i = 1; i < days.length; i++) {
    const before = days[i - 1].value
    out.push(before > 0 ? out[i - 1] * ((days[i].value - days[i].added) / before) : out[i - 1])
  }
  return out
}

export function worstFall(days: Day[]): number {
  let peak = -Infinity, worst = 0
  for (const g of growth(days)) {
    peak = Math.max(peak, g)
    worst = Math.min(worst, g / peak - 1)
  }
  return worst
}

export function summarise(result: Result): Summary {
  const last = result.days.at(-1)
  const value = last?.value ?? 0, invested = last?.invested ?? 0
  return {
    value,
    invested,
    gain: value - invested,
    returnPct: invested > 0 ? value / invested - 1 : 0,
    worstFall: worstFall(result.days),
    trades: result.fills.filter((f) => !f.sip).length,
    chargesPaid: result.chargesPaid,
  }
}

const FALL = -0.1
const LOOKBACK = 60
const AFTER = 20

export type FallSale = {
  day: number
  symbol: string
  /** How far the NIFTY 50 was below its 60-day high when you sold. */
  marketFall: number
  /** What the index fund did over the next 20 trading days. */
  fundAfter: number | null
}

/**
 * Sales made while the market was down 10% or more from its recent high, and what the index
 * fund did next. Selling in a fall is the most common, and most costly, beginner mistake.
 */
export function salesInFalls(market: Market, result: Result): FallSale[] {
  const fund = market.close[market.indexFund]
  return result.fills
    .filter((f) => f.side === 'sell')
    .flatMap((f) => {
      const window = market.index.slice(Math.max(0, f.day - LOOKBACK), f.day + 1).filter((v): v is number => v != null)
      const now = market.index[f.day]
      if (now == null || window.length === 0) return []
      const fall = now / Math.max(...window) - 1
      if (fall > FALL) return []
      const later = fund[Math.min(f.day + AFTER, market.dates.length - 1)], then = fund[f.day]
      return [{ day: f.day, symbol: f.symbol, marketFall: fall, fundAfter: later != null && then != null ? later / then - 1 : null }]
    })
}

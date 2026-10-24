import type { Game, Market } from './engine'

/**
 * The ready-made periods (decision D-039). Each teaches one thing; Mystery hides the dates, so
 * you can't lean on knowing how the story ended.
 */

export type ScenarioId = 'crash' | 'bull' | 'flat' | 'sip' | 'mystery'

export type Scenario = { id: ScenarioId; from: string; to: string | null; sip?: boolean; hideDates?: boolean }

export const SCENARIOS: Scenario[] = [
  { id: 'crash', from: '2020-01-01', to: '2020-12-31' },
  { id: 'bull', from: '2021-01-01', to: '2021-12-31' },
  // Mid-October 2021 to March 2023: about 18 months in which the NIFTY 50 went nowhere.
  { id: 'flat', from: '2021-10-18', to: '2023-03-31' },
  { id: 'sip', from: '2016-01-01', to: null, sip: true },
  { id: 'mystery', from: '2016-06-01', to: null, hideDates: true },
]

export const scenarioById = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!

/** The first trading day on or after `date`, and the last on or before it. */
export function dayOnOrAfter(market: Market, date: string): number {
  const i = market.dates.findIndex((d) => d >= date)
  return i < 0 ? market.dates.length - 1 : i
}
export function dayOnOrBefore(market: Market, date: string): number {
  for (let i = market.dates.length - 1; i >= 0; i--) if (market.dates[i] <= date) return i
  return 0
}

const MYSTERY_DAYS = { min: 250, max: 500 }

/** A small seeded generator, so a mystery game can be saved and replayed with the same window. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    return (s >>> 0) / 2 ** 32
  }
}

/** A new game for a scenario: its window as day indices, the starting cash and any SIP. */
export function newGame(market: Market, id: ScenarioId, cash: number, seed = Date.now()): Game {
  const s = scenarioById(id)
  let start = dayOnOrAfter(market, s.from)
  let end = s.to ? dayOnOrBefore(market, s.to) : market.dates.length - 1
  if (id === 'mystery') {
    const rand = seeded(seed)
    const length = MYSTERY_DAYS.min + Math.floor(rand() * (MYSTERY_DAYS.max - MYSTERY_DAYS.min))
    start = start + Math.floor(rand() * Math.max(1, end - start - length))
    end = Math.min(end, start + length)
  }
  // In the SIP scenario the amount is the monthly instalment, invested from the first day.
  return s.sip ? { start, end, cash: 0, orders: [], sip: { amount: cash } } : { start, end, cash, orders: [] }
}

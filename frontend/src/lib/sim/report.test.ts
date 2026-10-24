import { describe, expect, it } from 'vitest'
import fixture from '../../fixtures/sim-market.json'
import { indexFundGame, simulate, toMarket, type Game, type NewOrder, type SimMarket } from './engine'
import { buildReport, type Prompt } from './report'
import { dayOnOrAfter, newGame } from './scenarios'

const market = toMarket(fixture as SimMarket)
const base = newGame(market, 'crash', 100_000)
const at = (date: string) => dayOnOrAfter(market, date)
const play = (orders: (NewOrder & { day: number })[], prompts: Prompt[] = [], game: Game = base) => {
  const g = { ...game, orders }
  return buildReport(market, simulate(market, g), simulate(market, indexFundGame(market, g)), prompts)
}

describe('buildReport', () => {
  it('ties a sale in a prompt to the panic lesson, and says what the fund did next', () => {
    const day = at('2020-03-23')
    const r = play(
      [{ day: base.start, symbol: 'NIFTYBEES', side: 'buy', amount: 100_000 }, { day, symbol: 'NIFTYBEES', side: 'sell', qty: 1e6 }],
      [{ day, kind: 'fall', change: -0.2, choice: 'sell' }],
    )
    const decision = r.notes.find((n) => n.kind === 'decision')!
    expect(decision).toMatchObject({ lesson: 'panic' })
    expect(decision.kind === 'decision' && decision.fundAfter).toBeGreaterThan(0)
    // The same sale isn't reported twice.
    expect(r.notes.some((n) => n.kind === 'fallSale')).toBe(false)
    expect(r.lessons).toContain('panic')
  })

  it('notices buying after a jump, many trades, cash left idle and one big bet', () => {
    const jump = at('2020-04-13')
    const flips = Array.from({ length: 4 }, (_, i) => [
      { day: base.start + 10 + i * 4, symbol: 'TCS', side: 'buy' as const, amount: 60_000 },
      { day: base.start + 12 + i * 4, symbol: 'TCS', side: 'sell' as const, qty: 1e6 },
    ]).flat()
    const r = play([...flips, { day: jump, symbol: 'RELIANCE', side: 'buy', amount: 70_000 }], [{ day: jump, kind: 'rise', change: 0.14, choice: 'buy' }])
    const kinds = r.notes.map((n) => n.kind)
    expect(kinds).toEqual(expect.arrayContaining(['decision', 'costs', 'cash', 'concentration', 'stockPicking', 'result']))
    expect(r.lessons).toEqual(expect.arrayContaining(['fomo', 'costs', 'cash', 'concentration', 'survivorship']))
  })

  it('calls a win luck and a loss to the index fund what it is', () => {
    const left = play([{ day: base.start, symbol: 'NIFTYBEES', side: 'buy', amount: 100_000 }])
    expect(left.notes.at(-1)).toMatchObject({ kind: 'result', lesson: 'indexFund' })
    // Going to cash just before the crash and back in at the bottom beats the fund, in hindsight.
    const lucky = play([
      { day: at('2020-02-20'), symbol: 'NIFTYBEES', side: 'buy', amount: 1 }, // too small: no-op
      { day: at('2020-03-23'), symbol: 'NIFTYBEES', side: 'buy', amount: 100_000 },
    ])
    expect(lucky.notes.at(-1)).toMatchObject({ kind: 'result', lesson: 'luck' })
  })
})

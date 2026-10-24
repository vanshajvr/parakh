import { describe, expect, it } from 'vitest'
import fixture from '../../fixtures/sim-market.json'
import { charges } from './charges'
import { indexFundGame, simulate, toMarket, type Game, type Market, type SimMarket } from './engine'
import { marketEvents, COOLDOWN } from './events'
import { salesInFalls, summarise } from './results'
import { dayOnOrAfter, newGame } from './scenarios'

/** A tiny market: A trades at 100 every day, FUND at 10, and B only lists on day 3. */
function tiny(dates = ['2026-01-28', '2026-01-29', '2026-01-30', '2026-02-02', '2026-02-03', '2026-02-04']): Market {
  const n = dates.length
  const flat = (v: number | null) => Array.from({ length: n }, () => v)
  return {
    dates, symbols: ['A', 'B', 'FUND'], indexFund: 'FUND', index: flat(1000),
    open: { A: flat(100), B: [null, null, null, 50, 50, 50], FUND: flat(10) },
    close: { A: flat(100), B: [null, null, null, 50, null, 60], FUND: flat(10) },
    info: {},
  }
}

const game = (over: Partial<Game> = {}): Game => ({ start: 0, end: 5, cash: 10_000, orders: [], ...over })

describe('simulate', () => {
  it('fills orders at the next open, in whole shares, with charges', () => {
    const r = simulate(tiny(), game({ orders: [{ day: 0, symbol: 'A', side: 'buy', amount: 5_000 }] }))
    expect(r.fills).toEqual([expect.objectContaining({ day: 1, symbol: 'A', side: 'buy', qty: 49, price: 100 })])
    expect(r.days[0].value).toBe(10_000) // nothing happens until the next morning
    expect(r.cash).toBeCloseTo(10_000 - 4_900 - charges('buy', 4_900).total, 2)
    expect(r.days.at(-1)!.value).toBeCloseTo(r.cash + 4_900, 2)
  })

  it('refuses what a real broker would', () => {
    const r = simulate(tiny(), game({
      orders: [
        { day: 1, symbol: 'B', side: 'buy', amount: 1_000 }, // B hasn't listed yet
        { day: 1, symbol: 'A', side: 'buy', amount: 50 }, // less than one share
        { day: 1, symbol: 'A', side: 'sell', qty: 5 }, // nothing held
        { day: 5, symbol: 'A', side: 'buy', amount: 1_000 }, // no next morning left
      ],
    }))
    expect(r.rejections.map((x) => x.reason).sort()).toEqual(['game-over', 'no-price', 'nothing-to-sell', 'too-small'])
    expect(r.fills).toEqual([])
  })

  it('sells before it buys on the same morning, so money can be switched', () => {
    const r = simulate(tiny(), game({
      cash: 10_100,
      orders: [
        { day: 0, symbol: 'A', side: 'buy', amount: 10_100 },
        { day: 2, symbol: 'B', side: 'buy', amount: 9_000 },
        { day: 2, symbol: 'A', side: 'sell', qty: 100 },
      ],
    }))
    expect(r.fills.map((f) => `${f.side} ${f.symbol}`)).toEqual(['buy A', 'sell A', 'buy B'])
  })

  it("values a stock that didn't trade at its last close", () => {
    const r = simulate(tiny(), game({ orders: [{ day: 2, symbol: 'B', side: 'buy', amount: 5_000 }] }))
    const [d3, d4, d5] = r.days.slice(3)
    expect(d4.value).toBe(d3.value) // B has no close on day 4
    expect(d5.value - d4.value).toBe(r.holdings.B * 10)
  })

  it('invests a monthly SIP in the index fund on the first trading day of each month', () => {
    const r = simulate(tiny(), game({ cash: 0, sip: { amount: 1_000 } }))
    expect(r.fills).toEqual([expect.objectContaining({ day: 3, symbol: 'FUND', sip: true })])
    expect(r.days.at(-1)!.invested).toBe(1_000)
    expect(summarise(r).trades).toBe(0)
  })
})

describe('on real prices', () => {
  const market = toMarket(fixture as SimMarket)

  it('₹1 lakh left in the index fund through 2020 fell about a third, then ended up', () => {
    const g = newGame(market, 'crash', 100_000)
    const s = summarise(simulate(market, indexFundGame(market, g)))
    expect(s.worstFall).toBeLessThan(-0.3)
    expect(s.returnPct).toBeGreaterThan(0.1)
    expect(s.chargesPaid).toBeLessThan(20) // an ETF buy is cheap: stamp duty and fees only
  })

  it('stops the game in the March 2020 fall, and not again for a month', () => {
    const g = newGame(market, 'crash', 100_000)
    const events = marketEvents(market, g.start, g.end)
    expect(events.find((e) => e.kind === 'fall')?.day).toBeGreaterThanOrEqual(dayOnOrAfter(market, '2020-03-01'))
    events.slice(1).forEach((e, i) => expect(e.day - events[i].day).toBeGreaterThanOrEqual(COOLDOWN))
  })

  it('notices a sale in the fall, and what the fund did next', () => {
    const g = newGame(market, 'crash', 100_000)
    const panic = dayOnOrAfter(market, '2020-03-23')
    const r = simulate(market, { ...g, orders: [
      { day: g.start, symbol: market.indexFund, side: 'buy', amount: 100_000 },
      { day: panic, symbol: market.indexFund, side: 'sell', qty: 1_000_000 },
    ] })
    const [sale] = salesInFalls(market, r)
    expect(sale.marketFall).toBeLessThan(-0.2)
    expect(sale.fundAfter).toBeGreaterThan(0.05)
  })

  it("can't buy a stock before it listed", () => {
    const before = dayOnOrAfter(market, '2021-07-01')
    const r = simulate(market, { start: before, end: before + 30, cash: 50_000, orders: [{ day: before, symbol: 'ETERNAL', side: 'buy', amount: 10_000 }] })
    expect(r.rejections[0].reason).toBe('no-price')
  })

  it('has a flat scenario that really went nowhere', () => {
    const g = newGame(market, 'flat', 100_000)
    const fund = market.close[market.indexFund]
    expect(Math.abs(fund[g.end]! / fund[g.start]! - 1)).toBeLessThan(0.05)
  })

  it('picks the same mystery window from the same seed', () => {
    const a = newGame(market, 'mystery', 50_000, 42), b = newGame(market, 'mystery', 50_000, 42)
    expect(a).toEqual(b)
    expect(a.end - a.start).toBeGreaterThan(200)
  })
})

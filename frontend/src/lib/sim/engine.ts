import type { components } from '../../api/schema'
import { affordable, charges, type Charges, type Side } from './charges'

/**
 * The time machine's engine (decision D-039): pure functions from a game (its settings and the
 * player's orders) to everything that happened. Nothing is stored but the orders, so a game can be
 * saved, resumed or replayed exactly.
 *
 * Rules: you decide after a day's close, and orders fill at the next day's open, as they would
 * at a real broker. Whole shares only. Every fill pays real charges. A stock can be bought only
 * once it has a price (after it listed). Holdings are valued at each day's close.
 */

export type SimMarket = components['schemas']['SimMarket']

export type Market = {
  dates: string[]
  symbols: string[]
  indexFund: string
  /** The NIFTY 50 level each day, for reference. */
  index: (number | null)[]
  open: Record<string, (number | null)[]>
  close: Record<string, (number | null)[]>
  info: Record<string, { name: string; sector: string; covered: boolean }>
}

export function toMarket(m: SimMarket): Market {
  const open: Market['open'] = {}, close: Market['close'] = {}, info: Market['info'] = {}
  for (const s of m.stocks) {
    open[s.symbol] = s.open
    close[s.symbol] = s.close
    info[s.symbol] = { name: s.name, sector: s.sector, covered: s.covered }
  }
  return { dates: m.dates, symbols: m.stocks.map((s) => s.symbol), indexFund: m.index_fund, index: m.index, open, close, info }
}

/** Placed after the close of `day`; fills at the open of `day + 1`. Buy by rupee amount or by shares; sell by shares. */
export type NewOrder =
  | { symbol: string; side: 'buy'; amount: number; qty?: undefined }
  | { symbol: string; side: 'buy'; qty: number; amount?: undefined }
  | { symbol: string; side: 'sell'; qty: number }
export type Order = NewOrder & { day: number }

export type Game = {
  /** Day indices into the market's dates, inclusive. */
  start: number
  end: number
  /** Cash at the start. */
  cash: number
  /** Optional monthly SIP into the index fund, on the first trading day of each month. */
  sip?: { amount: number }
  orders: Order[]
}

export type Fill = { day: number; symbol: string; side: Side; qty: number; price: number; value: number; charges: Charges; sip?: boolean }

export type Rejection = { order: Order; reason: 'game-over' | 'no-price' | 'too-small' | 'nothing-to-sell' }

export type Day = {
  day: number
  cash: number
  /** Cash plus holdings at the close. */
  value: number
  /** Money put in so far: the starting cash plus SIP instalments. */
  invested: number
  /** Money added on this day (an SIP instalment), so returns can leave it out. */
  added: number
}

export type Result = {
  days: Day[]
  fills: Fill[]
  rejections: Rejection[]
  holdings: Record<string, number>
  cash: number
  chargesPaid: number
}

/** The last known close on or before `day`, for valuing a stock that didn't trade that day. */
export function lastClose(market: Market, symbol: string, day: number): number | null {
  const closes = market.close[symbol]
  for (let d = day; d >= 0; d--) if (closes?.[d] != null) return closes[d]
  return null
}

/** The start day, then the first trading day of each calendar month, within the game. */
export function sipDays(market: Market, game: Game): number[] {
  const days = [game.start]
  for (let d = game.start + 1; d <= game.end; d++) {
    if (market.dates[d].slice(0, 7) !== market.dates[d - 1].slice(0, 7)) days.push(d)
  }
  return days
}

export function simulate(market: Market, game: Game, upTo = game.end): Result {
  const last = Math.min(upTo, game.end)
  const holdings: Record<string, number> = {}
  const fills: Fill[] = [], rejections: Rejection[] = [], days: Day[] = []
  let cash = game.cash, invested = game.cash, chargesPaid = 0
  const sip = new Set(game.sip ? sipDays(market, game) : [])
  const byFillDay = new Map<number, Order[]>()
  for (const o of game.orders) {
    if (o.day + 1 > game.end) {
      rejections.push({ order: o, reason: 'game-over' })
      continue
    }
    byFillDay.set(o.day + 1, [...(byFillDay.get(o.day + 1) ?? []), o])
  }

  /** Buy as many shares as `budget` allows (or `limit`, if fewer), at the day's open. */
  const buy = (day: number, symbol: string, budget: number, isSip = false, limit = Infinity): boolean => {
    const price = market.open[symbol]?.[day] ?? null
    if (price == null) return false
    const etf = symbol === market.indexFund
    const qty = Math.min(limit, affordable(Math.min(budget, cash), price, etf))
    if (qty === 0) return false
    const value = qty * price, c = charges('buy', value, etf)
    cash -= value + c.total
    chargesPaid += c.total
    holdings[symbol] = (holdings[symbol] ?? 0) + qty
    fills.push({ day, symbol, side: 'buy', qty, price, value, charges: c, ...(isSip ? { sip: true } : {}) })
    return true
  }

  for (let day = game.start; day <= last; day++) {
    let added = 0
    if (sip.has(day) && game.sip) {
      cash += game.sip.amount
      invested += game.sip.amount
      added = game.sip.amount
      buy(day, market.indexFund, game.sip.amount, true)
    }
    // Sells first, so a switch from one stock to another can use the money the same morning.
    const orders = [...(byFillDay.get(day) ?? [])].sort((a, b) => (a.side === b.side ? 0 : a.side === 'sell' ? -1 : 1))
    for (const o of orders) {
      const price = market.open[o.symbol]?.[day] ?? null
      if (price == null) {
        rejections.push({ order: o, reason: 'no-price' })
      } else if (o.side === 'buy') {
        const ok = o.qty != null ? buy(day, o.symbol, cash, false, o.qty) : buy(day, o.symbol, o.amount)
        if (!ok) rejections.push({ order: o, reason: 'too-small' })
      } else {
        const qty = Math.min(o.qty, holdings[o.symbol] ?? 0)
        if (qty <= 0) {
          rejections.push({ order: o, reason: 'nothing-to-sell' })
          continue
        }
        const value = qty * price, c = charges('sell', value, o.symbol === market.indexFund)
        cash += value - c.total
        chargesPaid += c.total
        holdings[o.symbol] -= qty
        if (holdings[o.symbol] === 0) delete holdings[o.symbol]
        fills.push({ day, symbol: o.symbol, side: 'sell', qty, price, value, charges: c })
      }
    }
    const held = Object.entries(holdings).reduce((sum, [s, q]) => sum + q * (lastClose(market, s, day) ?? 0), 0)
    days.push({ day, cash, value: cash + held, invested, added })
  }
  return { days, fills, rejections, holdings, cash, chargesPaid }
}

/**
 * The honest comparison: the same money, at the same times, put into the index fund and left
 * alone. Charges included.
 */
export function indexFundGame(market: Market, game: Game): Game {
  return { ...game, orders: game.cash > 0 ? [{ day: game.start, symbol: market.indexFund, side: 'buy', amount: game.cash }] : [] }
}

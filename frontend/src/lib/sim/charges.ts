/**
 * What one delivery trade costs at a zero-brokerage broker (decision D-039). Rates are Zerodha's
 * published delivery charges for 2025; other zero-brokerage brokers are close. Taxes on gains are
 * left out of this version.
 */

export type Side = 'buy' | 'sell'

export type Charges = {
  /** Securities transaction tax: 0.1% each way on shares; 0.001% on ETF sales only. */
  stt: number
  /** The exchange's transaction charge (NSE). */
  exchange: number
  /** SEBI's turnover fee: ₹10 per crore. */
  sebi: number
  /** Stamp duty, charged on buys only. */
  stamp: number
  /** 18% GST on the exchange and SEBI charges. */
  gst: number
  /** The depository charge for moving shares out of your demat account, once per stock sold. */
  dp: number
  total: number
}

const STT_SHARES = 0.001
const STT_ETF_SELL = 0.00001
const EXCHANGE = 0.0000297
const SEBI = 0.000001
const STAMP_BUY = 0.00015
const GST = 0.18
const DP_PER_SALE = 15.93

const paise = (x: number) => Math.round(x * 100) / 100

export function charges(side: Side, value: number, etf = false): Charges {
  const stt = paise(etf ? (side === 'sell' ? value * STT_ETF_SELL : 0) : value * STT_SHARES)
  const exchange = paise(value * EXCHANGE)
  const sebi = paise(value * SEBI)
  const stamp = paise(side === 'buy' ? value * STAMP_BUY : 0)
  const gst = paise((exchange + sebi) * GST)
  const dp = side === 'sell' ? DP_PER_SALE : 0
  return { stt, exchange, sebi, stamp, gst, dp, total: paise(stt + exchange + sebi + stamp + gst + dp) }
}

/** The most whole shares `budget` buys at `price` once charges are added; 0 if not even one. */
export function affordable(budget: number, price: number, etf = false): number {
  if (price <= 0 || budget < price) return 0
  let qty = Math.floor(budget / (price * (1 + STT_SHARES + STAMP_BUY + EXCHANGE * 1.2)))
  while (qty > 0 && qty * price + charges('buy', qty * price, etf).total > budget) qty--
  // The estimate can undershoot by a share when charges are tiny (ETFs).
  while (qty * price + price + charges('buy', (qty + 1) * price, etf).total <= budget) qty++
  return qty
}

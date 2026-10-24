import { useEffect, useRef, useState } from 'react'
import { useI18n, type Messages } from '../../i18n'
import { money, price } from '../../lib/format'
import { affordable, charges } from '../../lib/sim/charges'
import { lastClose, type Market, type NewOrder } from '../../lib/sim/engine'
import { Term } from '../Term'
import { NumberField } from './NumberField'

type Props = {
  market: Market
  symbol: string
  side: 'buy' | 'sell'
  day: number
  cash: number
  held: number
  onOrder: (order: NewOrder) => void
  onClose: () => void
}

/**
 * Buy by rupees or by shares, or sell a number of shares. The estimate uses the day's close;
 * the order fills at the next open, so the real price can differ a little (D-039).
 */
export function OrderSheet({ market, symbol, side, day, cash, held, onOrder, onClose }: Props) {
  const { m } = useI18n()
  const o = m.practice.order
  const quote = lastClose(market, symbol, day) ?? 0
  const etf = symbol === market.indexFund
  const maxShares = affordable(cash, quote, etf)
  const [mode, setMode] = useState<'amount' | 'shares'>('amount')
  const [amount, setAmount] = useState<number | null>(side === 'buy' ? Math.min(Math.floor(cash), 10_000) : null)
  const [shares, setShares] = useState<number | null>(side === 'sell' ? held : Math.min(maxShares, 1))
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    field.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const qty = side === 'sell' ? Math.min(shares ?? 0, held)
    : mode === 'shares' ? Math.min(shares ?? 0, maxShares)
    : affordable(Math.min(amount ?? 0, cash), quote, etf)
  const c = charges(side, qty * quote, etf)
  const lines = (Object.entries(o.lines) as [keyof Messages['practice']['order']['lines'], string][]).filter(([k]) => c[k] > 0)
  const pill = (on: boolean) => `h-9 cursor-pointer rounded-full px-3.5 text-[13px] ${on ? 'bg-surface font-semibold text-ink shadow-sm' : 'font-medium text-muted'}`
  const preset = 'h-8 cursor-pointer rounded-full border border-line-2 bg-surface px-3 text-xs font-medium text-ink'

  const place = () => {
    if (qty === 0) return
    if (side === 'sell') onOrder({ symbol, side: 'sell', qty })
    else if (mode === 'shares') onOrder({ symbol, side: 'buy', qty })
    else onOrder({ symbol, side: 'buy', amount: Math.min(amount ?? 0, cash) })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-4 lg:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-lg">
        <div className="flex flex-col gap-0.5">
          <h2 id="order-title" className="m-0 text-lg font-semibold">{side === 'buy' ? o.buyTitle(symbol) : o.sellTitle(symbol)}</h2>
          <span className="text-[13px] text-muted">
            {market.info[symbol].name} · {side === 'buy' ? o.cashLeft(money(cash)) : o.heldNow(held)}
          </span>
        </div>

        {side === 'buy' && (
          <div role="group" aria-label={o.buyBy} className="flex gap-0.5 self-start rounded-full bg-chip p-0.5">
            <button type="button" aria-pressed={mode === 'amount'} onClick={() => setMode('amount')} className={pill(mode === 'amount')}>{o.byAmount}</button>
            <button type="button" aria-pressed={mode === 'shares'} onClick={() => setMode('shares')} className={pill(mode === 'shares')}>{o.byShares}</button>
          </div>
        )}

        {side === 'buy' && mode === 'amount' ? (
          <div className="flex flex-col gap-2">
            <NumberField label={o.amount} prefix="₹" value={amount} onChange={setAmount} inputRef={field} />
            <div className="flex flex-wrap gap-1.5">
              {[5_000, 10_000, 25_000].filter((a) => a < cash).map((a) => (
                <button key={a} type="button" onClick={() => setAmount(a)} className={preset}>{money(a)}</button>
              ))}
              <button type="button" onClick={() => setAmount(Math.floor(cash))} className={preset}>{o.allCash}</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <NumberField label={side === 'buy' ? o.sharesToBuy : o.sharesToSell} value={shares} onChange={setShares} inputRef={field} />
            <div className="flex flex-wrap gap-1.5">
              {side === 'sell' ? (
                <>
                  {held > 1 && <button type="button" onClick={() => setShares(Math.floor(held / 2))} className={preset}>{o.half}</button>}
                  <button type="button" onClick={() => setShares(held)} className={preset}>{o.all}</button>
                </>
              ) : (
                <span className="text-xs text-muted">{o.maxShares(maxShares)}</span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 rounded-xl bg-page px-3.5 py-3 text-[13px]">
          <span className="font-medium text-ink">
            {qty === 0 ? (side === 'buy' ? o.tooSmall : o.nothing) : o.estimate(qty, price(quote), money(qty * quote))}
          </span>
          <span className="text-muted">{o.fills}</span>
        </div>

        {qty > 0 && (
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
            <dt className="col-span-2 pb-0.5 text-xs font-semibold tracking-wide text-muted uppercase">
              {side === 'buy' ? o.charges : o.sellCharges} <Term id="costs" />
            </dt>
            {lines.map(([k, label]) => (
              <div key={k} className="contents"><dt className="text-ink-2">{label}</dt><dd className="m-0 text-right text-ink-2 tabular-nums">{price(c[k])}</dd></div>
            ))}
            <dt className="border-t border-line pt-1 font-semibold text-ink">{o.total}</dt>
            <dd className="m-0 border-t border-line pt-1 text-right font-semibold text-ink tabular-nums">{price(c.total)}</dd>
          </dl>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 cursor-pointer rounded-full px-4 text-sm font-medium text-ink-2 hover:bg-chip">{o.close}</button>
          <button type="button" disabled={qty === 0} onClick={place}
            className="h-11 cursor-pointer rounded-full bg-brand px-5 text-sm font-semibold text-on-brand disabled:opacity-40">
            {side === 'buy' ? o.confirm : o.confirmSell}
          </button>
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router'
import type { Signal } from '../api/client'
import { chance, drivers, headline, looksLikeReversal, receiptLong, receiptShort, stockRange } from '../lib/calls'
import { pct, price, signedPct } from '../lib/format'
import { Disclosure } from './Disclosure'
import { Warning } from './Icons'
import { LeanPill } from './LeanPill'

/**
 * One call. Collapsed, it shows the stock, the lean, the edge and its receipt; any per-stock
 * warning stays visible too (decision D-019). Expanded, it adds the chance and the factors.
 */
export function CallCard({ signal }: { signal: Signal }) {
  const short = receiptShort(signal)
  const factors = drivers(signal)
  return (
    <article className="self-start overflow-hidden rounded-2xl border border-line bg-surface">
      <Disclosure
        buttonClassName="px-4 py-3.5"
        summary={
          <span className="flex flex-col gap-2.5">
            <span className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 flex-col">
                <span className="text-[17px] font-semibold text-ink">{signal.symbol}</span>
                <span className="truncate text-[13px] text-muted">{signal.name}</span>
              </span>
              <span className="flex flex-col items-end">
                <span className="text-[15px] font-medium text-ink">{price(signal.close)}</span>
                <span className="text-xs text-muted">{signedPct(signal.change_1d)}</span>
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <LeanPill lean={signal.lean} />
              <span className="text-[13px] font-medium text-ink-2">
                {signal.confidence}
                {short && <span className="text-xs font-normal text-muted"> · {short}</span>}
              </span>
            </span>
            {signal.receipt.stock_below_coin_flip && (
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-bear">
                <Warning size={15} />
                On {signal.symbol}: {pct(signal.receipt.stock_hit_rate)} in testing, below a coin flip
                {stockRange(signal.receipt) && ` (${stockRange(signal.receipt)})`}
              </span>
            )}
          </span>
        }
      >
        <div className="flex flex-col gap-3 border-t border-chip px-4 pt-3 pb-4">
          <p className="m-0 text-[15px] leading-snug text-ink">
            {headline(signal)} <span className="text-muted">{chance(signal)}.</span>
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">Biggest factors</span>
            {factors.length === 0 && <span className="text-sm text-ink-2">No single standout factor.</span>}
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {factors.map((f) => (
                <li key={f} className="flex gap-2 text-sm leading-snug text-ink-2">
                  <span aria-hidden="true" className="text-muted">•</span>
                  {f}
                </li>
              ))}
            </ul>
            {looksLikeReversal(signal) && (
              <Link to="/learn#reversals" className="text-[13px] no-underline">
                Why might this point the other way? About reversals →
              </Link>
            )}
          </div>
          <p className="m-0 text-[13px] leading-snug text-ink-2">{receiptLong(signal)}</p>
          <Link to={`/stocks/${signal.symbol}`} className="self-start text-sm font-medium no-underline">
            Open {signal.symbol} →
          </Link>
        </div>
      </Disclosure>
    </article>
  )
}

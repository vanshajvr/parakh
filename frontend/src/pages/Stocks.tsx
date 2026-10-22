import { useState } from 'react'
import { Link } from 'react-router'
import { useStocks } from '../api/client'
import { LeanPill } from '../components/LeanPill'
import { Sparkline } from '../components/Sparkline'
import { Card, Loading, LoadError } from '../components/States'
import { pct, price, signedPct } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function Stocks() {
  useDocumentTitle('Stocks')
  const { data, isPending, isError, refetch } = useStocks()
  const [query, setQuery] = useState('')
  if (isPending) return <Loading what="stocks" />
  if (isError) return <LoadError what="the stock list" onRetry={() => refetch()} />

  const q = query.trim().toLowerCase()
  const shown = data.filter((s) => !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q))

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <section className="flex flex-col gap-1 px-1">
        <h1 className="m-0 font-serif text-[30px] leading-tight font-semibold tracking-[-0.015em] lg:text-[40px]">Stocks</h1>
        <p className="m-0 text-sm text-muted">
          The {data.length} large NIFTY 50 companies Parakh makes calls on. Prices are daily closes, updated each evening.
        </p>
      </section>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink lg:max-w-sm">
        Search
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, symbol or sector"
          className="h-11 rounded-xl border border-line-2 bg-surface px-3.5 text-[15px] font-normal text-ink placeholder:text-muted"
        />
      </label>
      <Card className="overflow-hidden">
        <ul className="m-0 list-none p-0">
          {shown.map((s) => (
            <li key={s.ticker} className="border-b border-chip last:border-0">
              <Link to={`/stocks/${s.symbol}`} className="flex min-h-16 items-center gap-3 px-4 py-3 no-underline hover:bg-page">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-ink">{s.symbol}</span>
                    {s.lean && s.lean !== 'no_call' && <LeanPill lean={s.lean} />}
                  </span>
                  <span className="truncate text-[13px] text-muted">{s.name} · {s.sector}</span>
                  {s.sim_hit_rate != null && (
                    <span className="text-xs text-muted">
                      {pct(s.sim_hit_rate)} right in testing
                      {s.sim_hit_low != null && s.sim_hit_high != null && ` (likely ${Math.round(s.sim_hit_low * 100)}–${Math.round(s.sim_hit_high * 100)}%)`}
                    </span>
                  )}
                </span>
                <span className="hidden sm:block">
                  <Sparkline values={s.spark} label={`${s.symbol} closing prices over the past month`} />
                </span>
                <span className="flex w-28 shrink-0 flex-col items-end gap-0.5 whitespace-nowrap">
                  <span className="text-[15px] font-semibold text-ink">{price(s.close)}</span>
                  <span className="text-xs text-muted">{signedPct(s.change_5d, 1)} over 5 days</span>
                </span>
              </Link>
            </li>
          ))}
          {shown.length === 0 && <li className="px-4 py-5 text-sm text-muted">No stocks match "{query}".</li>}
        </ul>
      </Card>
    </div>
  )
}

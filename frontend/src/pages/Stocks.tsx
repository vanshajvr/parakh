import { useState } from 'react'
import { Link } from 'react-router'
import { useStocks } from '../api/client'
import { LeanPill } from '../components/LeanPill'
import { Card, Loading, LoadError } from '../components/States'
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
        <p className="m-0 text-sm text-muted">The {data.length} large NIFTY 50 companies Parakh makes calls on.</p>
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
              <Link to={`/stocks/${s.symbol}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 no-underline hover:bg-page">
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold text-ink">{s.symbol}</span>
                  <span className="truncate text-[13px] text-muted">{s.name} · {s.sector}</span>
                </span>
                {s.lean ? <LeanPill lean={s.lean} /> : <span className="text-[13px] text-muted">No call yet</span>}
              </Link>
            </li>
          ))}
          {shown.length === 0 && <li className="px-4 py-5 text-sm text-muted">No stocks match "{query}".</li>}
        </ul>
      </Card>
    </div>
  )
}

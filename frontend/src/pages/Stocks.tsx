import { Link, useSearchParams } from 'react-router'
import { useScreener } from '../api/client'
import { LeanPill } from '../components/LeanPill'
import { MoverControls } from '../components/Movers'
import { Sparkline } from '../components/Sparkline'
import { Card, Loading, LoadError } from '../components/States'
import { closeLabel, pct, price, signedPct } from '../lib/format'
import { crore, rank, viewById, type Row, type Timeframe, type ViewId } from '../lib/screener'
import { DESKTOP, useMediaQuery } from '../lib/useMediaQuery'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/** Column headers that sort the table: each maps to a view (and flips to its opposite on a second click). */
const SORTS: { label: string; views: [ViewId, ViewId]; tf?: Timeframe }[] = [
  { label: '1D', views: ['gainers', 'losers'], tf: '1D' },
  { label: '5D', views: ['gainers', 'losers'], tf: '5D' },
  { label: '1M', views: ['gainers', 'losers'], tf: '1M' },
  { label: 'Value traded', views: ['active', 'active'] },
  { label: 'Vol vs usual', views: ['unusual', 'unusual'] },
  { label: '52-wk range', views: ['high', 'low'] },
]

/** The screener: every NIFTY 50 member, filterable and sortable, with Parakh's coverage marked. */
export function Stocks() {
  useDocumentTitle('Stocks')
  const { data, isPending, isError, refetch } = useScreener()
  const [params, setParams] = useSearchParams()
  const isDesktop = useMediaQuery(DESKTOP)
  if (isPending) return <Loading what="stocks" />
  if (isError) return <LoadError what="the stock list" onRetry={() => refetch()} />

  const view = viewById(params.get('view')).id
  const tf = (['1D', '5D', '1M'].includes(params.get('tf') ?? '') ? params.get('tf') : '1D') as Timeframe
  const sector = params.get('sector')
  const query = params.get('q') ?? ''
  const coveredOnly = params.get('covered') === '1'
  const set = (changes: Record<string, string | null>) => setParams((p) => {
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    return p
  }, { replace: true })

  const q = query.trim().toLowerCase()
  const rows = rank(data.stocks, viewById(view), tf, sector)
    .filter((r) => (!coveredOnly || r.covered) && (!q || r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)))
  const v = viewById(view)

  return (
    <div className="stagger flex flex-col gap-4 lg:gap-6">
      <section className="flex flex-col gap-1 px-1">
        <h1 className="m-0 font-serif text-[30px] leading-tight font-semibold tracking-[-0.015em] lg:text-[40px]">Stocks</h1>
        <p className="m-0 text-sm text-muted">
          All 50 NIFTY 50 stocks, from daily closes ({data.as_of ? closeLabel(data.as_of) : 'no data yet'}). Parakh makes calls on 20 of them.
        </p>
      </section>

      <Card className="flex flex-col gap-3 p-4 lg:p-5">
        <MoverControls data={data} view={view} setView={(x) => set({ view: x })} tf={tf} setTf={(t) => set({ tf: t })}
          sector={sector} setSector={(s) => set({ sector: s })} />
        <div className="flex flex-wrap items-center gap-3">
          <input type="search" value={query} onChange={(e) => set({ q: e.target.value || null })} placeholder="Search name or symbol"
            aria-label="Search stocks" className="h-10 min-w-0 flex-1 rounded-xl border border-line-2 bg-surface px-3 text-sm text-ink placeholder:text-muted lg:max-w-xs" />
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={coveredOnly} onChange={(e) => set({ covered: e.target.checked ? '1' : null })} className="size-4" />
            Parakh's 20 only
          </label>
        </div>
        <p className="m-0 text-[13px] leading-relaxed text-muted">{v.note} {rows.length} stock{rows.length === 1 ? '' : 's'}.</p>
      </Card>

      <Card className="overflow-hidden">
        {isDesktop ? (
          <ScreenerTable rows={rows} view={view} tf={tf} onSort={(next, nextTf) => set({ view: next, tf: nextTf ?? null })} />
        ) : (
          <ul className="m-0 list-none p-0">
            {rows.map((r) => (
              <li key={r.ticker} className="border-b border-chip last:border-0">
                <Link to={`/stocks/${r.symbol}`} className="flex min-h-16 items-center gap-3 px-4 py-3 no-underline hover:bg-page">
                  <StockCell row={r} />
                  <span className="flex w-28 shrink-0 flex-col items-end gap-0.5 whitespace-nowrap">
                    <span className="text-[15px] font-semibold text-ink">{price(r.close)}</span>
                    <span className="text-xs text-muted">{v.show(r, tf)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {rows.length === 0 && <p className="m-0 px-4 py-5 text-sm text-muted">No stocks match these filters.</p>}
      </Card>
    </div>
  )
}

function StockCell({ row }: { row: Row }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-semibold text-ink">{row.symbol}</span>
        {row.covered && row.lean && row.lean !== 'no_call' && <LeanPill lean={row.lean} />}
        {!row.covered && <span className="rounded-full border border-dashed border-line-2 px-2 py-0.5 text-[11px] text-muted">No Parakh calls</span>}
      </span>
      <span className="truncate text-[13px] text-muted">{row.name} · {row.sector}</span>
      {row.sim_hit_rate != null && (
        <span className="text-xs text-muted">
          {pct(row.sim_hit_rate)} right in testing
          {row.sim_hit_low != null && row.sim_hit_high != null && ` (likely ${Math.round(row.sim_hit_low * 100)}–${Math.round(row.sim_hit_high * 100)}%)`}
        </span>
      )}
    </span>
  )
}

type TableProps = { rows: Row[]; view: ViewId; tf: Timeframe; onSort: (view: ViewId, tf?: Timeframe) => void }

function ScreenerTable({ rows, view, tf, onSort }: TableProps) {
  const header = (s: (typeof SORTS)[number]) => {
    const active = s.views.includes(view) && (!s.tf || s.tf === tf)
    const next = active && view === s.views[0] ? s.views[1] : s.views[0]
    const arrow = active ? (viewById(view).descending ? ' ↓' : ' ↑') : ''
    return (
      <th key={s.label} scope="col" aria-sort={active ? (viewById(view).descending ? 'descending' : 'ascending') : 'none'} className="px-3 py-2.5 text-right">
        <button type="button" onClick={() => onSort(next, s.tf)} className={`cursor-pointer text-xs font-semibold tracking-wide whitespace-nowrap uppercase ${active ? 'text-ink' : 'text-muted'}`}>
          {s.label}{arrow}
        </button>
      </th>
    )
  }
  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap">
      <thead className="border-b border-line">
        <tr>
          <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted uppercase">Stock</th>
          <th scope="col" className="px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-muted uppercase">Price</th>
          {SORTS.map(header)}
          <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase">Past month</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.ticker} className="border-b border-chip last:border-0 hover:bg-page">
            <td className="max-w-72 px-4 py-2.5 !whitespace-normal"><Link to={`/stocks/${r.symbol}`} className="flex no-underline"><StockCell row={r} /></Link></td>
            <td className="px-3 text-right font-semibold text-ink tabular-nums">{price(r.close)}</td>
            <td className="px-3 text-right tabular-nums">{signedPct(r.change_1d, 1)}</td>
            <td className="px-3 text-right tabular-nums">{signedPct(r.change_5d, 1)}</td>
            <td className="px-3 text-right tabular-nums">{signedPct(r.change_20d, 1)}</td>
            <td className="px-3 text-right tabular-nums">{crore(r.value_traded)}</td>
            <td className="px-3 text-right tabular-nums">{r.volume_ratio == null ? '—' : `${r.volume_ratio.toFixed(1)}×`}</td>
            <td className="px-3"><RangeBar row={r} /></td>
            <td className="px-4 text-right"><Sparkline values={r.spark} label={`${r.symbol} over the past month`} width={72} height={24} /></td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}

/** Where the price sits between its 52-week low and high. */
function RangeBar({ row }: { row: Row }) {
  const pos = row.pos_52w ?? 0
  return (
    <span className="ml-auto flex w-24 flex-col gap-1" title={`52-week range ${price(row.low_52w)} to ${price(row.high_52w)}`}>
      <span className="relative h-1.5 rounded-full bg-chip" aria-hidden>
        <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${pos * 100}%` }} />
      </span>
      <span className="sr-only">{`${Math.round(pos * 100)}% of the way from its 52-week low to its high`}</span>
    </span>
  )
}

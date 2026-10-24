import { useState } from 'react'
import { Link } from 'react-router'
import { useScreener, type Screener } from '../api/client'
import { useI18n } from '../i18n'
import { closeLabel, pct, price } from '../lib/format'
import { rank, sectors, VIEWS, viewById, type Row, type Timeframe, type View, type ViewId } from '../lib/screener'
import { LeanPill } from './LeanPill'
import { Sparkline } from './Sparkline'
import { Card } from './States'
import { Term } from './Term'

const TOP = 5
const TIMEFRAMES: Timeframe[] = ['1D', '5D', '1M']

/** Today's movers across the NIFTY 50: the top few per view, with the full list one tap away. */
export function Movers() {
  const { m } = useI18n()
  const { data } = useScreener()
  const [view, setView] = useState<ViewId>('gainers')
  const [tf, setTf] = useState<Timeframe>('1D')
  const [sector, setSector] = useState<string | null>(null)
  if (!data || data.stocks.length === 0 || !data.as_of) return null

  const v = viewById(view)
  const text = m.movers.views[v.id]
  const rows = rank(data.stocks, v, tf, sector, TOP)
  const params = new URLSearchParams({ view, ...(v.usesTimeframe ? { tf } : {}), ...(sector ? { sector } : {}) })

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4 lg:p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 text-base font-semibold">{m.movers.title}</h2>
        <span className="text-[13px] text-muted">{m.movers.subtitle(closeLabel(data.as_of, m))}</span>
      </div>
      <MoverControls data={data} view={view} setView={setView} tf={tf} setTf={setTf} sector={sector} setSector={setSector} />
      <p className="m-0 text-[13px] leading-relaxed text-muted">{text.note}</p>
      <ol className="m-0 flex list-none flex-col p-0" aria-label={sector ? m.movers.inSector(text.label, sector) : text.label}>
        {rows.map((r) => <MoverRow key={r.ticker} row={r} view={v} tf={tf} />)}
        {rows.length === 0 && <li className="py-3 text-sm text-muted">{m.movers.empty}</li>}
      </ol>
      {(view === 'gainers' || view === 'losers') && data.next_week && <NextWeekNote data={data.next_week} view={view} />}
      <Link to={`/stocks?${params}`} className="self-start text-sm font-medium no-underline">{m.movers.seeAll}</Link>
    </Card>
  )
}

type ControlProps = {
  data: Screener
  view: ViewId; setView: (v: ViewId) => void
  tf: Timeframe; setTf: (t: Timeframe) => void
  sector: string | null; setSector: (s: string | null) => void
}

/** View chips, timeframe and sector filter; shared by the Today card and the screener. */
export function MoverControls({ data, view, setView, tf, setTf, sector, setSector }: ControlProps) {
  const { m } = useI18n()
  const v = viewById(view)
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={m.movers.viewAria} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {VIEWS.map((o) => (
          <button key={o.id} type="button" aria-pressed={view === o.id} onClick={() => setView(o.id)}
            className={`h-8 shrink-0 cursor-pointer rounded-full border px-3 text-xs ${view === o.id ? 'border-brand bg-brand font-semibold text-on-brand' : 'border-line-2 bg-surface font-medium text-ink'}`}>
            {m.movers.views[o.id].label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {v.usesTimeframe && (
          <div role="group" aria-label={m.movers.periodAria} className="flex gap-1 rounded-full bg-chip p-0.5">
            {TIMEFRAMES.map((t) => (
              <button key={t} type="button" aria-pressed={tf === t} onClick={() => setTf(t)}
                className={`h-7 cursor-pointer rounded-full px-2.5 text-xs ${tf === t ? 'bg-surface font-semibold text-ink shadow-sm' : 'font-medium text-muted'}`}>
                {t}
              </button>
            ))}
          </div>
        )}
        <label className="flex items-center gap-1.5 text-xs text-muted">
          {m.movers.sector}
          <select value={sector ?? ''} onChange={(e) => setSector(e.target.value || null)}
            className="h-8 rounded-lg border border-line-2 bg-surface px-2 text-xs text-ink">
            <option value="">{m.movers.allSectors}</option>
            {sectors(data.stocks).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
    </div>
  )
}

function MoverRow({ row, view, tf }: { row: Row; view: View; tf: Timeframe }) {
  const { m } = useI18n()
  return (
    <li className="flex items-center gap-3 border-b border-chip py-2.5 last:border-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Link to={`/stocks/${row.symbol}`} className="text-[15px] font-semibold text-ink no-underline">{row.symbol}</Link>
          {row.covered && row.lean && row.lean !== 'no_call' && <LeanPill lean={row.lean} />}
          {!row.covered && (
            <span title={m.movers.noCallsTitle} className="rounded-full border border-dashed border-line-2 px-1.5 py-px text-[10px] text-muted">
              {m.movers.noCalls}
            </span>
          )}
        </span>
        <span className="truncate text-xs text-muted">{row.name} · {price(row.close)}</span>
      </span>
      <span className="hidden sm:block"><Sparkline values={row.spark} label={m.movers.sparkAria(row.symbol)} width={72} height={24} /></span>
      <span className="w-28 shrink-0 text-right text-sm font-semibold text-ink tabular-nums">{view.show(row, tf, m)}</span>
    </li>
  )
}

/** The honest footnote under gainers and losers, from Parakh's own history. */
function NextWeekNote({ data, view }: { data: NonNullable<Screener['next_week']>; view: 'gainers' | 'losers' }) {
  const { m } = useI18n()
  const since = new Date(`${data.since}T12:00:00Z`).getUTCFullYear()
  return (
    <p className="m-0 rounded-xl bg-page px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">
      <strong className="font-semibold text-ink">{m.movers.nextTitle}</strong>{' '}
      {view === 'gainers'
        ? m.movers.nextGainers(String(data.weeks), since, pct(data.gainers_lagged, 0))
        : m.movers.nextLosers(String(data.weeks), since, pct(data.losers_beat, 0))}{' '}
      {m.movers.nextCaveat} <Term id="reversal" />
    </p>
  )
}

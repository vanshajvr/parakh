import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { apiUrl, useLedger, useStocks, useToday, useTrackRecord, type LedgerRow, type TrackRecord } from '../api/client'
import { Disclosure } from '../components/Disclosure'
import { Download } from '../components/Icons'
import { RecentTesting } from '../components/Market'
import { CalibrationChart, DotStrip, YearBars } from '../components/RecordCharts'
import { Card, Loading, LoadError } from '../components/States'
import { count, pct, shortDate, signedPct } from '../lib/format'
import { chosenSummary, confidenceVerdict, edgeSpread, ROUND_TRIP_COST, worstYear, yearsBelowCoinFlip, type SimulatedMetrics } from '../lib/metrics'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function Record() {
  const { data, isPending, isError, refetch } = useTrackRecord()
  if (isPending) return <Loading what="the track record" />
  if (isError) return <LoadError what="the track record" onRetry={() => refetch()} />
  return <RecordView data={data} />
}

export function RecordView({ data }: { data: TrackRecord }) {
  useDocumentTitle('Track record')
  const sim = data.simulated as SimulatedMetrics | null
  const recent = useToday().data?.recent_simulated ?? []
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <section className="flex max-w-2xl flex-col gap-1.5 px-1">
        <h1 className="m-0 font-serif text-[30px] leading-tight font-semibold tracking-[-0.015em] lg:text-[40px]">Track record</h1>
        <p className="m-0 text-sm leading-relaxed text-muted lg:text-base">
          Two records, never mixed: the real calls we've published, and how the same method did when tested on years of data it never trained on.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <LiveCard data={data} />
        {sim && <TestingCard sim={sim} />}
      </div>

      {sim && <SimulatedDetails sim={sim} />}
      <RecentTesting calls={recent} />
      <Ledger />
    </div>
  )
}

function Badge({ live, children }: { live: boolean; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${live ? 'bg-brand text-on-brand' : 'border border-dashed border-muted text-ink-2'}`}>
      {children}
    </span>
  )
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-page p-2.5 lg:p-3">
      <span className="text-xl font-semibold lg:text-2xl">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

function LiveCard({ data }: { data: TrackRecord }) {
  const { live, live_published, live_scored, live_days } = data
  return (
    <Card className="flex flex-col gap-3 p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-base font-semibold lg:text-lg">Live record</h2>
        <Badge live>{live_days > 0 ? `Real calls · Day ${live_days}` : 'Real calls'}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile value={count(live_published)} label="published" />
        <Tile value={count(live_scored)} label="scored" />
        <Tile value={live && live.n_calls > 0 ? pct(live.hit_rate) : '—'} label="right so far" />
      </div>
      <Disclosure buttonClassName="min-h-11" summary={<span className="text-sm font-medium text-link">How the live record works</span>}>
        <div className="flex flex-col gap-3 pt-1">
      <p className="m-0 text-sm leading-relaxed text-ink-2">
        {live_scored === 0
          ? 'The first results arrive 5 trading days after the first calls. '
          : `Scored calls only: ${count(data.n_pending)} more are waiting for their 5 days to pass. `}
        Every call is timestamped before the market opens, and the database refuses any edit or deletion, including ours.
      </p>
      {live && live.n_calls > 0 && Object.keys(data.live_by_confidence).length > 0 && (
        <p className="m-0 text-sm text-ink-2">
          {Object.entries(data.live_by_confidence).map(([band, s]) => `${band}: ${pct(s.hit_rate)} (${count(s.n_calls)})`).join(' · ')}
        </p>
      )}
      <a href={apiUrl('/api/ledger.csv')} className="inline-flex items-center gap-1.5 self-start text-sm font-medium no-underline">
        <Download size={15} /> Download every call (CSV)
      </a>
        </div>
      </Disclosure>
    </Card>
  )
}

function TestingCard({ sim }: { sim: SimulatedMetrics }) {
  const s = chosenSummary(sim)
  const bands = Object.entries(s.by_confidence).sort(([a]) => (a === 'Stronger edge' ? -1 : 1))
  return (
    <Card className="flex flex-col gap-3 p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-base font-semibold lg:text-lg">In testing</h2>
        <Badge live={false}>Simulated · {s.period[0].slice(0, 4)}–{s.period[1].slice(0, 4)}</Badge>
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="font-serif text-[44px] leading-none font-semibold tracking-[-0.02em] lg:text-[52px]">{pct(s.hit_rate)}</span>
        <span className="text-sm text-ink-2">of {count(s.n_calls)} calls were right</span>
      </div>
      <Disclosure buttonClassName="min-h-11"
        summary={<span className="text-sm font-medium text-link">Compare with a coin flip</span>}>
        <div className="flex flex-col gap-3 pt-1">
          <DotStrip hitRate={s.hit_rate ?? 0.5} baseRate={s.base_rate_beat_index} />
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <span className="text-[13px] font-semibold">Do more confident calls do better?</span>
            {bands.map(([band, b]) => (
              <div key={band} className="flex justify-between text-sm">
                <span>{band}</span>
                <span><strong className="font-semibold">{pct(b.hit_rate)}</strong> <span className="text-muted">· {count(b.n_calls)} calls</span></span>
              </div>
            ))}
            <span className="text-[13px] text-muted">{confidenceVerdict(s.by_confidence)}</span>
          </div>
        </div>
      </Disclosure>
    </Card>
  )
}

function SimulatedDetails({ sim }: { sim: SimulatedMetrics }) {
  const s = chosenSummary(sim)
  const worst = worstYear(sim.yearly)
  const below = yearsBelowCoinFlip(sim.yearly)
  const spread = edgeSpread(s)
  const worthIt = spread != null && spread > ROUND_TRIP_COST
  const section = (title: string, summary: string, body: ReactNode) => (
    <Card className="min-w-0 self-start overflow-hidden">
      <Disclosure buttonClassName="min-h-14 px-4 py-3.5 lg:px-5"
        summary={
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-ink">{title}</span>
            <span className="text-[13px] text-muted">{summary}</span>
          </span>
        }>
        <div className="flex flex-col gap-3 px-4 pb-4 lg:px-5 lg:pb-5">{body}</div>
      </Disclosure>
    </Card>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
      {section('Year by year', worst ? `Worst year: ${worst.year}, at ${pct(worst.hit_rate)}` : 'Hit rate per year', (
        <>
          <YearBars rows={sim.yearly} />
          {worst && (
            <p className="m-0 text-sm leading-relaxed text-ink-2">
              <strong className="font-semibold">Worst year: {worst.year}</strong>, right {pct(worst.hit_rate)} of the time.{' '}
              {below} of {sim.yearly.length} years were worse than a coin flip.
            </p>
          )}
        </>
      ))}
      {section('When we say 52%, is it 52%?', `Mostly, yes: off by ${(s.ece * 100).toFixed(1)} points on average`, (
        <>
          <CalibrationChart rows={sim.calibration} />
          <p className="m-0 text-[13px] leading-relaxed text-muted">
            Across: the chance we gave. Up: how often it actually happened. Dots near the dashed line mean our numbers can be
            taken at face value. Bigger dots hold more calls.
          </p>
        </>
      ))}
      {section('Is the edge worth trading on?', worthIt ? 'Only just: it is slightly larger than trading costs.' : "No. It's smaller than trading costs.", (
        <>
          <p className="m-0 text-sm leading-relaxed text-ink-2">
            Over 5 days, stocks with a bullish lean did {signedPct(s.avg_excess_after_bullish)} against the index on average, and
            bearish-lean stocks {signedPct(s.avg_excess_after_bearish)}. That {spread != null ? `${(spread * 100).toFixed(2)}-point` : ''} gap
            is {worthIt ? 'only slightly larger' : 'smaller'} than typical trading costs of about {pct(ROUND_TRIP_COST, 2)}.
          </p>
          <p className="m-0 text-sm leading-relaxed text-ink-2">Use Parakh to question a tip before you act on it, not as a reason to trade on its own.</p>
        </>
      ))}
    </div>
  )
}

const PAGE = 25

function result(r: LedgerRow): string {
  if (r.lean === 'no_call') return r.beat_index == null ? '—' : 'No call'
  if (r.hit == null) return 'Pending'
  return r.hit ? 'Right' : 'Wrong'
}

function Ledger() {
  const [params, setParams] = useSearchParams()
  const ticker = params.get('ticker') ?? ''
  const [offset, setOffset] = useState(0)
  const stocks = useStocks()
  const { data, isPending, isError, refetch } = useLedger({ ticker: ticker || undefined, limit: PAGE, offset })
  const { hash } = useLocation()

  useEffect(() => {
    if (hash === '#ledger' && data) document.getElementById('ledger')?.scrollIntoView({ block: 'start' })
  }, [hash, data])

  return (
    <Card className="flex flex-col gap-3.5 p-4 lg:p-5">
      <div id="ledger" className="flex scroll-mt-20 flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-base font-semibold lg:text-lg">The public ledger</h2>
          <span className="text-[13px] text-muted">Every live call and how it turned out, newest first.</span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-2">
            Stock
            <select
              value={ticker}
              onChange={(e) => { setOffset(0); setParams(e.target.value ? { ticker: e.target.value } : {}) }}
              className="h-10 rounded-lg border border-line-2 bg-surface px-2.5 text-sm text-ink"
            >
              <option value="">All stocks</option>
              {stocks.data?.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}
            </select>
          </label>
          <a href={apiUrl('/api/ledger.csv')} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-2 px-3.5 text-sm font-medium text-ink no-underline">
            <Download size={15} /> CSV
          </a>
        </div>
      </div>

      {isPending && <Loading what="the ledger" />}
      {isError && <LoadError what="the ledger" onRetry={() => refetch()} />}
      {data && data.total === 0 && (
        <p className="m-0 text-sm text-ink-2">No live calls {ticker ? `on ${ticker} ` : ''}have been published yet.</p>
      )}
      {data && data.total > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">Published calls{ticker ? ` on ${ticker}` : ''}</caption>
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  {['Close of', 'Stock', 'Lean', 'Edge', 'Chance', 'vs index', 'Result'].map((h) => (
                    <th key={h} scope="col" className="border-b border-line px-2.5 py-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="border-b border-chip px-2.5 py-2.5 whitespace-nowrap text-ink-2">{shortDate(r.as_of)}</td>
                    <td className="border-b border-chip px-2.5 py-2.5 font-semibold">
                      <Link to={`/stocks/${r.symbol}`} className="text-ink no-underline">{r.symbol}</Link>
                    </td>
                    <td className="border-b border-chip px-2.5 py-2.5">{r.lean === 'no_call' ? 'No call' : r.lean === 'bullish' ? 'Bullish' : 'Bearish'}</td>
                    <td className="border-b border-chip px-2.5 py-2.5 text-ink-2">{r.lean === 'no_call' ? '—' : r.confidence.replace(' edge', '')}</td>
                    <td className="border-b border-chip px-2.5 py-2.5 whitespace-nowrap text-ink-2">
                      {r.lean === 'no_call' ? '—' : r.lean === 'bearish' ? `${pct(1 - r.p_outperform)} lags` : `${pct(r.p_outperform)} beats`}
                    </td>
                    <td className="border-b border-chip px-2.5 py-2.5 text-ink-2">{signedPct(r.excess_return)}</td>
                    <td className="border-b border-chip px-2.5 py-2.5 font-medium">{result(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
            <span>
              Showing {offset + 1}–{Math.min(offset + PAGE, data.total)} of {count(data.total)}. "No call" rows are included so nothing is hidden.
            </span>
            <span className="flex gap-2">
              <button type="button" disabled={offset === 0} onClick={() => setOffset(offset - PAGE)}
                className="h-9 cursor-pointer rounded-lg border border-line-2 px-3 text-ink disabled:cursor-default disabled:opacity-40">Newer</button>
              <button type="button" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}
                className="h-9 cursor-pointer rounded-lg border border-line-2 px-3 text-ink disabled:cursor-default disabled:opacity-40">Older</button>
            </span>
          </div>
        </>
      )}
    </Card>
  )
}

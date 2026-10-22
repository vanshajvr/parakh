import { Link } from 'react-router'
import type { Today } from '../api/client'
import { closeLabel, dayLabel, pct, signedPct } from '../lib/format'
import { Disclosure } from './Disclosure'
import { LeanPill } from './LeanPill'

type Market = NonNullable<Today['market']>
type RecentCall = Today['recent_simulated'][number]

/** The benchmark every call is measured against, at the latest close. */
export function MarketStrip({ market, callsAsOf }: { market: Market; callsAsOf?: string | null }) {
  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm text-ink-2">
      <span className="font-semibold text-ink">NIFTY 50 {market.index_close.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
      <span>{signedPct(market.index_change_1d, 1)} on the day</span>
      <span>{signedPct(market.index_change_5d, 1)} over 5 days</span>
      {market.as_of !== callsAsOf && <span className="text-muted">{closeLabel(market.as_of)}</span>}
    </p>
  )
}

/**
 * The reversal rule's only input, for every stock: last week's return against the average of the
 * 20. The ends of this list are where calls come from, but it isn't a list of calls: only stocks
 * far enough from the middle get one (decision D-024).
 */
export function RuleView({ market }: { market: Market }) {
  const stocks = market.stocks
  if (stocks.length === 0) return null
  const laggard = stocks[0], leader = stocks[stocks.length - 1]
  const extent = Math.max(...stocks.map((s) => Math.abs(s.vs_peers_5d)), 0.005)
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Disclosure
        buttonClassName="min-h-14 px-4 py-3.5"
        summary={
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-ink">What the rule sees</span>
            <span className="text-[13px] text-muted">
              {closeLabel(market.as_of)} · furthest behind: {laggard.symbol} ({signedPct(laggard.vs_peers_5d, 1)}) · furthest
              ahead: {leader.symbol} ({signedPct(leader.vs_peers_5d, 1)})
            </span>
          </span>
        }
      >
        <div className="flex flex-col gap-3 px-4 pb-4">
          <p className="m-0 text-sm leading-relaxed text-ink-2">
            Each stock's last 5 trading days compared with the average of the 20. Calls start from the two ends: stocks that
            fell furthest behind lean towards beating the index next, and those furthest ahead towards lagging it. Only the
            clearest cases get a call. This is the input, not the calls themselves.
          </p>
          <ol className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Stocks ranked by last week against the others">
            {stocks.map((s) => {
              const width = (Math.abs(s.vs_peers_5d) / extent) * 50
              const behind = s.vs_peers_5d < 0
              return (
                <li key={s.ticker} className="grid grid-cols-[5.5rem_1fr_4rem] items-center gap-2 text-[13px]">
                  <Link to={`/stocks/${s.symbol}`} className="truncate font-medium text-ink no-underline">{s.symbol}</Link>
                  <span className="relative h-3" aria-hidden>
                    <span className="absolute inset-y-0 left-1/2 w-px bg-line-2" />
                    <span className={`absolute inset-y-0.5 rounded-sm bg-ink-2 ${behind ? 'right-1/2' : 'left-1/2'}`} style={{ width: `${width}%` }} />
                  </span>
                  <span className="text-right text-ink-2 tabular-nums">{signedPct(s.vs_peers_5d, 1)}</span>
                </li>
              )
            })}
          </ol>
          <div className="flex justify-between text-xs text-muted">
            <span>← behind the others</span>
            <span>ahead of the others →</span>
          </div>
        </div>
      </Disclosure>
    </section>
  )
}

const SHOWN = 20

/** The method's most recent calls in testing, with how they turned out. Always labelled simulated. */
export function RecentTesting({ calls }: { calls: RecentCall[] }) {
  if (calls.length === 0) return null
  const right = calls.filter((c) => c.hit).length
  const dates = calls.map((c) => c.date).sort()
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Disclosure
        buttonClassName="min-h-14 px-4 py-3.5"
        summary={
          <span className="flex flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-ink">Recent calls in testing</span>
              <span className="rounded-full border border-dashed border-muted px-2 py-0.5 text-xs font-semibold text-ink-2">Simulated</span>
            </span>
            <span className="text-[13px] text-muted">
              {dayLabel(dates[0])} to {dayLabel(dates[dates.length - 1])} · {right} of {calls.length} right ({pct(right / calls.length, 0)})
            </span>
          </span>
        }
      >
        <div className="flex flex-col gap-3 px-4 pb-4">
          <p className="m-0 text-sm leading-relaxed text-ink-2">
            How the same method called the latest weeks in testing, before live calls began. These were never published, so
            they don't count towards the live record.
          </p>
          <ul className="m-0 flex list-none flex-col p-0">
            {calls.slice(0, SHOWN).map((c) => (
              <li key={`${c.date}-${c.ticker}`} className="flex items-center gap-3 border-b border-chip py-2 text-[13px] last:border-0">
                <span className="w-20 shrink-0 text-muted">{dayLabel(c.date)}</span>
                <Link to={`/stocks/${c.symbol}`} className="w-24 shrink-0 truncate font-medium text-ink no-underline">{c.symbol}</Link>
                <span className="hidden sm:block"><LeanPill lean={c.lean} /></span>
                <span className="ml-auto text-right">
                  <span className="font-medium text-ink">{c.hit ? 'Right' : 'Wrong'}</span>
                  <span className="text-muted"> · {signedPct(c.excess_return, 1)} vs index</span>
                </span>
              </li>
            ))}
          </ul>
          {calls.length > SHOWN && <p className="m-0 text-xs text-muted">Showing the latest {SHOWN} of {calls.length}.</p>}
        </div>
      </Disclosure>
    </section>
  )
}

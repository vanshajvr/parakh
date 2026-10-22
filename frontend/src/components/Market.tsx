import { Link } from 'react-router'
import type { Today } from '../api/client'
import { closeLabel, dayLabel, pct, signedPct } from '../lib/format'
import { Disclosure } from './Disclosure'
import { ChartKey } from './ChartKey'
import { LazyCandleChart as CandleChart } from './LazyCandleChart'
import { Card } from './States'
import { LeanPill } from './LeanPill'

type Market = NonNullable<Today['market']>
type RecentCall = Today['recent_simulated'][number]

const points = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** The benchmark every call is measured against: a year of daily candles, latest close and trend. */
export function IndexCard({ market, height }: { market: Market; height: number }) {
  const moves: [string, number | null | undefined][] = [
    ['1 day', market.index_change_1d], ['5 days', market.index_change_5d], ['1 month', market.index_change_20d],
  ]
  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4 lg:p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-base font-semibold">NIFTY 50</h2>
          <span className="text-[13px] text-muted">The index every call is measured against · {closeLabel(market.as_of)}</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-[28px] leading-none font-semibold tracking-[-0.01em] tabular-nums">{points(market.index_close)}</span>
          {moves.map(([label, v]) => (
            <span key={label} className="flex flex-col text-right text-xs text-muted">
              <span className="text-[13px] font-medium text-ink tabular-nums">{signedPct(v, 1)}</span>
              {label}
            </span>
          ))}
        </div>
      </div>
      <CandleChart symbol="NIFTY50" name="NIFTY 50" height={height} defaultRange="All" format={points} />
      <Disclosure buttonClassName="min-h-11" summary={<span className="text-sm font-medium text-link">How to read this chart</span>}>
        <div className="flex flex-col gap-2 pt-1 text-xs text-ink-2">
          <p className="m-0 leading-relaxed">
            Each candle is one trading day since 2016. The thin line runs from the day's lowest price to its highest; the box runs
            from where it opened to where it closed.
          </p>
          <ChartKey />
          <Link to="/learn#candles" className="font-medium no-underline">How to read a candle →</Link>
        </div>
      </Disclosure>
    </Card>
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

import { Link } from 'react-router'
import type { Today } from '../api/client'
import { useI18n } from '../i18n'
import { closeLabel, dayLabel, pct, signedPct } from '../lib/format'
import { Disclosure } from './Disclosure'
import { ChartKey } from './ChartKey'
import { LazyCandleChart as CandleChart } from './LazyCandleChart'
import { CountUp } from './CountUp'
import { Card } from './States'
import { LeanPill } from './LeanPill'
import { Term } from './Term'

type Market = NonNullable<Today['market']>
type RecentCall = Today['recent_simulated'][number]

const points = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** The benchmark every call is measured against: a year of daily candles, latest close and trend. */
export function IndexCard({ market, height }: { market: Market; height: number }) {
  const { m } = useI18n()
  const moves: [string, number | null | undefined][] = [
    [m.market.moves.d1, market.index_change_1d], [m.market.moves.d5, market.index_change_5d], [m.market.moves.d20, market.index_change_20d],
  ]
  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4 lg:p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-base font-semibold"><Term id="nifty50" /></h2>
          <span className="text-[13px] text-muted">{m.market.indexSubtitle(closeLabel(market.as_of, m))}</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-[28px] leading-none font-semibold tracking-[-0.01em] tabular-nums"><CountUp value={points(market.index_close)} /></span>
          {moves.map(([label, v]) => (
            <span key={label} className="flex flex-col text-right text-xs text-muted">
              <span className="text-[13px] font-medium text-ink tabular-nums">{signedPct(v, 1)}</span>
              {label}
            </span>
          ))}
        </div>
      </div>
      <CandleChart symbol="NIFTY50" name="NIFTY 50" height={height} defaultRange="All" format={points} />
      <Disclosure buttonClassName="min-h-11" summary={<span className="text-sm font-medium text-link">{m.market.howToReadChart}</span>}>
        <div className="flex flex-col gap-2 pt-1 text-xs text-ink-2">
          <p className="m-0 leading-relaxed">{m.market.candleIntro} <Term id="candle" /> · <Term id="movingAverage" /></p>
          <ChartKey />
          <Link to="/learn#candles" className="font-medium no-underline">{m.market.candleLink}</Link>
        </div>
      </Disclosure>
    </Card>
  )
}

const SHOWN = 20

/** The method's most recent calls in testing, with how they turned out. Always labelled simulated. */
export function RecentTesting({ calls }: { calls: RecentCall[] }) {
  const { m } = useI18n()
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
              <span className="text-base font-semibold text-ink">{m.market.recentTitle}</span>
              <span className="rounded-full border border-dashed border-muted px-2 py-0.5 text-xs font-semibold text-ink-2">{m.market.simulated}</span>
            </span>
            <span className="text-[13px] text-muted">
              {m.market.recentSummary(dayLabel(dates[0], m.locale), dayLabel(dates[dates.length - 1], m.locale), right, calls.length, pct(right / calls.length, 0))}
            </span>
          </span>
        }
      >
        <div className="flex flex-col gap-3 px-4 pb-4">
          <p className="m-0 text-sm leading-relaxed text-ink-2">{m.market.recentIntro}</p>
          <ul className="m-0 flex list-none flex-col p-0">
            {calls.slice(0, SHOWN).map((c) => (
              <li key={`${c.date}-${c.ticker}`} className="-mx-2 flex items-center gap-3 rounded-lg border-b border-chip px-2 py-2 text-[13px] last:border-0 hover:bg-page">
                <span className="w-20 shrink-0 text-muted">{dayLabel(c.date, m.locale)}</span>
                <Link to={`/stocks/${c.symbol}`} className="w-24 shrink-0 truncate font-medium text-ink no-underline">{c.symbol}</Link>
                <span className="hidden sm:block"><LeanPill lean={c.lean} /></span>
                <span className="ml-auto text-right">
                  <span className="font-medium text-ink">{c.hit ? m.market.right : m.market.wrong}</span>
                  <span className="text-muted">{m.market.vsIndex(signedPct(c.excess_return, 1))}</span>
                </span>
              </li>
            ))}
          </ul>
          {calls.length > SHOWN && <p className="m-0 text-xs text-muted">{m.market.showingLatest(SHOWN, calls.length)}</p>}
        </div>
      </Disclosure>
    </section>
  )
}

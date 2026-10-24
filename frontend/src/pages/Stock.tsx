import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { NotFound, useStock, type Signal, type StockDetail } from '../api/client'
import { Disclosure } from '../components/Disclosure'
import { FactorBars } from '../components/FactorBars'
import { ChevronLeft, Info, Warning } from '../components/Icons'
import { LeanPill } from '../components/LeanPill'
import { StockNews } from '../components/News'
import { ChartKey } from '../components/ChartKey'
import { LazyCandleChart as CandleChart } from '../components/LazyCandleChart'
import { Card, Loading, LoadError, NotFoundState } from '../components/States'
import { markers } from '../lib/chart'
import { en } from '../i18n/en'
import { stockCaveat, stockRange } from '../lib/calls'
import { capitalize, closeLabel, count, dayLabel, pct, price, shortDate, signedPct } from '../lib/format'
import { DESKTOP, useMediaQuery } from '../lib/useMediaQuery'
import { NEWS_ENABLED } from '../lib/features'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function Stock() {
  const symbol = (useParams().symbol ?? '').toUpperCase()
  const { data, isPending, isError, error, refetch } = useStock(symbol)
  if (isPending) return <Loading what={symbol} />
  if (isError && error instanceof NotFound) return <NotFoundState message={`Parakh doesn't cover ${symbol}.`} />
  if (isError) return <LoadError what={symbol} onRetry={() => refetch()} />
  return <StockView data={data} />
}

export function StockView({ data }: { data: StockDetail }) {
  useDocumentTitle(data.stock.name)
  const isDesktop = useMediaQuery(DESKTOP)
  const { stock, latest } = data
  const last = data.prices.at(-1)
  const prev = data.prices.at(-2)

  return (
    <div className="stagger flex flex-col gap-4 lg:gap-6">
      <Link to="/" className="inline-flex items-center gap-1 self-start text-sm font-medium no-underline">
        <ChevronLeft size={16} /> Today's calls
      </Link>

      <section className="flex flex-col gap-1 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-serif text-[28px] leading-tight font-semibold tracking-[-0.015em] lg:text-[40px]">{stock.name}</h1>
          <span className="text-[13px] text-muted">{stock.symbol} · {stock.sector}</span>
        </div>
        {last && (
          <div className="mt-2 flex items-baseline gap-2.5 lg:mt-0">
            <span className="text-[26px] font-semibold">{price(last.close)}</span>
            <span className="text-sm text-muted">
              {prev && `${signedPct(last.close / prev.close - 1)} · `}{dayLabel(last.date)} close
            </span>
          </div>
        )}
      </section>

      {/* Phone order: call, chart, why. Desktop: chart on the left, call and why on the right. */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-6">
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          {stock.covered !== false ? <TodaysCall stock={data} latest={latest ?? null} /> : <NotCovered name={stock.name} />}
        </div>
        <Card className="flex min-w-0 flex-col gap-3 p-4 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:p-5">
          <h2 className="m-0 text-base font-semibold">Price and past calls</h2>
          <CandleChart symbol={stock.symbol} name={stock.name} markers={markers(data)} height={isDesktop ? 340 : 260} />
          <Disclosure
            buttonClassName="min-h-11"
            summary={<span className="text-sm font-medium text-link">How to read this chart</span>}
          >
            <div className="flex flex-col gap-2 pt-1">
              <ChartKey calls />
              <Link to="/learn#candles" className="text-xs font-medium no-underline">How to read a candle →</Link>
            </div>
          </Disclosure>
        </Card>
        {latest && latest.lean !== 'no_call' && latest.factors.length > 0 && (
          <Card className="min-w-0 overflow-hidden lg:col-start-2 lg:row-start-2">
            <Disclosure
              buttonClassName="min-h-14 px-4 py-3.5"
              summary={
                <span className="flex flex-col gap-0.5">
                  <span className="text-base font-semibold text-ink">Why this call</span>
                  <span className="text-[13px] text-muted">Top factor: {latest.factors[0].text}</span>
                </span>
              }
            >
              <div className="flex flex-col gap-3.5 px-4 pb-4">
                <FactorBars factors={latest.factors} />
                <p className="m-0 text-[13px] leading-relaxed text-muted">
                  {latest.factors.length === 1
                    ? "This call rests on one tendency: last week's laggards have often done a little better the following week, and leaders a little worse. "
                    : "These are the factors that moved this call most. They aren't guaranteed causes: the model often bets on reversals, and factors work in combination. "}
                  <Link to="/learn#reversals" className="no-underline">How the model thinks →</Link>
                </p>
              </div>
            </Disclosure>
          </Card>
        )}
      </div>

      {NEWS_ENABLED && <StockNews symbol={stock.symbol} />}
      {stock.covered !== false && <StockRecord data={data} />}
    </div>
  )
}

const MEANING = {
  bullish: "The data leans towards this stock doing a little better than simply holding the index. It doesn't say the price will rise, and the edge is small.",
  bearish: "The data suggests waiting. It doesn't say the price will fall, only that it may do a little worse than simply holding the index.",
  no_call: "The signals for this stock are mixed or weak, so there's no lean either way today.",
}

function callSentence(name: string, s: Signal): string {
  if (s.lean === 'bullish') return `${pct(s.p_outperform)} chance ${name} does better than a NIFTY 50 index fund over the next 5 trading days.`
  if (s.lean === 'bearish') return `${pct(1 - s.p_outperform)} chance ${name} does worse than a NIFTY 50 index fund over the next 5 trading days.`
  return `No clear edge on ${name} today.`
}

/** NIFTY 50 members outside Parakh's 20: prices and chart, but no calls and no testing record. */
function NotCovered({ name }: { name: string }) {
  return (
    <Card className="flex flex-col gap-2 p-4 lg:p-5">
      <span className="text-xs font-semibold tracking-wider text-muted uppercase">No Parakh calls</span>
      <p className="m-0 text-sm leading-relaxed text-ink-2">
        {name} is in the NIFTY 50, so its prices are shown here, but it isn't one of the 20 stocks Parakh's method was
        tested on. Parakh makes no calls on it and has no track record for it.
      </p>
      <Link to="/stocks?covered=1" className="text-sm font-medium no-underline">See the 20 stocks Parakh covers →</Link>
    </Card>
  )
}

function TodaysCall({ stock, latest }: { stock: StockDetail; latest: Signal | null }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="flex flex-col gap-3 p-4 lg:p-5">
      <div className="-my-2 -mr-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">
          {latest ? `Call for ${closeLabel(latest.as_of)}` : "Today's call"}
        </span>
        {latest && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={`What does ${latest.lean_label.toLowerCase()} mean?`}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-chip"
          >
            <Info size={20} />
          </button>
        )}
      </div>
      {latest ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <LeanPill lean={latest.lean} />
            {latest.lean !== 'no_call' && (
              <span className="inline-flex h-7 items-center rounded-full border border-line-2 px-2.5 text-[13px] font-medium text-ink-2">
                {en.confidence(latest.confidence)}
              </span>
            )}
          </div>
          <p className="m-0 font-serif text-lg leading-snug">{callSentence(stock.stock.name, latest)}</p>
          {open && (
            <div className="flex flex-col gap-1 rounded-xl bg-page p-3">
              <span className="text-[13px] font-semibold">What this means</span>
              <span className="text-sm leading-relaxed text-ink-2">{MEANING[latest.lean]}</span>
            </div>
          )}
        </>
      ) : (
        <p className="m-0 text-sm leading-relaxed text-ink-2">
          No call has been published for {stock.stock.name} yet. Calls go out every trading day after the close.
        </p>
      )}
    </Card>
  )
}

type HistoryRow = { date: string; lean: 'bullish' | 'bearish'; result: 'Right' | 'Wrong' | 'Pending'; live: boolean }

function history(data: StockDetail, n: number): HistoryRow[] {
  const live: HistoryRow[] = data.live_calls
    .filter((c) => c.lean !== 'no_call')
    .map((c) => ({ date: c.as_of, lean: c.lean as HistoryRow['lean'], result: c.hit == null ? 'Pending' : c.hit ? 'Right' : 'Wrong', live: true }))
  const simulated: HistoryRow[] = data.simulated_calls
    .filter((c) => c.lean !== 'no_call')
    .map((c) => ({ date: c.date, lean: c.lean as HistoryRow['lean'], result: (c.lean === 'bullish') === c.beat_index ? 'Right' : 'Wrong', live: false }))
  return [...live, ...simulated].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n)
}

function StockRecord({ data }: { data: StockDetail }) {
  const { stock, simulated_stats: sim, simulated_past_year_stats: year, live_stats: live } = data
  const below = sim?.hit_rate != null && sim.hit_rate < 0.5
  const receipt = data.latest?.receipt
  const range = receipt ? stockRange(receipt) : null
  const rows = history(data, 8)
  const rightOf = (s: typeof year) => (s && s.hit_rate != null ? `${Math.round(s.hit_rate * s.n_calls)} of ${count(s.n_calls)}` : '—')

  return (
    <Card className="overflow-hidden">
      <Disclosure
        buttonClassName="min-h-14 px-4 py-3.5 lg:px-5"
        summary={
          <span className="flex flex-col gap-1">
            <span className="text-base font-semibold text-ink">Our record on {stock.name}</span>
            {sim?.hit_rate != null &&
              (below ? (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-bear">
                  <Warning size={15} /> {pct(sim.hit_rate)} right in testing, below a coin flip{range && ` (${range})`}
                </span>
              ) : (
                <span className="text-[13px] text-muted">{pct(sim.hit_rate)} right in testing ({count(sim.n_calls)} calls)</span>
              ))}
          </span>
        }
      >
        <div className="flex flex-col gap-4 px-4 pb-4 lg:px-5 lg:pb-5">
          {below && sim && (
            <p className="m-0 flex gap-2.5 rounded-xl bg-bear-tint p-3 text-sm leading-relaxed text-warn-ink">
              <Warning size={18} className="mt-0.5 shrink-0" />
              <span>
                <strong className="font-semibold">Below 50% on {stock.name} in testing.</strong> Its testing calls were
                right {pct(sim.hit_rate)} of the time across {count(sim.n_calls)} calls{range ? ` (${range})` : ''}.{' '}
                {receipt ? stockCaveat(receipt) : 'With this few calls, part of that may be chance.'}
              </span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-2.5 lg:max-w-md">
            <div className="flex flex-col gap-0.5 rounded-xl bg-page px-3 py-2.5">
              <span className="text-xl font-semibold">{rightOf(year)}</span>
              <span className="text-xs text-muted">right in the past year (testing)</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl bg-page px-3 py-2.5">
              <span className="text-xl font-semibold">{rightOf(live)}</span>
              <span className="text-xs text-muted">right in live calls so far</span>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] border-collapse text-sm">
                <caption className="sr-only">Most recent calls on {stock.name}</caption>
                <thead>
                  <tr className="text-left text-xs tracking-wide text-muted uppercase">
                    <th scope="col" className="border-b border-line px-2 py-2 font-semibold">Call date</th>
                    <th scope="col" className="border-b border-line px-2 py-2 font-semibold">Lean</th>
                    <th scope="col" className="border-b border-line px-2 py-2 font-semibold">After 5 days</th>
                    <th scope="col" className="border-b border-line px-2 py-2 font-semibold"><span className="sr-only">Record</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.live}-${r.date}`} className="hover:bg-page">
                      <td className="border-b border-chip px-2 py-2.5 whitespace-nowrap">{shortDate(r.date)}</td>
                      <td className="border-b border-chip px-2 py-2.5">{capitalize(r.lean)}</td>
                      <td className="border-b border-chip px-2 py-2.5 font-medium">{r.result}</td>
                      <td className="border-b border-chip px-2 py-2.5 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.live ? 'bg-brand text-on-brand' : 'border border-dashed border-muted text-ink-2'}`}>
                          {r.live ? 'Live' : 'Simulated'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link to={`/record?ticker=${stock.symbol}#ledger`} className="self-start text-sm font-medium no-underline">
            Every live call on {stock.symbol} →
          </Link>
        </div>
      </Disclosure>
    </Card>
  )
}

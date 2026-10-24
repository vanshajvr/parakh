import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { Signal, Today as TodayData } from '../api/client'
import { LazyCandleChart as CandleChart } from '../components/LazyCandleChart'
import { LeanPill } from '../components/LeanPill'
import { Movers } from '../components/Movers'
import { StockNews } from '../components/News'
import { NextCalls } from '../components/NextCalls'
import { Card } from '../components/States'
import { Suggestions } from '../components/Suggestions'
import { Term } from '../components/Term'
import { useI18n } from '../i18n'
import { closeness, drivers, gapText, receiptLong, receiptShort, statusText, type OpenCall } from '../lib/calls'
import { closeLabel, price, signedPct } from '../lib/format'
import { HowToRead, KeyNumbers, LiveRecord } from './Today'

/**
 * Today on a laptop (decision D-038): a master–detail workspace. The 20 stocks sit in a list on
 * the left, calls first and then the no-calls by how close they came; the selected stock's chart,
 * reasons and news fill the middle; the rail on the right holds what to look at next and the
 * market. The selection lives in the URL (?stock=TCS), so a link opens on that stock.
 */
export function TodayWorkspace({ data }: { data: TodayData }) {
  const { m } = useI18n()
  const [params, setParams] = useSearchParams()
  const calls = data.signals.filter((s) => s.lean !== 'no_call')
  const noCall = data.signals
    .filter((s) => s.lean === 'no_call')
    .sort((a, b) => (b.no_call ? closeness(b.no_call) ?? 0 : 0) - (a.no_call ? closeness(a.no_call) ?? 0 : 0))
  const running = (data.open_calls ?? []).filter((c) => c.as_of !== data.as_of)
  const selected = data.signals.find((s) => s.symbol === params.get('stock')) ?? calls[0] ?? data.signals[0]
  const select = (symbol: string) => setParams((p) => ({ ...Object.fromEntries(p), stock: symbol }), { replace: true })

  return (
    <div className="stagger flex flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 px-1">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-serif text-[40px] leading-tight font-semibold tracking-[-0.015em]">{m.today.title}</h1>
          {data.as_of && <p className="m-0 text-sm text-muted">{m.today.asOf(closeLabel(data.as_of, m))}</p>}
        </div>
        {data.as_of && <NextCalls asOf={data.as_of} />}
      </section>
      <KeyNumbers data={data} />
      <div className="grid grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(280px,340px)] items-start gap-6">
        <Card className="sticky top-24 flex max-h-[calc(100dvh-7rem)] flex-col overflow-y-auto p-2">
          <nav aria-label={m.today.callsAria}>
            <ListHeading>{m.today.filters.calls} · {calls.length}</ListHeading>
            <ul className="m-0 flex list-none flex-col p-0">
              {calls.map((s) => <StockRow key={s.ticker} signal={s} active={s.ticker === selected?.ticker} onSelect={select} />)}
            </ul>
            {noCall.length > 0 && (
              <>
                <ListHeading>{m.noCall.title(noCall.length)}</ListHeading>
                <p className="m-0 px-3 pb-2 text-xs leading-relaxed text-muted">{m.noCall.intro} <Term id="reversal" /></p>
                <ul className="m-0 flex list-none flex-col p-0">
                  {noCall.map((s) => <StockRow key={s.ticker} signal={s} active={s.ticker === selected?.ticker} onSelect={select} />)}
                </ul>
              </>
            )}
          </nav>
        </Card>
        <div className="flex min-w-0 flex-col gap-6">
          {selected && <Detail key={selected.ticker} signal={selected} running={running.find((c) => c.symbol === selected.symbol)} />}
          <OpenCallsTable calls={running} onSelect={select} />
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <Suggestions data={data} />
          <Movers />
          <LiveRecord data={data} />
          <HowToRead />
        </aside>
      </div>
    </div>
  )
}

function ListHeading({ children }: { children: ReactNode }) {
  return <h2 className="m-0 px-3 pt-3 pb-1.5 text-xs font-semibold tracking-wide text-muted uppercase first:pt-2">{children}</h2>
}

function StockRow({ signal, active, onSelect }: { signal: Signal; active: boolean; onSelect: (symbol: string) => void }) {
  const { m } = useI18n()
  const share = signal.no_call ? closeness(signal.no_call) : null
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(signal.symbol)}
        aria-current={active ? 'true' : undefined}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] ${active ? 'bg-chip' : 'hover:bg-page'}`}
      >
        <span className="w-24 shrink-0 font-semibold text-ink">{signal.symbol}</span>
        {signal.lean !== 'no_call' ? (
          <span className="flex-1"><LeanPill lean={signal.lean} /></span>
        ) : share != null ? (
          <span className="flex flex-1 items-center gap-2" role="img" aria-label={m.noCall.closeness(signal.symbol, share)}>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-chip">
              <span className="grow-x block h-full rounded-full bg-ink-2" style={{ width: `${share * 100}%` }} />
            </span>
            <span className="w-9 text-right text-muted tabular-nums">{Math.round(share * 100)}%</span>
          </span>
        ) : (
          <span className="flex-1 text-muted">{m.lean.no_call}</span>
        )}
        <span className="w-14 text-right text-ink-2 tabular-nums">{signedPct(signal.change_1d, 1)}</span>
      </button>
    </li>
  )
}

/** The selected stock: its call (or why there's none), its chart, and its news. */
function Detail({ signal, running }: { signal: Signal; running?: OpenCall }) {
  const { m } = useI18n()
  const short = receiptShort(signal, m)
  const why = signal.lean === 'no_call' ? [] : drivers(signal, 2, m)
  return (
    <>
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 className="m-0 font-serif text-[28px] leading-tight font-semibold">{signal.name}</h2>
            <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <LeanPill lean={signal.lean} />
              {short && <span>{m.confidence(signal.confidence)} · {short}</span>}
            </span>
          </div>
          <span className="flex items-baseline gap-2">
            <span className="text-[24px] font-semibold">{price(signal.close)}</span>
            <span className="text-sm text-muted">{signedPct(signal.change_1d)}</span>
          </span>
        </div>
        <CandleChart symbol={signal.symbol} name={signal.name} height={380} />
        <div className="flex flex-col gap-2 rounded-xl bg-page px-4 py-3 text-sm leading-relaxed text-ink-2">
          {signal.lean === 'no_call' ? (
            signal.no_call ? (
              <span>
                <strong className="font-semibold text-ink">{m.lean.no_call}:</strong> {m.noCall.move(signal.no_call.move)} ·{' '}
                {signal.no_call.calls_from == null ? m.noCall.noneThisSide : m.noCall.callsFrom(signal.no_call.calls_from)}
              </span>
            ) : (
              <span>{m.noCall.generic}</span>
            )
          ) : (
            <>
              {why.length > 0 && <span><strong className="font-semibold text-ink">{m.call.biggestFactors}:</strong> {why.join(' · ')}</span>}
              <span className="text-[13px]">{receiptLong(signal, m)}</span>
            </>
          )}
          {running && running.excess_return != null && (
            <span className="text-[13px]">
              <strong className="font-semibold text-ink">{m.openCalls.title}:</strong>{' '}
              {m.openCalls.dayOf(running.sessions_done, running.horizon)} · {gapText(running.excess_return, m)} · {statusText(running, m)}
            </span>
          )}
        </div>
        <Link to={`/stocks/${signal.symbol}`} className="self-start text-sm font-medium no-underline">{m.call.open(signal.symbol)}</Link>
      </Card>
      <StockNews symbol={signal.symbol} />
    </>
  )
}

/** Calls still inside their 5 trading days, as one row each. */
function OpenCallsTable({ calls, onSelect }: { calls: OpenCall[]; onSelect: (symbol: string) => void }) {
  const { m } = useI18n()
  if (calls.length === 0) return null
  return (
    <Card className="flex flex-col gap-2 p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 text-base font-semibold">{m.openCalls.title}</h2>
        <p className="m-0 text-[13px] leading-relaxed text-muted">{m.openCalls.intro}</p>
      </div>
      <table className="w-full border-collapse text-[13px]">
        <tbody>
          {calls.map((c) => (
            <tr key={c.id} className="border-b border-chip last:border-0 hover:bg-page">
              <td className="py-2 pr-2 pl-1">
                <button type="button" onClick={() => onSelect(c.symbol)} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-ink">{c.symbol}</button>
              </td>
              <td className="py-2 pr-2"><LeanPill lean={c.lean} /></td>
              <td className="py-2 pr-2">
                <span className="flex w-16 gap-0.5" role="img" aria-label={m.openCalls.trackerAria(c.sessions_done, c.horizon)}>
                  {Array.from({ length: c.horizon }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < c.sessions_done ? 'bg-ink-2' : 'bg-chip'}`} />)}
                </span>
              </td>
              <td className="py-2 pr-2 text-ink-2">{c.excess_return == null ? m.openCalls.notStarted : gapText(c.excess_return, m)}</td>
              <td className="py-2 pr-1 text-right text-muted">{statusText(c, m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

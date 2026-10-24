import { useState } from 'react'
import { Link } from 'react-router'
import { useToday, type Signal, type Today as TodayData } from '../api/client'
import { CallCard } from '../components/CallCard'
import { Disclosure } from '../components/Disclosure'
import { Info, Minus, Warning } from '../components/Icons'
import { IndexCard, RecentTesting } from '../components/Market'
import { Movers } from '../components/Movers'
import { OpenCalls } from '../components/OpenCalls'
import { Loading, LoadError } from '../components/States'
import { Term } from '../components/Term'
import { useI18n } from '../i18n'
import { closeness } from '../lib/calls'
import { closeLabel, count, pct } from '../lib/format'
import { DESKTOP, useMediaQuery } from '../lib/useMediaQuery'
import { useDocumentTitle } from '../lib/useDocumentTitle'

type Filter = 'calls' | 'bullish' | 'bearish'

export function Today() {
  const { m } = useI18n()
  const { data, isPending, isError, refetch } = useToday()
  if (isPending) return <Loading what={m.today.loadingWhat} />
  if (isError) return <LoadError what={m.today.loadingWhat} onRetry={() => refetch()} />
  return <TodayView data={data} />
}

export function TodayView({ data }: { data: TodayData }) {
  useDocumentTitle()
  const { m } = useI18n()
  const [filter, setFilter] = useState<Filter>('calls')
  const [questionOpen, setQuestionOpen] = useState(false)
  const isDesktop = useMediaQuery(DESKTOP)
  const calls = data.signals.filter((s) => s.lean !== 'no_call')
  const noCall = data.signals.filter((s) => s.lean === 'no_call')
  const shown = filter === 'calls' ? calls : calls.filter((s) => s.lean === filter)
  const hasCalls = data.signals.length > 0

  const marketBlock = (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-6">
      {data.market && <div className="min-w-0 lg:col-span-2 [&>*]:h-full"><IndexCard market={data.market} height={isDesktop ? 400 : 200} /></div>}
      <div className="min-w-0 [&>*]:h-full"><Movers /></div>
    </div>
  )
  const callsBlock = hasCalls ? (
    <section aria-label={m.today.callsAria} className="flex flex-col gap-3">
      <FilterChips calls={calls} filter={filter} onChange={setFilter} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {shown.map((s) => <CallCard key={s.ticker} signal={s} />)}
      </div>
      {noCall.length > 0 && <NoCall stocks={noCall} />}
    </section>
  ) : <FirstCalls />

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <section className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-1">
          <h1 className="m-0 font-serif text-[30px] leading-tight font-semibold tracking-[-0.015em] lg:text-[40px]">{m.today.title}</h1>
          <button
            type="button"
            onClick={() => setQuestionOpen(!questionOpen)}
            aria-expanded={questionOpen}
            aria-label={m.today.infoAria}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-chip"
          >
            <Info size={20} />
          </button>
        </div>
        {data.as_of && (
          <p className="m-0 text-sm text-muted">{m.today.asOf(closeLabel(data.as_of, m))}</p>
        )}
      </section>

      {questionOpen && (
        <section className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3.5">
          <span className="text-xs font-semibold tracking-wider text-muted uppercase">{m.today.questionHeading}</span>
          <p className="m-0 font-serif text-[17px] leading-relaxed">{m.today.question}</p>
          <p className="m-0 text-[13px] leading-relaxed text-muted">
            {m.today.questionNote} <Term id="indexFund" /> · <Term id="tradingDay" />
          </p>
        </section>
      )}

      {data.status.stale && data.as_of && (
        <p role="status" className="m-0 flex items-center gap-2 rounded-xl bg-bear-tint px-4 py-3 text-sm text-warn-ink">
          <Warning size={16} />
          {m.today.stale(closeLabel(data.as_of, m))}
        </p>
      )}

      <KeyNumbers data={data} />

      {/* Adaptive order (D-031): the market leads until live calls exist, then today's calls move to the top. */}
      {hasCalls ? <>{callsBlock}{marketBlock}</> : <>{marketBlock}{callsBlock}</>}

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {/* Today's calls are the cards above; this tracks the earlier ones still running. */}
          <OpenCalls calls={(data.open_calls ?? []).filter((c) => c.as_of !== data.as_of)} />
          {/* Until live calls have results, the latest testing calls show what a scored call looks like. */}
          {data.scoreboard.live_scored === 0 && <RecentTesting calls={data.recent_simulated ?? []} />}
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <LiveRecord data={data} />
          <HowToRead />
        </aside>
      </div>
    </div>
  )
}

function FilterChips({ calls, filter, onChange }: { calls: Signal[]; filter: Filter; onChange: (f: Filter) => void }) {
  const { m } = useI18n()
  const options: { value: Filter; label: string; n: number }[] = [
    { value: 'calls', label: m.today.filters.calls, n: calls.length },
    { value: 'bullish', label: m.today.filters.bullish, n: calls.filter((s) => s.lean === 'bullish').length },
    { value: 'bearish', label: m.today.filters.bearish, n: calls.filter((s) => s.lean === 'bearish').length },
  ]
  return (
    <div role="group" aria-label={m.today.filterAria} className="flex gap-1.5 overflow-x-auto py-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={filter === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-[13px] font-medium ${
            filter === o.value ? 'border-brand bg-brand text-on-brand' : 'border-line-2 bg-surface text-ink'
          }`}
        >
          {o.label} · {o.n}
        </button>
      ))}
    </div>
  )
}

/**
 * The stocks without a call. Under the reversal rule each one says how far it moved against the
 * others and where that day's calls began, so "no call" reads as a reason, not a gap (decision D-035).
 */
function NoCall({ stocks }: { stocks: Signal[] }) {
  const { m } = useI18n()
  const explained = stocks.every((s) => s.no_call)
  const sorted = explained ? [...stocks].sort((a, b) => (closeness(b.no_call!) ?? 0) - (closeness(a.no_call!) ?? 0)) : stocks
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Disclosure
        buttonClassName="min-h-13 px-3.5 py-3"
        summary={
          <span className="flex items-center gap-2.5">
            <span className="inline-flex size-6.5 items-center justify-center rounded-full bg-chip text-muted">
              <Minus size={14} strokeWidth={2.6} />
            </span>
            <span className="text-[15px] font-semibold text-ink">{m.noCall.title(stocks.length)}</span>
          </span>
        }
      >
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          <p className="m-0 text-sm leading-relaxed text-muted">
            {explained ? m.noCall.intro : m.noCall.generic} <Term id="reversal" /> · <Term id="noCall" />
          </p>
          {explained ? (
            <ul className="m-0 grid list-none gap-x-6 p-0 md:grid-cols-2">
              {sorted.map((s) => <NoCallRow key={s.ticker} signal={s} />)}
            </ul>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {stocks.map((s) => (
                <Link key={s.ticker} to={`/stocks/${s.symbol}`} className="inline-flex h-8 items-center rounded-lg bg-page px-2.5 text-[13px] font-medium text-ink-2 no-underline">
                  {s.symbol}
                </Link>
              ))}
            </div>
          )}
        </div>
      </Disclosure>
    </section>
  )
}

function NoCallRow({ signal }: { signal: Signal }) {
  const { m } = useI18n()
  const d = signal.no_call!
  const share = closeness(d)
  return (
    <li className="flex flex-col gap-1.5 border-b border-chip py-2.5 last:border-0">
      <span className="flex items-baseline justify-between gap-3 text-[13px]">
        <Link to={`/stocks/${signal.symbol}`} className="font-semibold text-ink no-underline">{signal.symbol}</Link>
        <span className="text-right text-ink-2">{m.noCall.move(d.move)}</span>
      </span>
      {share != null && (
        <span className="h-1.5 overflow-hidden rounded-full bg-chip" role="img" aria-label={m.noCall.closeness(signal.symbol, share)}>
          <span className="block h-full rounded-full bg-ink-2" style={{ width: `${share * 100}%` }} />
        </span>
      )}
      <span className="text-xs text-muted">{d.calls_from == null ? m.noCall.noneThisSide : m.noCall.callsFrom(d.calls_from)}</span>
    </li>
  )
}

function HowToRead() {
  const { m } = useI18n()
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Disclosure buttonClassName="min-h-13 px-4 py-3" summary={<span className="text-[15px] font-semibold text-ink">{m.today.howToRead.title}</span>}>
        <dl className="m-0 flex flex-col gap-3 px-4 pb-4">
          {m.today.howToRead.rows.map(([term, meaning]) => (
            <div key={term} className="flex gap-3 text-sm leading-snug">
              <dt className="w-20 shrink-0 font-semibold text-ink">{term}</dt>
              <dd className="m-0 text-ink-2">{meaning}</dd>
            </div>
          ))}
          <Link to="/glossary" className="text-sm font-medium no-underline">{m.glossary.allTerms}</Link>
        </dl>
      </Disclosure>
    </section>
  )
}

function LiveRecord({ data }: { data: TodayData }) {
  const { m } = useI18n()
  const t = m.today.liveRecord
  const { live_days, live_published, live_scored, live, simulated } = data.scoreboard
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Disclosure
        buttonClassName="min-h-13 px-3.5 py-3"
        summary={
          <span className="flex items-center gap-2.5 text-sm text-ink">
            <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-on-brand">
              {live_days > 0 ? m.today.tiles.day(live_days) : m.today.tiles.starting}
            </span>
            <span>
              <strong className="font-semibold">{t.label}</strong>{t.summary(count(live_published), count(live_scored))}
            </span>
          </span>
        }
      >
        <div className="flex flex-col gap-2.5 px-4 pb-4 text-sm leading-relaxed">
          <p className="m-0 text-ink">
            {t.body}
            {live_scored === 0 && t.firstResults}
          </p>
          {live && live_scored > 0 && (
            <span className="text-ink-2">
              {t.liveSoFar} <strong className="font-semibold">{t.rightOf(pct(live.hit_rate))}</strong>{t.across(count(live.n_calls))}
            </span>
          )}
          {simulated && (
            <span className="text-ink-2">
              <Term id="testing">{t.inTesting}</Term> <strong className="font-semibold">{t.rightOf(pct(simulated.hit_rate))}</strong>{t.coinFlip}
            </span>
          )}
          <Link to="/record" className="font-medium no-underline">{t.fullRecord}</Link>
        </div>
      </Disclosure>
    </section>
  )
}

function FirstCalls() {
  const { m } = useI18n()
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
      <h2 className="m-0 text-base font-semibold">{m.today.firstCalls.title}</h2>
      <p className="m-0 text-sm leading-relaxed text-ink-2">{m.today.firstCalls.body}</p>
      <Link to="/record" className="text-sm font-medium no-underline">{m.today.firstCalls.link}</Link>
    </section>
  )
}

/** The four numbers that say where Parakh stands, each linking to its detail. */
function KeyNumbers({ data }: { data: TodayData }) {
  const { m } = useI18n()
  const t = m.today.tiles
  const { live_days, live_published, live_scored, live, simulated } = data.scoreboard
  const calls = data.signals.filter((s) => s.lean !== 'no_call')
  const bullish = calls.filter((s) => s.lean === 'bullish').length
  const tiles: { label: string; value: string; detail: string; to: string }[] = [
    {
      label: t.liveRecord, value: live_days > 0 ? t.day(live_days) : t.starting,
      detail: t.publishedScored(count(live_published), count(live_scored)), to: '/record',
    },
    {
      label: t.rightSoFar, value: live && live.n_calls > 0 ? pct(live.hit_rate) : '—',
      detail: live && live.n_calls > 0 ? t.acrossScored(count(live.n_calls)) : t.firstResults,
      to: '/record',
    },
    { label: t.inTesting, value: simulated ? pct(simulated.hit_rate) : '—', detail: t.inTestingDetail, to: '/record' },
    {
      label: t.todaysCalls, value: calls.length > 0 ? String(calls.length) : t.soon,
      detail: calls.length > 0 ? t.split(bullish, calls.length - bullish, data.signals.length - calls.length) : t.publishedAfterClose,
      to: calls.length > 0 ? '/' : '/learn#how',
    },
  ]
  return (
    <section aria-label={m.today.keyNumbersAria} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {tiles.map((tile) => (
        <Link key={tile.label} to={tile.to} className="flex flex-col gap-1 rounded-2xl border border-line bg-surface px-4 py-3 no-underline hover:border-line-2">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">{tile.label}</span>
          <span className="font-serif text-[26px] leading-tight font-semibold text-ink tabular-nums">{tile.value}</span>
          <span className="text-xs leading-snug text-muted">{tile.detail}</span>
        </Link>
      ))}
    </section>
  )
}

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
import { closeLabel, count, pct } from '../lib/format'
import { DESKTOP, useMediaQuery } from '../lib/useMediaQuery'
import { useDocumentTitle } from '../lib/useDocumentTitle'

type Filter = 'calls' | 'bullish' | 'bearish'

export function Today() {
  const { data, isPending, isError, refetch } = useToday()
  if (isPending) return <Loading what="today's calls" />
  if (isError) return <LoadError what="today's calls" onRetry={() => refetch()} />
  return <TodayView data={data} />
}

export function TodayView({ data }: { data: TodayData }) {
  useDocumentTitle()
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
    <section aria-label="Today's calls" className="flex flex-col gap-3">
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
          <h1 className="m-0 font-serif text-[30px] leading-tight font-semibold tracking-[-0.015em] lg:text-[40px]">Today's calls</h1>
          <button
            type="button"
            onClick={() => setQuestionOpen(!questionOpen)}
            aria-expanded={questionOpen}
            aria-label="What do these calls mean?"
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-chip"
          >
            <Info size={20} />
          </button>
        </div>
        {data.as_of && (
          <p className="m-0 text-sm text-muted">{closeLabel(data.as_of)} · looking 5 trading days ahead</p>
        )}
      </section>

      {questionOpen && (
        <section className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3.5">
          <span className="text-xs font-semibold tracking-wider text-muted uppercase">The question every call answers</span>
          <p className="m-0 font-serif text-[17px] leading-relaxed">
            Will this stock do better than a NIFTY 50 index fund over the next 5 trading days?
          </p>
          <p className="m-0 text-[13px] leading-relaxed text-muted">
            A lean is not a buy or sell instruction. "No call" means the data isn't clear enough to say.
          </p>
        </section>
      )}

      {data.status.stale && data.as_of && (
        <p role="status" className="m-0 flex items-center gap-2 rounded-xl bg-bear-tint px-4 py-3 text-sm text-warn-ink">
          <Warning size={16} />
          Data may be delayed: these calls are from {closeLabel(data.as_of)}.
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
  const options: { value: Filter; label: string; n: number }[] = [
    { value: 'calls', label: 'Calls', n: calls.length },
    { value: 'bullish', label: 'Bullish', n: calls.filter((s) => s.lean === 'bullish').length },
    { value: 'bearish', label: 'Bearish', n: calls.filter((s) => s.lean === 'bearish').length },
  ]
  return (
    <div role="group" aria-label="Filter calls" className="flex gap-1.5 overflow-x-auto py-1">
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

function NoCall({ stocks }: { stocks: Signal[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Disclosure
        buttonClassName="min-h-13 px-3.5 py-3"
        summary={
          <span className="flex items-center gap-2.5">
            <span className="inline-flex size-6.5 items-center justify-center rounded-full bg-chip text-muted">
              <Minus size={14} strokeWidth={2.6} />
            </span>
            <span className="text-[15px] font-semibold text-ink">No call on {stocks.length} stocks</span>
          </span>
        }
      >
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          <p className="m-0 text-sm leading-relaxed text-muted">The signals are mixed or weak, so we'd rather say nothing than guess.</p>
          <div className="flex flex-wrap gap-1.5">
            {stocks.map((s) => (
              <Link key={s.ticker} to={`/stocks/${s.symbol}`} className="inline-flex h-8 items-center rounded-lg bg-page px-2.5 text-[13px] font-medium text-ink-2 no-underline">
                {s.symbol}
              </Link>
            ))}
          </div>
        </div>
      </Disclosure>
    </section>
  )
}

const HOW_TO_READ = [
  ['Lean', 'Likely to beat or lag the index. Not a buy or sell instruction.'],
  ['Edge', 'How confident the model is, with how often that level was right in testing.'],
  ['Factors', 'What moved the call most, in plain words.'],
  ['No call', "We'd rather say nothing than guess."],
]

function HowToRead() {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Disclosure buttonClassName="min-h-13 px-4 py-3" summary={<span className="text-[15px] font-semibold text-ink">How to read a call</span>}>
        <dl className="m-0 flex flex-col gap-3 px-4 pb-4">
          {HOW_TO_READ.map(([term, meaning]) => (
            <div key={term} className="flex gap-3 text-sm leading-snug">
              <dt className="w-20 shrink-0 font-semibold text-ink">{term}</dt>
              <dd className="m-0 text-ink-2">{meaning}</dd>
            </div>
          ))}
        </dl>
      </Disclosure>
    </section>
  )
}

function LiveRecord({ data }: { data: TodayData }) {
  const { live_days, live_published, live_scored, live, simulated } = data.scoreboard
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Disclosure
        buttonClassName="min-h-13 px-3.5 py-3"
        summary={
          <span className="flex items-center gap-2.5 text-sm text-ink">
            <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-on-brand">
              {live_days > 0 ? `Day ${live_days}` : 'Starting'}
            </span>
            <span>
              <strong className="font-semibold">Live record</strong> · {count(live_published)} published · {count(live_scored)} scored
            </span>
          </span>
        }
      >
        <div className="flex flex-col gap-2.5 px-4 pb-4 text-sm leading-relaxed">
          <p className="m-0 text-ink">
            We're building our record in public. Every call is published before the market opens and can never be edited.
            {live_scored === 0 && ' First results arrive 5 trading days after the first calls.'}
          </p>
          {live && live_scored > 0 && (
            <span className="text-ink-2">
              Live so far: <strong className="font-semibold">right {pct(live.hit_rate)} of the time</strong> across {count(live.n_calls)} calls.
            </span>
          )}
          {simulated && (
            <span className="text-ink-2">
              In testing: <strong className="font-semibold">right {pct(simulated.hit_rate)} of the time</strong> (coin flip: 50%).
            </span>
          )}
          <Link to="/record" className="font-medium no-underline">See the full track record →</Link>
        </div>
      </Disclosure>
    </section>
  )
}

function FirstCalls() {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
      <h2 className="m-0 text-base font-semibold">Our first calls are on their way</h2>
      <p className="m-0 text-sm leading-relaxed text-ink-2">
        Calls are published every trading day after the market closes, before the next open. Until the first
        ones appear, you can see how the method did in testing.
      </p>
      <Link to="/record" className="text-sm font-medium no-underline">See the track record →</Link>
    </section>
  )
}

/** The four numbers that say where Parakh stands, each linking to its detail. */
function KeyNumbers({ data }: { data: TodayData }) {
  const { live_days, live_published, live_scored, live, simulated } = data.scoreboard
  const calls = data.signals.filter((s) => s.lean !== 'no_call')
  const bullish = calls.filter((s) => s.lean === 'bullish').length
  const tiles: { label: string; value: string; detail: string; to: string }[] = [
    {
      label: 'Live record', value: live_days > 0 ? `Day ${live_days}` : 'Starting',
      detail: `${count(live_published)} published · ${count(live_scored)} scored`, to: '/record',
    },
    {
      label: 'Right so far', value: live && live.n_calls > 0 ? pct(live.hit_rate) : '—',
      detail: live && live.n_calls > 0 ? `Across ${count(live.n_calls)} scored live calls` : 'First results 5 trading days after the first calls',
      to: '/record',
    },
    {
      label: 'In testing', value: simulated ? pct(simulated.hit_rate) : '—',
      detail: 'Of calls right, 2019–2026 · a coin flip gets 50%', to: '/record',
    },
    {
      label: "Today's calls", value: calls.length > 0 ? String(calls.length) : 'Soon',
      detail: calls.length > 0 ? `${bullish} bullish · ${calls.length - bullish} bearish · ${data.signals.length - calls.length} no call` : 'Published after each close, before the next open',
      to: calls.length > 0 ? '/' : '/learn#how',
    },
  ]
  return (
    <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {tiles.map((t) => (
        <Link key={t.label} to={t.to} className="flex flex-col gap-1 rounded-2xl border border-line bg-surface px-4 py-3 no-underline hover:border-line-2">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">{t.label}</span>
          <span className="font-serif text-[26px] leading-tight font-semibold text-ink tabular-nums">{t.value}</span>
          <span className="text-xs leading-snug text-muted">{t.detail}</span>
        </Link>
      ))}
    </section>
  )
}

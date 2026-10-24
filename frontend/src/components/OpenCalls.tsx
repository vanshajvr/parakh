import { Link } from 'react-router'
import { gapText, statusText, type OpenCall } from '../lib/calls'
import { useI18n } from '../i18n'
import { dayLabel, signedPct } from '../lib/format'
import { LeanPill } from './LeanPill'

/**
 * Calls still inside their 5 trading days, updated after each close. Everything here is
 * provisional: a call is only scored at the close of its last session, so the status is styled
 * as a dashed chip and never in the bullish/bearish colours.
 */
export function OpenCalls({ calls }: { calls: OpenCall[] }) {
  const { m } = useI18n()
  if (calls.length === 0) return null
  return (
    <section aria-labelledby="open-calls" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 px-1">
        <h2 id="open-calls" className="m-0 text-lg font-semibold">{m.openCalls.title}</h2>
        <p className="m-0 text-[13px] leading-relaxed text-muted">{m.openCalls.intro}</p>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-2 lg:gap-4">
        {calls.map((c) => <OpenCallCard key={c.id} call={c} />)}
      </ul>
    </section>
  )
}

function OpenCallCard({ call }: { call: OpenCall }) {
  const { m } = useI18n()
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <Link to={`/stocks/${call.symbol}`} className="text-base font-semibold text-ink no-underline">{call.symbol}</Link>
            <LeanPill lean={call.lean} />
          </span>
          <span className="text-[13px] text-muted">{m.openCalls.calledAfter(dayLabel(call.as_of, m.locale), m.confidence(call.confidence))}</span>
        </div>
        <span className="shrink-0 text-[13px] font-medium text-ink-2">
          {m.openCalls.dayOf(call.sessions_done, call.horizon)}
        </span>
      </div>

      <DayTracker done={call.sessions_done} total={call.horizon} />

      {call.excess_return == null ? (
        <p className="m-0 text-sm text-ink-2">{m.openCalls.notStarted}</p>
      ) : (
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-ink-2">
              {call.symbol} {signedPct(call.stock_return, 1)} · NIFTY 50 {signedPct(call.index_return, 1)}
            </span>
            <span className="font-medium text-ink">{gapText(call.excess_return, m)}</span>
          </div>
          <GapChart call={call} />
        </div>
      )}

      <span className="self-start rounded-full border border-dashed border-line-2 px-2.5 py-1 text-xs font-medium text-ink-2">
        {statusText(call, m)}
      </span>
    </li>
  )
}

function DayTracker({ done, total }: { done: number; total: number }) {
  const { m } = useI18n()
  return (
    <div className="flex gap-1" role="img" aria-label={m.openCalls.trackerAria(done, total)}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < done ? 'bg-ink-2' : 'bg-chip'}`} />
      ))}
    </div>
  )
}

/** The gap to the index after each session, on a fixed 5-day axis so it visibly fills in. */
function GapChart({ call }: { call: OpenCall }) {
  const { m } = useI18n()
  const w = 96, h = 40, pad = 4
  const values = [0, ...call.path.map((p) => p.excess_return)]
  const extent = Math.max(0.01, ...values.map(Math.abs))
  const x = (i: number) => pad + (i / call.horizon) * (w - 2 * pad)
  const y = (v: number) => h / 2 - (v / extent) * (h / 2 - pad)
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const last = values.length - 1
  const summary = call.path.map((p, i) => m.openCalls.gapDay(i + 1, signedPct(p.excess_return, 1))).join(', ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" role="img"
      aria-label={m.openCalls.gapAria(summary)}>
      <line x1={pad} x2={w - pad} y1={h / 2} y2={h / 2} stroke="var(--line-2)" strokeDasharray="2 3" />
      <polyline points={points} fill="none" stroke="var(--ink-2)" strokeWidth={1.75} strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(values[last])} r={2.75} fill="var(--ink)" />
    </svg>
  )
}

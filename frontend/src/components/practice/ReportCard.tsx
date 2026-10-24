import { useI18n } from '../../i18n'
import { money, signedPct } from '../../lib/format'
import type { Market, Result } from '../../lib/sim/engine'
import { buildReport, type LessonId, type Note, type Prompt } from '../../lib/sim/report'
import { Disclosure } from '../Disclosure'
import { Card } from '../States'

const pct = (x: number) => `${Math.abs(x * 100).toFixed(1)}%`

type Props = {
  market: Market
  result: Result
  fund: Result
  prompts: Prompt[]
  /** "12 Mar 2020", or "Day 47 of 312" in a mystery game. */
  when: (day: number) => string
  revealed: string | null
  isMystery: boolean
  onReplay: () => void
  onNew: () => void
  onMystery: () => void
}

/** The end of a game (decision D-040): you against the index fund, then what your choices tell you. */
export function ReportCard({ market, result, fund, prompts, when, revealed, isMystery, onReplay, onNew, onMystery }: Props) {
  const { m } = useI18n()
  const r = m.report
  const report = buildReport(market, result, fund, prompts)
  const { you, fund: index } = report
  const gap = you.value - index.value
  const moved = (x: number | null) => (x == null ? null : x >= 0 ? r.up(pct(x)) : r.down(pct(x)))

  const text = (n: Note): string => {
    switch (n.kind) {
      case 'decision': return r.decision(when(n.prompt.day), r.kind[n.prompt.kind], pct(n.prompt.change), r.choice[n.prompt.choice], moved(n.fundAfter))
      case 'fallSale': return r.fallSale(when(n.day), n.symbol, pct(n.marketFall), moved(n.fundAfter))
      case 'costs': return r.costs(money(n.charges), n.trades, n.shareOfGain == null ? null : pct(n.shareOfGain))
      case 'cash': return r.cash(pct(n.share))
      case 'concentration': return r.concentration(n.symbol, pct(n.share))
      case 'stockPicking': return r.stockPicking
      case 'sip': return r.sip(n.instalments)
      case 'result': return Math.abs(n.gap) < 1 ? r.level : n.gap > 0 ? r.beat(money(n.gap)) : r.behind(money(-n.gap))
    }
  }

  const stats: [string, string, string][] = [
    [r.returns, signedPct(you.returnPct, 1), signedPct(index.returnPct, 1)],
    [r.worstFall, signedPct(you.worstFall, 1), signedPct(index.worstFall, 1)],
    [r.trades, String(you.trades), String(index.trades)],
    [r.charges, money(you.chargesPaid), money(index.chargesPaid)],
  ]

  return (
    <Card className="flex flex-col gap-5 border-ink p-5 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-serif text-[28px] leading-tight font-semibold">{r.title}</h2>
        {revealed && <p className="m-0 text-[13px] text-ink-2">{revealed}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[[r.you, you.value], [r.fund, index.value]].map(([label, value]) => (
          <div key={label as string} className="flex flex-col gap-0.5 rounded-xl bg-page p-3.5">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">{label as string}</span>
            <span className="font-serif text-[28px] leading-none font-semibold tabular-nums">{money(value as number)}</span>
          </div>
        ))}
      </div>
      <p className="m-0 text-base font-medium text-ink">{Math.abs(gap) < 1 ? r.level : gap > 0 ? r.beat(money(gap)) : r.behind(money(-gap))}</p>

      <table className="w-full max-w-xl border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs tracking-wide text-muted uppercase">
            <th className="py-1.5 font-semibold" />
            <th className="py-1.5 text-right font-semibold">{r.you}</th>
            <th className="py-1.5 text-right font-semibold">{r.fund}</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(([label, a, b]) => (
            <tr key={label} className="border-t border-chip">
              <td className="py-2 text-ink-2">{label}</td>
              <td className="py-2 text-right font-medium text-ink tabular-nums">{a}</td>
              <td className="py-2 text-right text-ink-2 tabular-nums">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="flex flex-col gap-2">
        <h3 className="m-0 text-[15px] font-semibold">{r.notesTitle}</h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {report.notes.filter((n) => n.kind !== 'result').map((n, i) => (
            <li key={i} className="rounded-xl bg-page px-3.5 py-2.5 text-sm leading-relaxed text-ink-2">{text(n)}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="m-0 text-[15px] font-semibold">{r.lessonsTitle}</h3>
        <div className="flex flex-col gap-2">
          {report.lessons.map((id) => <Lesson key={id} id={id} />)}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onReplay} className="h-10 cursor-pointer rounded-full bg-brand px-4 text-sm font-semibold text-on-brand">{m.practice.end.again}</button>
        {!isMystery && <button type="button" onClick={onMystery} className="h-10 cursor-pointer rounded-full border border-line-2 bg-surface px-4 text-sm font-medium text-ink">{r.tryMystery}</button>}
        <button type="button" onClick={onNew} className="h-10 cursor-pointer rounded-full border border-line-2 bg-surface px-4 text-sm font-medium text-ink">{m.practice.newGame}</button>
      </div>
    </Card>
  )
}

function Lesson({ id }: { id: LessonId }) {
  const { m } = useI18n()
  const l = m.lessons[id]
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <Disclosure buttonClassName="min-h-12 px-3.5 py-2.5" summary={<span className="text-sm font-semibold text-ink">{l.title}</span>}>
        <p className="m-0 px-3.5 pb-3.5 text-sm leading-relaxed text-ink-2">{l.body}</p>
      </Disclosure>
    </div>
  )
}

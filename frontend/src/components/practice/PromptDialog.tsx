import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n'
import type { Choice, Prompt } from '../../lib/sim/report'

const pct = (x: number) => `${Math.abs(x * 100).toFixed(1)}%`

/**
 * The game stops and asks (decision D-040). Three equal choices, no hint which is "right", and
 * nothing the player couldn't have known that day: what happened next only appears in the report.
 */
export function PromptDialog({ prompt, when, onChoose }: { prompt: Prompt; when: string; onChoose: (c: Choice) => void }) {
  const { m } = useI18n()
  const p = m.practice.prompt
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => first.current?.focus(), [])
  const headline = prompt.kind === 'fall' ? p.fall(pct(prompt.change)) : prompt.kind === 'rise' ? p.rise(pct(prompt.change)) : p.drawdown(pct(prompt.change))
  const mood = prompt.kind === 'fall' ? p.fallMood : prompt.kind === 'rise' ? p.riseMood : p.drawdownMood
  const choices: { id: Choice; label: string; note: string }[] = [
    { id: 'hold', label: p.hold, note: p.holdNote },
    prompt.kind === 'rise' ? { id: 'sell', label: p.sellRise, note: p.sellRiseNote } : { id: 'sell', label: p.sellFall, note: p.sellFallNote },
    { id: 'buy', label: p.buy, note: p.buyNote },
  ]
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 lg:items-center">
      <div role="alertdialog" aria-modal="true" aria-labelledby="prompt-title" aria-describedby="prompt-mood"
        className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-lg">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">{when}</span>
        <h2 id="prompt-title" className="m-0 font-serif text-2xl leading-snug font-semibold">{headline}</h2>
        <p id="prompt-mood" className="m-0 text-[15px] leading-relaxed text-ink-2">{mood}</p>
        <p className="m-0 text-sm font-semibold text-ink">{p.ask}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {choices.map((c, i) => (
            <button key={c.id} ref={i === 0 ? first : undefined} type="button" onClick={() => onChoose(c.id)}
              className="lift flex cursor-pointer flex-col gap-1 rounded-xl border border-line-2 bg-surface p-3 text-left">
              <span className="text-[15px] font-semibold text-ink">{c.label}</span>
              <span className="text-xs leading-snug text-muted">{c.note}</span>
            </button>
          ))}
        </div>
        <p className="m-0 text-xs text-muted">{p.hidden}</p>
      </div>
    </div>
  )
}

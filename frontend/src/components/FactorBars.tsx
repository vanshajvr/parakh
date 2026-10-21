import type { Signal } from '../api/client'
import { capitalize } from '../lib/format'

/** Diverging bars: left pushes the call towards lagging the index, right towards beating it. */
export function FactorBars({ factors }: { factors: Signal['factors'] }) {
  const max = Math.max(...factors.map((f) => Math.abs(f.contribution)), 1e-9)
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex justify-between text-[11px] font-semibold tracking-wide text-muted uppercase" aria-hidden="true">
        <span>← Towards lagging</span>
        <span>Towards beating →</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
        {factors.map((f) => {
          const width = `${Math.round((Math.abs(f.contribution) / max) * 100)}%`
          const beats = f.contribution > 0
          return (
            <li key={f.feature} className="flex flex-col gap-1.5">
              <span className="text-sm leading-snug text-ink">
                {capitalize(f.text)}
                <span className="sr-only">, pushes {f.pushes}</span>
              </span>
              <div className="grid h-2.5 grid-cols-2 overflow-hidden rounded-full bg-chip" aria-hidden="true">
                <div className="flex justify-end border-r border-line-2">
                  {!beats && <div className="h-full rounded-l-full bg-bear-mark" style={{ width }} />}
                </div>
                <div className="flex">
                  {beats && <div className="h-full rounded-r-full bg-bull" style={{ width }} />}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

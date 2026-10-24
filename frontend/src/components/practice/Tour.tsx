import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useI18n } from '../../i18n'
import { Pause, Play } from '../Icons'

/**
 * How to play, shown rather than told (decision D-041). Small pictures built from the game's own
 * pieces, a spotlight on the real part of the screen, and one short line per step.
 */

export type Art = 'money' | 'market' | 'play' | 'prompt' | 'report'

const box = 'flex h-24 w-full items-center justify-center rounded-xl bg-page p-3'

/** A miniature of each part of the game, drawn with the same colours and shapes as the real thing. */
export function Picture({ art }: { art: Art }) {
  const { m } = useI18n()
  if (art === 'money') {
    return (
      <div className={box} aria-hidden="true">
        <svg viewBox="0 0 160 60" className="h-full w-full">
          <path d="M4 40 L30 34 L52 44 L74 26 L96 30 L120 14 L156 8" fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M4 40 L30 38 L52 46 L74 36 L96 38 L120 28 L156 24" fill="none" stroke="var(--muted)" strokeWidth={2} strokeDasharray="5 4" />
          <circle cx="156" cy="8" r="3.5" fill="var(--ink)" />
        </svg>
      </div>
    )
  }
  if (art === 'market') {
    return (
      <div className={`${box} flex-col gap-1.5`} aria-hidden="true">
        {['NIFTYBEES', 'TCS'].map((s, i) => (
          <span key={s} className="flex w-full max-w-56 items-center justify-between rounded-lg bg-surface px-2.5 py-1.5 text-[11px]">
            <span className="font-semibold text-ink">{s}</span>
            <span className={`rounded-full border px-2.5 py-0.5 font-semibold ${i === 0 ? 'border-ink text-ink' : 'border-line-2 text-ink-2'}`}>{m.practice.buy}</span>
          </span>
        ))}
      </div>
    )
  }
  if (art === 'play') {
    return (
      <div className={`${box} gap-2`} aria-hidden="true">
        <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-on-brand"><Play size={15} />{m.practice.play}</span>
        <span className="inline-flex h-10 items-center rounded-full border border-line-2 px-3 text-xs font-medium text-ink">{m.practice.month}</span>
        <span className="text-muted"><Pause size={16} /></span>
      </div>
    )
  }
  if (art === 'prompt') {
    return (
      <div className={`${box} flex-col gap-2`} aria-hidden="true">
        <span className="font-serif text-lg font-semibold text-ink">NIFTY 50 ▼ 11%</span>
        <span className="flex gap-1.5">
          {[m.practice.prompt.hold, m.practice.prompt.sellFall, m.practice.prompt.buy].map((c) => (
            <span key={c} className="rounded-lg border border-line-2 bg-surface px-2 py-1 text-[11px] font-medium text-ink">{c}</span>
          ))}
        </span>
      </div>
    )
  }
  return (
    <div className={`${box} items-end gap-6`} aria-hidden="true">
      {[[m.practice.legendYou, 70, 'bg-ink'], [m.practice.indexFundTag, 54, 'bg-muted']].map(([label, h, colour]) => (
        <span key={label as string} className="flex flex-col items-center gap-1">
          <span className={`w-10 rounded-t-md ${colour}`} style={{ height: h as number }} />
          <span className="text-[11px] font-medium text-ink-2">{label as string}</span>
        </span>
      ))}
    </div>
  )
}

/** The three-step picture strip on the setup screen. */
export function HowItWorks() {
  const { m } = useI18n()
  const steps: [Art, string][] = [['market', m.practice.how.pick], ['play', m.practice.how.play], ['report', m.practice.how.beat]]
  return (
    <section aria-labelledby="how" className="flex flex-col gap-3">
      <h2 id="how" className="m-0 px-1 text-base font-semibold">{m.practice.how.title}</h2>
      <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
        {steps.map(([art, text], i) => (
          <li key={art} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3">
            <Picture art={art} />
            <span className="flex items-start gap-2 px-1 pb-1">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-on-brand">{i + 1}</span>
              <span className="text-sm leading-snug font-medium text-ink">{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export type TourStep = { target?: string; art: Art; title: string; body: string }

const GAP = 10
const BUBBLE_W = 340, BUBBLE_H = 280, EDGE = 16

/**
 * Where the bubble goes: below the spotlight if it fits, else above, else beside it, else pinned
 * to the bottom of the screen. It never ends up off screen.
 */
function place(r: DOMRect): CSSProperties {
  const w = window.innerWidth, h = window.innerHeight
  const left = Math.min(Math.max(EDGE, r.left), w - EDGE - BUBBLE_W)
  if (h - r.bottom >= BUBBLE_H + GAP) return { left, top: r.bottom + GAP + 6 }
  if (r.top >= BUBBLE_H + GAP) return { left, bottom: h - r.top + GAP + 6 }
  const top = Math.min(Math.max(EDGE, r.top), h - EDGE - BUBBLE_H)
  if (r.left >= BUBBLE_W + 2 * GAP) return { left: r.left - BUBBLE_W - 2 * GAP, top }
  if (w - r.right >= BUBBLE_W + 2 * GAP) return { left: r.right + 2 * GAP, top }
  return { left: EDGE, right: EDGE, bottom: EDGE, width: 'auto' }
}

/** A guided tour over the real screen: everything dims except the part being explained. */
export function Tour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const { m } = useI18n()
  const t = m.practice.tour
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const next = useRef<HTMLButtonElement>(null)
  const step = steps[i]

  useEffect(() => {
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null
    el?.scrollIntoView?.({ block: 'center', behavior: 'auto' })
    let frame = requestAnimationFrame(function measure() {
      setRect(el ? el.getBoundingClientRect() : null)
      frame = requestAnimationFrame(measure) // follows scrolling and resizing while the step is open
    })
    next.current?.focus()
    return () => cancelAnimationFrame(frame)
  }, [step.target])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onDone()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onDone])

  const bubbleStyle = rect ? place(rect) : undefined
  const last = i === steps.length - 1

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div className="pointer-events-none fixed rounded-2xl ring-2 ring-link transition-all duration-200"
          style={{ left: rect.left - GAP, top: rect.top - GAP, width: rect.width + 2 * GAP, height: rect.height + 2 * GAP, boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.62)' }} />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}
      <div className={`fixed flex w-[min(340px,calc(100vw-32px))] flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-lg ${rect ? '' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
        style={bubbleStyle}>
        <Picture art={step.art} />
        <div className="flex flex-col gap-1">
          <h2 id="tour-title" className="m-0 text-base font-semibold">{step.title}</h2>
          <p className="m-0 text-sm leading-relaxed text-ink-2">{step.body}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex gap-1" aria-label={t.step(i + 1, steps.length)}>
            {steps.map((_, k) => <span key={k} className={`size-1.5 rounded-full ${k === i ? 'bg-ink' : 'bg-line-2'}`} />)}
          </span>
          <span className="flex gap-1.5">
            {!last && <button type="button" onClick={onDone} className="h-9 cursor-pointer rounded-full px-3 text-[13px] font-medium text-muted hover:bg-chip">{t.skip}</button>}
            {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="h-9 cursor-pointer rounded-full border border-line-2 px-3 text-[13px] font-medium text-ink">{t.back}</button>}
            <button ref={next} type="button" onClick={() => (last ? onDone() : setI(i + 1))}
              className="h-9 cursor-pointer rounded-full bg-brand px-4 text-[13px] font-semibold text-on-brand">
              {last ? t.done : t.next}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../i18n'

/**
 * Grey shapes in the layout of a page while it loads, so it feels like it's arriving rather than
 * blank. After a few seconds it explains the wait: the free API host sleeps when idle.
 */
export function Loading({ what, inline = false }: { what: string; inline?: boolean }) {
  const { m } = useI18n()
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000)
    return () => clearTimeout(timer)
  }, [])
  const block = 'animate-pulse rounded-2xl bg-chip'
  if (inline) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <span className="sr-only">{m.states.loading(what)}</span>
        {[0, 1, 2, 3].map((i) => <div key={i} aria-hidden="true" className={`${block} h-9 rounded-lg`} />)}
      </div>
    )
  }
  return (
    <div role="status" className="flex flex-col gap-4 lg:gap-6">
      <span className="sr-only">{m.states.loading(what)}</span>
      <div aria-hidden="true" className="flex flex-col gap-2 px-1">
        <div className={`${block} h-9 w-56 rounded-lg lg:h-11`} />
        <div className={`${block} h-4 w-72 max-w-full rounded-md`} />
      </div>
      {slow && <p className="m-0 px-1 text-sm text-muted">{m.states.slow}</p>}
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${block} h-24`} />)}
      </div>
      <div aria-hidden="true" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {[0, 1, 2].map((i) => <div key={i} className={`${block} h-36`} />)}
      </div>
    </div>
  )
}

export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  const { m } = useI18n()
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-5">
      <p className="m-0 text-ink">{m.states.loadError(what)}</p>
      <button type="button" onClick={onRetry} className="h-10 cursor-pointer rounded-full border border-line-2 bg-surface px-4 text-sm font-medium text-ink">
        {m.states.tryAgain}
      </button>
    </div>
  )
}

export function NotFoundState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-surface p-5">
      <p className="m-0 text-ink">{message}</p>
      <Link to="/stocks" className="text-sm font-medium no-underline">See the stocks we cover →</Link>
    </div>
  )
}

/** A white card with an optional heading, used across pages. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface transition-colors duration-150 hover:border-line-2 ${className}`}>{children}</section>
}

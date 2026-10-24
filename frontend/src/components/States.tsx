import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../i18n'

/** After a few seconds, explain the wait: the free API host sleeps when idle. */
export function Loading({ what }: { what: string }) {
  const { m } = useI18n()
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div role="status" className="flex flex-col gap-1 px-1">
      <p className="m-0 text-muted">{m.states.loading(what)}</p>
      {slow && <p className="m-0 text-sm text-muted">{m.states.slow}</p>}
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
  return <section className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</section>
}

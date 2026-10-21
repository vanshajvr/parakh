import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function Loading({ what }: { what: string }) {
  return <p role="status" className="m-0 px-1 text-muted">Loading {what}…</p>
}

export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-5">
      <p className="m-0 text-ink">We couldn't load {what}. The connection or our server may be having a moment.</p>
      <button type="button" onClick={onRetry} className="h-10 cursor-pointer rounded-full border border-line-2 bg-surface px-4 text-sm font-medium text-ink">
        Try again
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

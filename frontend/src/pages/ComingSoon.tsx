import { Link } from 'react-router'

/** Placeholder for screens built in later steps of phase 4. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
      <h1 className="m-0 font-serif text-[28px] font-semibold">{title}</h1>
      <p className="m-0 text-sm text-ink-2">This screen is coming next.</p>
      <Link to="/" className="text-sm font-medium no-underline">← Today's calls</Link>
    </section>
  )
}

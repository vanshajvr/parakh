import { Link } from 'react-router'
import type { Today } from '../api/client'
import { useI18n } from '../i18n'
import { suggestions } from '../lib/suggest'

/** A few things worth a look today, built from the day's data so the page changes with the market. */
export function Suggestions({ data }: { data: Today }) {
  const { m } = useI18n()
  const items = suggestions(data, m)
  return (
    <section aria-labelledby="suggest" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface px-2 py-3">
      <h2 id="suggest" className="m-0 px-2 pb-1 text-[15px] font-semibold">{m.suggest.title}</h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((s) => (
          <li key={s.to + s.text}>
            <Link to={s.to} className="group flex items-start gap-2 rounded-xl px-2 py-2 text-sm leading-snug text-ink-2 no-underline hover:bg-page hover:text-ink">
              <span className="min-w-0 flex-1">{s.text}</span>
              <span aria-hidden="true" className="text-muted transition-[translate] duration-150 group-hover:translate-x-0.5">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useI18n, type TermId } from '../i18n'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/** Every market word Parakh uses, searchable, in the reader's language (decision D-034). */
export function Glossary() {
  const { m } = useI18n()
  const { hash } = useLocation()
  const [query, setQuery] = useState('')
  useDocumentTitle(m.glossary.title)

  // A term link (/glossary#sip) opens here scrolled to that term.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  const q = query.trim().toLowerCase()
  const terms = (Object.entries(m.glossary.terms) as [TermId, (typeof m.glossary.terms)[TermId]][])
    .filter(([, t]) => !q || `${t.term} ${t.short}`.toLowerCase().includes(q))
    .sort(([, a], [, b]) => a.term.localeCompare(b.term, m.locale))

  return (
    <div className="stagger flex flex-col gap-4 lg:gap-6">
      <section className="flex flex-col gap-1 px-1">
        <h1 className="m-0 font-serif text-[30px] leading-tight font-semibold tracking-[-0.015em] lg:text-[40px]">{m.glossary.title}</h1>
        <p className="m-0 max-w-2xl text-sm leading-relaxed text-muted">{m.glossary.intro}</p>
      </section>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={m.glossary.search}
        aria-label={m.glossary.search}
        className="h-11 w-full max-w-md rounded-xl border border-line-2 bg-surface px-3.5 text-[15px] text-ink"
      />
      <dl className="m-0 grid gap-3 md:grid-cols-2 lg:gap-4">
        {terms.map(([id, t]) => (
          <div key={id} id={id} className="flex scroll-mt-24 flex-col gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors duration-150 hover:border-line-2 target:border-brand">
            <dt className="text-[15px] font-semibold text-ink">{t.term}</dt>
            <dd className="m-0 text-sm leading-relaxed text-ink-2">{t.short}</dd>
            <dd className="m-0 text-[13px] leading-relaxed text-muted"><span className="font-semibold">{m.glossary.example}:</span> {t.example}</dd>
          </div>
        ))}
      </dl>
      {terms.length === 0 && <p className="m-0 px-1 text-sm text-muted">{m.glossary.noMatch}</p>}
    </div>
  )
}

import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useI18n, type TermId } from '../i18n'

/**
 * A market word with its meaning one tap away (decision D-034). It uses the browser's popover, so
 * it closes on Escape or a tap outside. Everything is a span, so it can sit inside a sentence.
 */
export function Term({ id, children }: { id: TermId; children?: ReactNode }) {
  const { m } = useI18n()
  const term = m.glossary.terms[id]
  const pop = useId()
  return (
    <>
      <button
        type="button"
        popoverTarget={pop}
        className="cursor-help border-0 bg-transparent p-0 text-left [font:inherit] text-inherit underline decoration-muted decoration-dotted underline-offset-[3px]"
      >
        {children ?? term.term}
      </button>
      <span
        id={pop}
        popover="auto"
        className="fixed inset-x-4 top-auto bottom-4 m-auto max-w-md flex-col gap-2 rounded-2xl border border-line bg-surface p-4 text-left text-sm leading-relaxed font-normal text-ink normal-case tracking-normal shadow-lg backdrop:bg-black/25 open:flex lg:bottom-auto lg:top-1/3"
      >
        <span className="text-base font-semibold">{term.term}</span>
        <span className="text-ink-2">{term.short}</span>
        <span className="text-[13px] text-muted"><span className="font-semibold">{m.glossary.example}:</span> {term.example}</span>
        <span className="flex items-center justify-between gap-3 pt-1">
          <Link to={`/glossary#${id}`} className="text-[13px] font-medium no-underline">{m.glossary.allTerms}</Link>
          <button type="button" popoverTarget={pop} popoverTargetAction="hide"
            className="h-9 cursor-pointer rounded-full border border-line-2 bg-surface px-3.5 text-[13px] font-medium text-ink">
            {m.glossary.close}
          </button>
        </span>
      </span>
    </>
  )
}

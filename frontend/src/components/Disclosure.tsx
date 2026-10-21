import { useId, useState, type ReactNode } from 'react'
import { Chevron } from './Icons'

type Props = {
  /** Always visible; the whole header is the toggle button. */
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  buttonClassName?: string
}

/** A section that shows a summary and reveals its details on tap (decision D-018). */
export function Disclosure({ summary, children, defaultOpen = false, className = '', buttonClassName = '' }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className={`flex w-full cursor-pointer items-center gap-3 text-left ${buttonClassName}`}
      >
        <span className="min-w-0 flex-1">{summary}</span>
        <Chevron size={20} className={`shrink-0 text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </div>
  )
}

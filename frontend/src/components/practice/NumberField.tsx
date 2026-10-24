import type { Ref } from 'react'

type Props = {
  value: number | null
  onChange: (value: number | null) => void
  /** Shown inside the field, e.g. "₹". */
  prefix?: string
  label: string
  inputRef?: Ref<HTMLInputElement>
  className?: string
}

/**
 * A whole-number field that shows Indian grouping (₹1,00,000) as you type. Unlike a number input
 * it can be empty, so clearing it doesn't leave a 0 behind to type after.
 */
export function NumberField({ value, onChange, prefix, label, inputRef, className = '' }: Props) {
  return (
    <span className={`flex h-11 items-center gap-1.5 rounded-xl border border-line-2 bg-surface px-3 focus-within:border-link ${className}`}>
      {prefix && <span aria-hidden="true" className="text-[15px] text-muted">{prefix}</span>}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        value={value == null ? '' : value.toLocaleString('en-IN')}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
          onChange(digits ? Number(digits) : null)
        }}
        className="h-full w-full min-w-0 border-0 bg-transparent text-[15px] text-ink tabular-nums outline-none"
      />
    </span>
  )
}

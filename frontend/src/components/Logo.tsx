/** A touchstone with a gold streak: what "parakh" literally is. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
        <rect x="1" y="1" width="26" height="26" rx="7" className="fill-brand" />
        <path d="M8 19.5L20 8.5" stroke="#D4A72C" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="font-serif text-[21px] font-semibold tracking-[-0.01em] text-ink">Parakh</span>
    </span>
  )
}

const MINUS = '−'

/** 0.5135 -> "51.4%" */
export function pct(x: number | null | undefined, digits = 1): string {
  return x == null ? '—' : `${(x * 100).toFixed(digits)}%`
}

/** -0.0046 -> "−0.46%", 0.0096 -> "+0.96%" */
export function signedPct(x: number | null | undefined, digits = 2): string {
  if (x == null) return '—'
  const s = Math.abs(x * 100).toFixed(digits)
  return `${x < 0 ? MINUS : '+'}${s}%`
}

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

/** 4424.2 -> "₹4,424.20" */
export function price(x: number | null | undefined): string {
  return x == null ? '—' : rupees.format(x)
}

export function count(n: number): string {
  return n.toLocaleString('en-IN')
}

/** "2026-10-19" -> "Monday's close, 19 Oct" (dates are trading days, so no time zone shift). */
export function closeLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' })
  const day = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${weekday}'s close, ${day}`
}

/** "2026-10-19" -> "19 Oct 2026" */
export function shortDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

/** "2026-10-19" -> "Mon 19 Oct" */
export function dayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })
  return `${weekday} ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

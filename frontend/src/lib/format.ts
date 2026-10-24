import { en, type Messages } from '../i18n/en'

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
export function closeLabel(isoDate: string, m: Messages = en): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  const weekday = d.toLocaleDateString(m.locale, { weekday: 'long', timeZone: 'UTC' })
  const day = d.toLocaleDateString(m.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return m.format.closeLabel(weekday, day)
}

/** "2026-10-19" -> "19 Oct 2026" */
export function shortDate(isoDate: string, locale = 'en-IN'): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

/** "2026-10-19" -> "Mon 19 Oct" */
export function dayLabel(isoDate: string, locale = 'en-IN'): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  const weekday = d.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
  return `${weekday} ${d.toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
}

/** "3 hours ago", "कल": how long ago, in the reader's language. */
export function ago(iso: string, locale = 'en-IN', now = Date.now()): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  if (Math.abs(minutes) < 1440) return rtf.format(Math.round(minutes / 60), 'hour')
  return rtf.format(Math.round(minutes / 1440), 'day')
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Calls are published at 18:00 IST (12:30 UTC) on weekdays, after that day's close (daily.yml). */
const PUBLISH_UTC_MINUTES = 12 * 60 + 30

/** The next weekday after the latest calls' date, at publishing time. Market holidays aren't known here. */
export function nextPublish(asOf: string): { day: string; at: Date } {
  const d = new Date(`${asOf}T00:00:00Z`)
  do d.setUTCDate(d.getUTCDate() + 1)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6)
  return { day: d.toISOString().slice(0, 10), at: new Date(d.getTime() + PUBLISH_UTC_MINUTES * 60_000) }
}

/** Whole days, hours and minutes until `at`, rounded up to the minute; null once it has passed. */
export function timeUntil(at: Date, now: Date): { days: number; hours: number; minutes: number } | null {
  const left = Math.ceil((at.getTime() - now.getTime()) / 60_000)
  if (left <= 0) return null
  return { days: Math.floor(left / 1440), hours: Math.floor((left % 1440) / 60), minutes: left % 60 }
}

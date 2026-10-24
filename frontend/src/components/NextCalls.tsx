import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { nextPublish, timeUntil } from '../lib/schedule'

/** "Next calls after Monday's close · in 2d 3h". Honest about time: it ticks, the prices don't. */
export function NextCalls({ asOf }: { asOf: string }) {
  const { m } = useI18n()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])
  const next = nextPublish(asOf)
  const left = timeUntil(next.at, now)
  const weekday = new Date(`${next.day}T12:00:00Z`).toLocaleDateString(m.locale, { weekday: 'long', timeZone: 'UTC' })
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-link" />
      {left ? m.next.in(weekday, m.next.duration(left.days, left.hours, left.minutes)) : m.next.due}
    </span>
  )
}

import { describe, expect, it } from 'vitest'
import { nextPublish, timeUntil } from './schedule'

describe('nextPublish', () => {
  it('is the next weekday at 18:00 IST', () => {
    expect(nextPublish('2026-10-21')).toEqual({ day: '2026-10-22', at: new Date('2026-10-22T12:30:00Z') })
    // Friday's calls are followed by Monday's.
    expect(nextPublish('2026-10-23').day).toBe('2026-10-26')
  })
})

describe('timeUntil', () => {
  it('counts down in days, hours and minutes, then stops', () => {
    const at = new Date('2026-10-26T12:30:00Z')
    expect(timeUntil(at, new Date('2026-10-24T09:20:00Z'))).toEqual({ days: 2, hours: 3, minutes: 10 })
    expect(timeUntil(at, new Date('2026-10-26T12:29:30Z'))).toEqual({ days: 0, hours: 0, minutes: 1 })
    expect(timeUntil(at, new Date('2026-10-26T12:31:00Z'))).toBeNull()
  })
})

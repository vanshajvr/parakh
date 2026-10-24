import { describe, expect, it } from 'vitest'
import { affordable, charges } from './charges'

describe('charges', () => {
  it('match a zero-brokerage delivery trade on ₹1 lakh of shares', () => {
    expect(charges('buy', 100_000)).toEqual({ stt: 100, exchange: 2.97, sebi: 0.1, stamp: 15, gst: 0.55, dp: 0, total: 118.62 })
    expect(charges('sell', 100_000)).toEqual({ stt: 100, exchange: 2.97, sebi: 0.1, stamp: 0, gst: 0.55, dp: 15.93, total: 119.55 })
    // A round trip costs about 0.24%: the "about 0.25%" the track record compares the edge with.
    expect((charges('buy', 100_000).total + charges('sell', 100_000).total) / 100_000).toBeCloseTo(0.0024, 4)
  })

  it('charge ETFs far less STT', () => {
    expect(charges('buy', 100_000, true).stt).toBe(0)
    expect(charges('sell', 100_000, true).stt).toBe(1)
  })

  it('buy only whole shares that fit the budget with charges', () => {
    expect(affordable(10_000, 2_530)).toBe(3)
    expect(affordable(2_000, 2_530)).toBe(0)
    const two = 2 * 1_000 + charges('buy', 2_000).total
    expect(affordable(two, 1_000)).toBe(2)
    expect(affordable(two - 0.01, 1_000)).toBe(1)
    expect(affordable(100_000, 257.22, true)).toBe(388)
  })
})

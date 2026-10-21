import { describe, expect, it } from 'vitest'
import { closeLabel, pct, price, signedPct } from './format'

describe('format', () => {
  it('formats percentages and keeps missing values visible', () => {
    expect(pct(0.51349)).toBe('51.3%')
    expect(pct(null)).toBe('—')
    expect(signedPct(-0.00463)).toBe('−0.46%')
    expect(signedPct(0.0096)).toBe('+0.96%')
  })

  it('formats rupees the Indian way', () => {
    expect(price(10650)).toBe('₹10,650.00')
    expect(price(1234567.5)).toBe('₹12,34,567.50')
  })

  it('labels a trading day without shifting it across time zones', () => {
    expect(closeLabel('2026-10-19')).toBe("Monday's close, 19 Oct")
  })
})

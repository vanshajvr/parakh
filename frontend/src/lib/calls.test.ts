import { describe, expect, it } from 'vitest'
import type { Signal } from '../api/client'
import today from '../fixtures/today.json'
import { chance, drivers, looksLikeReversal, receiptLong, receiptShort } from './calls'

const signals = today.signals as Signal[]
const bySymbol = (s: string) => signals.find((x) => x.symbol === s)!

describe('call helpers', () => {
  it('lists only factors that push in the direction of the lean', () => {
    const titan = bySymbol('TITAN')
    expect(titan.lean).toBe('bearish')
    expect(drivers(titan)).toEqual([
      'Its short-term trend is below its longer-term trend',
      'Its daily price swings are around 2.0%',
    ])
  })

  it('states the chance in the direction of the lean', () => {
    expect(chance(bySymbol('TITAN'))).toBe('51.5% chance it lags the index')
    expect(chance(bySymbol('ULTRACEMCO'))).toBe('51.4% chance it beats the index')
  })

  it('flags a bullish call driven by a falling trend as a likely reversal bet', () => {
    expect(looksLikeReversal(bySymbol('ULTRACEMCO'))).toBe(true)
    expect(looksLikeReversal(bySymbol('TITAN'))).toBe(false)
  })

  it('always has a receipt, and says when a stock is below a coin flip', () => {
    const titan = bySymbol('TITAN')
    expect(receiptShort(titan)).toBe('51.3% right in testing')
    expect(receiptLong(titan)).toContain('On Titan Company specifically: 47.1% over 342 calls.')
    expect(receiptLong(titan)).toContain('may be chance')
    expect(receiptLong(bySymbol('ULTRACEMCO'))).not.toContain('may be chance')
  })
})

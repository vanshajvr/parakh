import { describe, expect, it } from 'vitest'
import type { Signal } from '../api/client'
import fixture from '../fixtures/today.json'
import { en } from '../i18n/en'
import { hi } from '../i18n/hi'
import { receiptLong, receiptShort } from './calls'

const call = (fixture.signals as Signal[]).find((s) => s.lean !== 'no_call')!
const withYears = { ...call, receipt: { ...call.receipt, band_hit_rate: 0.514, band_n_calls: 9919, tested_from: 2019, tested_to: 2026,
  holdout_hit_rate: 0.488, holdout_n_calls: 2181, holdout_from: 2025, holdout_to: 2026 } } as Signal

describe('receipts', () => {
  it('say which years "in testing" covers', () => {
    expect(receiptShort(withYears)).toBe('51.4% right in testing, 2019–26')
  })

  it('give the unseen holdout on its own when expanded', () => {
    expect(receiptLong(withYears)).toContain('Calls were right 51.4% of the time across 9,919 testing calls (2019–26).')
    expect(receiptLong(withYears)).toContain('On 2025–26 alone, kept unseen until the final test: 48.8% across 2,181 calls.')
  })

  it('show one label, even for calls stored with the dropped "Stronger edge"', () => {
    expect(en.confidence('Stronger edge')).toBe('Slight edge')
    expect(hi.confidence('Stronger edge')).toBe(hi.confidence('Slight edge'))
    expect(en.confidence('No edge')).toBe('No edge')
  })
})

import { describe, expect, it } from 'vitest'
import type { Today } from '../api/client'
import fixture from '../fixtures/today.json'
import { hi } from '../i18n/hi'
import { suggestions } from './suggest'

const data = fixture as Today

describe('suggestions', () => {
  it('points at the clearest call first and always ends with the glossary', () => {
    const items = suggestions(data)
    const clearest = data.signals.filter((s) => s.lean !== 'no_call')
      .sort((a, b) => Math.abs(b.p_outperform - 0.5) - Math.abs(a.p_outperform - 0.5))[0]
    expect(items[0].to).toBe(`/stocks/${clearest.symbol}`)
    expect(items.at(-1)).toEqual({ text: expect.stringMatching(/glossary/), to: '/glossary' })
    expect(items.length).toBeLessThanOrEqual(4)
    expect(new Set(items.map((s) => s.to)).size).toBe(items.length)
  })

  it('names the stock that came closest to a call', () => {
    const signals = data.signals.map((s, i) => (s.lean === 'no_call' ? { ...s, no_call: { move: 0.01 * (i % 4), calls_from: 0.04 } } : s))
    const items = suggestions({ ...data, signals }, hi)
    expect(items.some((s) => /call बनने के सबसे करीब/.test(s.text))).toBe(true)
  })
})

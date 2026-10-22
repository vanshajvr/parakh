import { describe, expect, it } from 'vitest'
import fixture from '../fixtures/screener.json'
import type { Screener } from '../api/client'
import { rank, viewById } from './screener'

const rows = (fixture as Screener).stocks

describe('screener views', () => {
  it('lists only stocks that rose as top gainers, and fell as top losers', () => {
    const gainers = rank(rows, viewById('gainers'), '1D', null, 50)
    const losers = rank(rows, viewById('losers'), '1D', null, 50)
    expect(gainers.every((r) => r.change_1d! > 0)).toBe(true)
    expect(losers.every((r) => r.change_1d! < 0)).toBe(true)
    expect(gainers[0].change_1d).toBeGreaterThanOrEqual(gainers[gainers.length - 1].change_1d!)
    // The screener still sorts every stock.
    expect(rank(rows, viewById('gainers'), '1D', null)).toHaveLength(50)
  })

  it("keeps the rule's own view to Parakh's 20", () => {
    const view = rank(rows, viewById('rule'), '1D', null)
    expect(view).toHaveLength(20)
    expect(view.every((r) => r.covered)).toBe(true)
  })
})

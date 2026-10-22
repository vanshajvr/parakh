import { describe, expect, it } from 'vitest'
import type { StockDetail } from '../api/client'
import titan from '../fixtures/stock-titan.json'
import { candleReading, markers, movingAverage } from './chart'

const data = titan as StockDetail

describe('chart helpers', () => {
  it('marks simulated calls as right or wrong from the outcome', () => {
    const m = markers(data)
    const simulated = m.filter((x) => !x.live)
    expect(simulated).toHaveLength(55)
    expect(simulated.filter((x) => x.hit).length).toBe(19) // Titan: 19 of 55 right in the past year
    // The fixture's live call from 19 Oct is drawn too, still unscored.
    expect(m.filter((x) => x.live)).toEqual([{ date: '2026-10-19', lean: 'bearish', hit: null, live: true }])
  })

  it('lets a live call replace the simulated one on the same day', () => {
    const day = data.simulated_calls[0]
    const withLive = {
      ...data,
      live_calls: [{ ...data.live_calls[0], as_of: day.date, lean: 'bearish', hit: null }],
    } as StockDetail
    const m = markers(withLive).filter((x) => x.date === day.date)
    expect(m).toEqual([{ date: day.date, lean: 'bearish', hit: null, live: true }])
  })
})

describe('candleReading', () => {
  const fmt = (v: number) => v.toFixed(0)
  it('reads an up candle and its move from the day before', () => {
    const text = candleReading({ date: '2026-10-19', open: 100, high: 106, low: 99, close: 105 }, 100, fmt)
    expect(text).toContain('between 99 and 106')
    expect(text).toContain('closed above where it opened (100 → 105), so the candle is green')
    expect(text).toContain('up 5.0% from the day before')
  })

  it('explains a red candle on a day the price still rose', () => {
    const text = candleReading({ date: '2026-10-19', open: 110, high: 111, low: 103, close: 104 }, 100, fmt)
    expect(text).toContain('so the candle is red')
    expect(text).toContain('up 4.0% from the day before')
  })
})

describe('movingAverage', () => {
  it('averages the trailing window and leaves the warm-up empty', () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })
})

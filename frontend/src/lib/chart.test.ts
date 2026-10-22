import { describe, expect, it } from 'vitest'
import type { StockDetail } from '../api/client'
import titan from '../fixtures/stock-titan.json'
import { candleReading, hasCandles, inRange, markers, nearestIndex, niceTicks } from './chart'

const data = titan as StockDetail

describe('chart helpers', () => {
  it('keeps only prices within the selected range', () => {
    const month = inRange(data.prices, '1M')
    expect(month.length).toBeGreaterThan(15)
    expect(month.length).toBeLessThan(25)
    expect(month.at(-1)).toEqual(data.prices.at(-1))
    expect(inRange(data.prices, '1Y')).toHaveLength(data.prices.length)
  })

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

  it('picks round price levels', () => {
    expect(niceTicks(3650, 5250)).toEqual([4000, 4500, 5000])
    expect(nearestIndex(10, 0.52)).toBe(5)
    expect(nearestIndex(10, -1)).toBe(0)
  })
})

describe('candleReading', () => {
  const fmt = (v: number) => v.toFixed(0)
  it('reads an up candle and its move from the day before', () => {
    const text = candleReading({ date: '2026-10-19', open: 100, high: 106, low: 99, close: 105 }, 100, fmt)
    expect(text).toContain('between 99 and 106')
    expect(text).toContain('closed above where it opened (100 → 105), so the candle is hollow')
    expect(text).toContain('up 5.0% from the day before')
  })

  it('explains a filled candle on a day the price still rose', () => {
    const text = candleReading({ date: '2026-10-19', open: 110, high: 111, low: 103, close: 104 }, 100, fmt)
    expect(text).toContain('so the candle is filled')
    expect(text).toContain('up 4.0% from the day before')
  })

  it('only treats series with open, high and low as candles', () => {
    expect(hasCandles([{ date: '2026-10-19', close: 1 }])).toBe(false)
    expect(hasCandles([{ date: '2026-10-19', open: 1, high: 1, low: 1, close: 1 }])).toBe(true)
  })
})

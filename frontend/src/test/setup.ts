import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)

// jsdom has no matchMedia; tests render the phone layout.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as MediaQueryList

// jsdom has no canvas, so lightweight-charts gets a stand-in; the chart's React parts still render.
vi.mock('lightweight-charts', () => {
  const series = () => ({ setData: vi.fn(), applyOptions: vi.fn() })
  return {
    ColorType: { Solid: 'solid' },
    CrosshairMode: { Normal: 0 },
    CandlestickSeries: 'Candlestick',
    LineSeries: 'Line',
    createSeriesMarkers: vi.fn(() => ({ detach: vi.fn(), setMarkers: vi.fn() })),
    createChart: vi.fn(() => ({
      addSeries: vi.fn(series),
      subscribeCrosshairMove: vi.fn(),
      applyOptions: vi.fn(),
      timeScale: () => ({ fitContent: vi.fn(), setVisibleRange: vi.fn() }),
      remove: vi.fn(),
    })),
  }
})

// Node's own experimental localStorage can shadow jsdom's with a non-working one; use a plain in-memory store.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
})

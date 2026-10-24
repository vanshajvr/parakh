import {
  CandlestickSeries, ColorType, CrosshairMode, LineSeries, createChart, createSeriesMarkers,
  type IChartApi, type ISeriesApi, type ISeriesMarkersPluginApi, type SeriesMarker, type Time,
} from 'lightweight-charts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useHistory } from '../api/client'
import { candleReading, movingAverage, RANGE_DAYS, type Candle, type Marker } from '../lib/chart'
import { useI18n } from '../i18n'
import { price, shortDate, signedPct } from '../lib/format'
import { DOWN, UP } from './ChartKey'

const MA_DAYS = 20

type Range = keyof typeof RANGE_DAYS | '5Y' | 'All'
const RANGES: Range[] = ['1M', '3M', '6M', '1Y', '5Y', 'All']
type Layer = 'candles' | 'close' | 'average' | 'calls'

type Props = {
  /** A stock symbol, or 'NIFTY50' for the index. */
  symbol: string
  name: string
  markers?: Marker[]
  height?: number
  defaultRange?: Range
  /** How values are written: rupees for stocks, plain points for the index. */
  format?: (v: number) => string
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function themeOptions() {
  return {
    layout: { background: { type: ColorType.Solid, color: css('--surface') }, textColor: css('--muted') },
    grid: { vertLines: { color: css('--chip') }, horzLines: { color: css('--chip') } },
  }
}

/**
 * Every stored daily candle, zoomable (scroll or pinch), draggable, with a crosshair tooltip and
 * a plain-words reading of the hovered day. Past calls are dots in their lean colour, ✓ or ✗ once scored.
 */
export function CandleChart({ symbol, name, markers = [], height = 300, defaultRange = '1Y', format = price }: Props) {
  const { m } = useI18n()
  const { data, isPending, isError } = useHistory(symbol)
  const candles = useMemo<Candle[]>(() => (data ?? []).map((p) => ({ date: p.date, open: p.open, high: p.high, low: p.low, close: p.close })), [data])
  const average = useMemo(() => movingAverage(candles.map((c) => c.close), MA_DAYS), [candles])

  const box = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  const series = useRef<Record<'candles' | 'close' | 'average', ISeriesApi<'Candlestick' | 'Line'> | null>>({ candles: null, close: null, average: null })
  const markerApi = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ candles: true, close: false, average: true, calls: true })
  const [range, setRange] = useState<Range>(defaultRange)
  const [hover, setHover] = useState<{ i: number; x: number; width: number } | null>(null)

  // Build the chart once the history arrives; tear it down on unmount.
  useEffect(() => {
    if (!box.current || candles.length === 0) return
    const c = createChart(box.current, {
      autoSize: true,
      ...themeOptions(),
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.14, bottom: 0.06 } },
      // A low minimum spacing lets "All" fit 10 years of candles even on a phone.
      timeScale: { borderVisible: false, rightOffset: 4, minBarSpacing: 0.05 },
      // Axis labels drop ".00"; the tooltip keeps exact prices.
      localization: { priceFormatter: (v: number) => format(v).replace(/\.00$/, '') },
    })
    const index = new Map(candles.map((k, i) => [k.date, i]))
    series.current.candles = c.addSeries(CandlestickSeries, {
      upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false, priceLineVisible: false,
    })
    series.current.candles.setData(candles.map((k) => ({ time: k.date, open: k.open, high: k.high, low: k.low, close: k.close })))
    series.current.close = c.addSeries(LineSeries, {
      color: css('--ink-2'), lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    })
    series.current.close.setData(candles.map((k) => ({ time: k.date, value: k.close })))
    series.current.average = c.addSeries(LineSeries, {
      color: css('--link'), lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    })
    series.current.average.setData(candles.flatMap((k, i) => (average[i] == null ? [] : [{ time: k.date, value: average[i]! }])))

    c.subscribeCrosshairMove((param) => {
      const i = param.time != null ? index.get(String(param.time)) : undefined
      setHover(i == null || !param.point ? null : { i, x: param.point.x, width: box.current?.clientWidth ?? 0 })
    })

    // Follow the app's light/dark theme.
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const retheme = () => c.applyOptions(themeOptions())
    media.addEventListener('change', retheme)
    chart.current = c
    return () => {
      media.removeEventListener('change', retheme)
      markerApi.current = null
      c.remove()
      chart.current = null
    }
  }, [candles, average, format])

  // Layers on/off, with call markers on whichever price series is showing.
  useEffect(() => {
    if (!chart.current) return
    for (const layer of ['candles', 'close', 'average'] as const) series.current[layer]?.applyOptions({ visible: layers[layer] })
    const host = layers.candles ? series.current.candles : series.current.close
    markerApi.current?.detach()
    markerApi.current = null
    if (host && markers.length && layers.calls) {
      const dates = new Set(candles.map((k) => k.date))
      const list: SeriesMarker<Time>[] = markers.filter((m) => dates.has(m.date)).map((m) => ({
        time: m.date, position: 'aboveBar', shape: 'circle', size: m.live ? 1.2 : 0.5,
        color: m.lean === 'bullish' ? css('--bull') : css('--bear-mark'),
        text: m.hit == null ? '' : m.hit ? '✓' : '✗',
      }))
      markerApi.current = createSeriesMarkers(host, list)
    }
  }, [layers, markers, candles])

  // Zoom to the chosen range (scrolling and pinching zoom freely from there).
  useEffect(() => {
    const c = chart.current
    if (!c || candles.length === 0) return
    if (range === 'All') { c.timeScale().fitContent(); return }
    const days = range === '5Y' ? 5 * 366 : RANGE_DAYS[range]
    const last = candles[candles.length - 1].date
    const from = new Date(new Date(`${last}T12:00:00Z`).getTime() - days * 86_400_000).toISOString().slice(0, 10)
    c.timeScale().setVisibleRange({ from: (from < candles[0].date ? candles[0].date : from) as Time, to: last as Time })
  }, [range, candles])

  if (isPending) return <div style={{ height }} className="animate-pulse rounded-xl bg-chip" aria-label={m.chart.loadingAria(name)} />
  if (isError || candles.length < 2) return <p className="m-0 text-sm text-muted">{m.chart.unavailable}</p>

  const shown = hover?.i ?? candles.length - 1
  const day = candles[shown]
  const prev = shown > 0 ? candles[shown - 1].close : null
  const flip = hover != null && hover.x > hover.width - 190

  const chip = (on: boolean, label: string, onClick: () => void, swatch?: string) => (
    <button key={label} type="button" aria-pressed={on} onClick={onClick}
      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs ${on ? 'border-ink-2 bg-surface font-semibold text-ink' : 'border-line-2 font-medium text-muted'}`}>
      {swatch && <span aria-hidden className="h-0.5 w-3 rounded" style={{ background: swatch }} />}
      {label}
    </button>
  )
  const toggleLayer = (layer: Layer) => setLayers((l) => {
    const next = { ...l, [layer]: !l[layer] }
    return next.candles || next.close ? next : { ...next, close: true } // always keep a price on screen
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label={m.chart.layersAria} className="flex flex-wrap gap-1.5">
          {chip(layers.candles, m.chart.candles, () => toggleLayer('candles'))}
          {chip(layers.close, m.chart.closeLine, () => toggleLayer('close'), css('--ink-2'))}
          {chip(layers.average, m.chart.average(MA_DAYS), () => toggleLayer('average'), css('--link'))}
          {markers.length > 0 && chip(layers.calls, m.chart.pastCalls, () => toggleLayer('calls'))}
        </div>
        <div role="group" aria-label={m.chart.rangeAria} className="flex gap-1 rounded-full bg-chip p-0.5">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}
              className={`h-8 cursor-pointer rounded-full px-2.5 text-xs ${range === r ? 'bg-surface font-semibold text-ink shadow-sm' : 'font-medium text-muted'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative" style={{ height }}>
        <div ref={box} className="absolute inset-0" role="img"
          aria-label={m.chart.chartAria(name, shortDate(candles[0].date, m.locale), shortDate(day.date, m.locale))} />
        {hover && (
          <div className={`pointer-events-none absolute top-2 z-10 w-44 rounded-lg border border-line bg-surface/95 px-2.5 py-2 text-xs shadow-sm`}
            style={{ left: flip ? hover.x - 188 : hover.x + 12 }}>
            <div className="mb-1 font-semibold text-ink">{shortDate(day.date, m.locale)}</div>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
              <dt className="text-muted">{m.chart.open}</dt><dd className="m-0 text-right text-ink">{format(day.open)}</dd>
              <dt className="text-muted">{m.chart.high}</dt><dd className="m-0 text-right text-ink">{format(day.high)}</dd>
              <dt className="text-muted">{m.chart.low}</dt><dd className="m-0 text-right text-ink">{format(day.low)}</dd>
              <dt className="text-muted">{m.chart.close}</dt>
              <dd className="m-0 text-right font-semibold" style={{ color: day.close >= day.open ? UP : DOWN }}>{format(day.close)}</dd>
              {prev != null && (<><dt className="text-muted">{m.chart.vsDayBefore}</dt><dd className="m-0 text-right text-ink">{signedPct(day.close / prev - 1)}</dd></>)}
              {average[shown] != null && (<><dt className="text-muted">{m.chart.avgShort(MA_DAYS)}</dt><dd className="m-0 text-right text-ink">{format(average[shown]!)}</dd></>)}
            </dl>
          </div>
        )}
      </div>

      <p className="m-0 text-[13px] leading-relaxed text-ink-2" aria-live="polite">
        <span className="font-medium text-ink">{hover ? shortDate(day.date, m.locale) : m.chart.latestDay}:</span> {candleReading(day, prev, format, m)}
      </p>
    </div>
  )
}


import type { Screener } from '../api/client'
import { en, type Messages } from '../i18n/en'
import { pct, signedPct } from './format'

export type Row = Screener['stocks'][number]
export type Timeframe = '1D' | '5D' | '1M'
export type ViewId = 'gainers' | 'losers' | 'active' | 'unusual' | 'high' | 'low' | 'rule'

const CHANGE: Record<Timeframe, (r: Row) => number | null | undefined> = {
  '1D': (r) => r.change_1d, '5D': (r) => r.change_5d, '1M': (r) => r.change_20d,
}

export type View = {
  id: ViewId
  label: string
  /** The number the list is sorted by; rows without one are left out. */
  metric: (r: Row, tf: Timeframe) => number | null | undefined
  descending: boolean
  /** For the short movers lists only: e.g. a stock that fell isn't shown as a top gainer. The screener sorts everything. */
  include?: (r: Row, tf: Timeframe) => boolean
  show: (r: Row, tf: Timeframe, m?: Messages) => string
  usesTimeframe?: boolean
  coveredOnly?: boolean
  note: string
}

export const crore = (rupees: number, m: Messages = en) => m.movers.crore(Math.round(rupees / 1e7).toLocaleString('en-IN'))

export const VIEWS: View[] = [
  { id: 'gainers', label: 'Gainers', metric: (r, tf) => CHANGE[tf](r), descending: true, usesTimeframe: true,
    include: (r, tf) => (CHANGE[tf](r) ?? 0) > 0,
    show: (r, tf) => signedPct(CHANGE[tf](r), 1), note: 'Biggest rises over the period.' },
  { id: 'losers', label: 'Losers', metric: (r, tf) => CHANGE[tf](r), descending: false, usesTimeframe: true,
    include: (r, tf) => (CHANGE[tf](r) ?? 0) < 0,
    show: (r, tf) => signedPct(CHANGE[tf](r), 1), note: 'Biggest falls over the period.' },
  { id: 'active', label: 'Most active', metric: (r) => r.value_traded, descending: true,
    show: (r, _tf, m) => crore(r.value_traded, m),
    note: 'By value traded (shares × price) on the latest day. Share counts alone mislead: a cheaper stock trades more shares without being busier.' },
  { id: 'unusual', label: 'Unusual volume', metric: (r) => r.volume_ratio, descending: true,
    show: (r, _tf, m = en) => (r.volume_ratio == null ? '—' : m.movers.usual(r.volume_ratio.toFixed(1))),
    note: "Shares traded on the latest day compared with the stock's own 20-day average. A big jump often means news." },
  { id: 'high', label: 'Near 52-week high', metric: (r) => r.pos_52w, descending: true,
    show: (r, _tf, m = en) => (r.close == null ? '—' : r.close >= r.high_52w ? m.movers.atHigh : m.movers.belowHigh(pct(1 - r.close / r.high_52w))),
    note: "Where each price sits in its range over the past year." },
  { id: 'low', label: 'Near 52-week low', metric: (r) => r.pos_52w, descending: false,
    show: (r, _tf, m = en) => (r.close == null ? '—' : r.close <= r.low_52w ? m.movers.atLow : m.movers.aboveLow(pct(r.close / r.low_52w - 1))),
    note: "Where each price sits in its range over the past year." },
  { id: 'rule', label: 'Vs the others', metric: (r) => r.vs_peers_5d, descending: false, coveredOnly: true,
    show: (r) => signedPct(r.vs_peers_5d, 1),
    note: "Parakh's 20 stocks ranked by their last 5 days against the average of the 20. This is the only input to Parakh's calls: the furthest behind lean bullish, the furthest ahead bearish, and only the clearest get a call." },
]

export const viewById = (id: string | null): View => VIEWS.find((v) => v.id === id) ?? VIEWS[0]

/** Rows for a view, filtered and sorted; `limit` keeps the top few (genuine movers only) for the Today card. */
export function rank(rows: Row[], view: View, tf: Timeframe, sector: string | null, limit?: number): Row[] {
  const ranked = rows
    .filter((r) => (!view.coveredOnly || r.covered) && (!sector || r.sector === sector) && view.metric(r, tf) != null
      && (!limit || !view.include || view.include(r, tf)))
    .sort((a, b) => (view.descending ? 1 : -1) * (view.metric(b, tf)! - view.metric(a, tf)!))
  return limit ? ranked.slice(0, limit) : ranked
}

export const sectors = (rows: Row[]) => [...new Set(rows.map((r) => r.sector))].sort()

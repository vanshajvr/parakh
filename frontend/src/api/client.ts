import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { components } from './schema'

type Schemas = components['schemas']
export type Today = Schemas['TodayResponse']
export type Signal = Schemas['Signal']
export type StockSummary = Schemas['StockSummary']
export type StockDetail = Schemas['StockDetail']
export type CallStats = Schemas['CallStats']
export type LedgerRow = Schemas['LedgerRow']
export type LedgerPage = Schemas['LedgerPage']
export type TrackRecord = Schemas['TrackRecord']
export type ModelInfo = Schemas['ModelInfo']
export type PricePoint = Schemas['PricePoint']

const API_URL = import.meta.env.VITE_API_URL ?? ''

export function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

/** Development-only: serve recorded API responses (VITE_FIXTURES=1) while the live ledger is empty. */
async function fixture(path: string): Promise<unknown> {
  const files = import.meta.glob<{ default: unknown }>('../fixtures/*.json')
  const name = path.replace(/^\/api\//, '').replace(/\?.*$/, '').replace('stocks/', 'stock-').replace('history/', 'history-').toLowerCase()
  const load = files[`../fixtures/${name}.json`]
  if (!load) throw new Error(`No fixture for ${path}`)
  return (await load()).default
}

export async function getJson<T>(path: string): Promise<T> {
  if (import.meta.env.DEV && import.meta.env.VITE_FIXTURES === '1') return (await fixture(path)) as T
  const res = await fetch(apiUrl(path))
  if (res.status === 404) throw new NotFound(path)
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`)
  return res.json() as Promise<T>
}

export class NotFound extends Error {}

export function useToday() {
  return useQuery({ queryKey: ['today'], queryFn: () => getJson<Today>('/api/today') })
}

export function useStocks() {
  return useQuery({ queryKey: ['stocks'], queryFn: () => getJson<StockSummary[]>('/api/stocks') })
}

export function useStock(symbol: string) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => getJson<StockDetail>(`/api/stocks/${symbol}`),
    retry: (count, error) => !(error instanceof NotFound) && count < 1,
  })
}

/** Every stored daily candle for a stock symbol, or 'NIFTY50' for the index. Changes once a day. */
export function useHistory(symbol: string) {
  return useQuery({
    queryKey: ['history', symbol],
    queryFn: () => getJson<PricePoint[]>(`/api/history/${symbol}`),
    staleTime: 30 * 60_000,
  })
}

export function useTrackRecord() {
  return useQuery({ queryKey: ['track-record'], queryFn: () => getJson<TrackRecord>('/api/track-record') })
}

export function useModel() {
  return useQuery({ queryKey: ['model'], queryFn: () => getJson<ModelInfo>('/api/model') })
}

export function useLedger(params: { ticker?: string; limit: number; offset: number }) {
  const query = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) })
  if (params.ticker) query.set('ticker', params.ticker)
  return useQuery({
    queryKey: ['ledger', params],
    queryFn: () => getJson<LedgerPage>(`/api/ledger?${query}`),
    placeholderData: keepPreviousData,
  })
}

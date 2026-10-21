import { useQuery } from '@tanstack/react-query'
import type { components } from './schema'

export type Today = components['schemas']['TodayResponse']
export type Signal = components['schemas']['Signal']
export type StockDetail = components['schemas']['StockDetail']

const API_URL = import.meta.env.VITE_API_URL ?? ''

/** Development-only: serve recorded API responses (VITE_FIXTURES=1) while the live ledger is empty. */
async function fixture(path: string): Promise<unknown> {
  if (path === '/api/today') return (await import('../fixtures/today.json')).default
  if (path === '/api/stocks/TITAN') return (await import('../fixtures/stock-titan.json')).default
  throw new Error(`No fixture for ${path}`)
}

export async function getJson<T>(path: string): Promise<T> {
  if (import.meta.env.DEV && import.meta.env.VITE_FIXTURES === '1') return (await fixture(path)) as T
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`)
  return res.json() as Promise<T>
}

export function useToday() {
  return useQuery({ queryKey: ['today'], queryFn: () => getJson<Today>('/api/today') })
}

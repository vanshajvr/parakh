import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSimMarket } from '../api/client'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
)
const market = (last: string) => ({ dates: ['2026-10-22', last], index_fund: 'NIFTYBEES', index: [1, 1], stocks: [] })

afterEach(() => vi.unstubAllGlobals())

describe('useSimMarket', () => {
  it('reads the static copy first, so it never waits for the API', async () => {
    const fetch = vi.fn(async (url: string) => new Response(JSON.stringify(market(url === '/sim-prices.json' ? 'static' : 'api'))))
    vi.stubGlobal('fetch', fetch)
    const { result } = renderHook(() => useSimMarket(), { wrapper })
    await waitFor(() => expect(result.current.data?.dates[1]).toBe('static'))
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to the API when there is no static copy', async () => {
    vi.stubGlobal('fetch', async (url: string) => (url === '/sim-prices.json' ? new Response('', { status: 404 }) : new Response(JSON.stringify(market('api')))))
    const { result } = renderHook(() => useSimMarket(), { wrapper })
    await waitFor(() => expect(result.current.data?.dates[1]).toBe('api'))
  })
})

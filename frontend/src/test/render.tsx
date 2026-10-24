import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import nifty from '../fixtures/history-nifty50.json'
import titan from '../fixtures/history-titan.json'
import news from '../fixtures/news.json'
import simMarket from '../fixtures/sim-market.json'
import screener from '../fixtures/screener.json'

const RESPONSES: Record<string, unknown> = {
  '/api/history/NIFTY50': nifty, '/api/history/TITAN': titan, '/api/screener': screener, '/api/news?lang=en': news, '/api/sim/prices': simMarket,
}

/** Render a page with a router and a fresh query client; API responses come from the fixtures. */
export function renderPage(ui: ReactNode, path = '/') {
  vi.stubGlobal('fetch', async (url: string) =>
    RESPONSES[url] ? new Response(JSON.stringify(RESPONSES[url]), { status: 200 }) : new Response('{}', { status: 404 }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter></QueryClientProvider>)
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import nifty from '../fixtures/history-nifty50.json'
import titan from '../fixtures/history-titan.json'

const HISTORY: Record<string, unknown> = { '/api/history/NIFTY50': nifty, '/api/history/TITAN': titan }

/** Render a page with a router and a fresh query client; price history comes from the fixtures. */
export function renderPage(ui: ReactNode) {
  vi.stubGlobal('fetch', async (url: string) =>
    HISTORY[url] ? new Response(JSON.stringify(HISTORY[url]), { status: 200 }) : new Response('{}', { status: 404 }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)
}

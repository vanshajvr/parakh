import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { TrackRecord } from '../api/client'
import ledger from '../fixtures/ledger.json'
import stocks from '../fixtures/stocks.json'
import fixture from '../fixtures/track-record.json'
import { RecordView } from './Record'

vi.stubGlobal('fetch', async (url: string) =>
  new Response(JSON.stringify(url.startsWith('/api/ledger') ? ledger : stocks), { status: 200 }))

function renderRecord() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><RecordView data={fixture as TrackRecord} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Track record', () => {
  it('keeps the live and simulated records visibly separate', () => {
    renderRecord()
    const live = screen.getByRole('heading', { name: 'Live record' }).closest('section')!
    const testing = screen.getByRole('heading', { name: 'In testing' }).closest('section')!
    expect(within(live).getByText('Real calls · Day 1')).toBeInTheDocument()
    expect(within(live).getByText('published').previousSibling).toHaveTextContent('20')
    expect(within(testing).getByText(/Simulated · 2019–2026/)).toBeInTheDocument()
    expect(within(testing).getByText('51.2%')).toBeInTheDocument()
  })

  it('answers each question in the collapsed header', async () => {
    renderRecord()
    expect(screen.getByRole('button', { name: /Year by year/ })).toHaveTextContent('Worst year: 2021, at 46.9%')
    expect(screen.getByRole('button', { name: /Is the edge worth trading on/ })).toHaveTextContent("No. It's smaller than trading costs.")
    const years = screen.getByRole('button', { name: /Year by year/ })
    await userEvent.click(years)
    expect(screen.getByText(/3 of 8 years were worse than a coin flip/)).toBeVisible()
  })

  it('lists every published call in the ledger, pending ones included', async () => {
    renderRecord()
    const table = await screen.findByRole('table', { name: 'Published calls' })
    expect(within(table).getAllByRole('row')).toHaveLength(21) // header + 20 calls
    expect(within(table).getAllByText('Pending').length).toBe(5)
  })
})

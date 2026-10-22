import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Today } from '../api/client'
import fixture from '../fixtures/today.json'
import { TodayView } from './Today'

const data = fixture as Today

function renderToday(d: Today = data) {
  return render(<MemoryRouter><TodayView data={d} /></MemoryRouter>)
}

describe('Today', () => {
  it('shows one collapsed card per call, with its receipt visible', () => {
    renderToday()
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(5)
    const titan = cards[0]
    expect(within(titan).getByText('TITAN')).toBeInTheDocument()
    expect(within(titan).getByText(/51.3% right in testing/)).toBeInTheDocument()
    // The per-stock warning never hides (decision D-019)...
    expect(within(titan).getByText(/below a coin flip/)).toBeVisible()
    // ...but the details do, until the card is opened.
    expect(within(titan).getByText('Biggest factors')).not.toBeVisible()
  })

  it('tracks earlier calls in progress, marked as provisional', () => {
    renderToday()
    const section = screen.getByRole('region', { name: 'Calls in progress' })
    const items = within(section).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    const titan = items[0]
    expect(within(titan).getByText('Day 4 of 5')).toBeInTheDocument()
    expect(within(titan).getByText('behind the index by 2.1%')).toBeInTheDocument()
    expect(within(titan).getByText('On track so far')).toBeInTheDocument() // bearish and lagging
    expect(within(section).getByText(/Nothing here is a result yet/)).toBeInTheDocument()
  })

  it("leaves today's own calls out of the in-progress list", () => {
    const sameDay = { ...data, open_calls: data.open_calls!.map((c) => ({ ...c, as_of: data.as_of! })) }
    renderToday(sameDay)
    expect(screen.queryByRole('region', { name: 'Calls in progress' })).not.toBeInTheDocument()
  })

  it('shows the NIFTY 50 and what the rule sees, with details closed until tapped', async () => {
    renderToday()
    expect(screen.getByRole('heading', { name: 'NIFTY 50' })).toBeInTheDocument()
    // The index chart opens on daily candles, with a line view one tap away.
    expect(screen.getByRole('button', { name: 'candles', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'line', pressed: false })).toBeInTheDocument()
    const rule = screen.getByRole('button', { name: /What the rule sees/ })
    expect(rule).toHaveAttribute('aria-expanded', 'false')
    const ranking = screen.getByRole('list', { name: 'Stocks ranked by last week against the others', hidden: true })
    expect(ranking).not.toBeVisible()
    await userEvent.click(rule)
    expect(ranking).toBeVisible()
    expect(within(ranking).getAllByRole('listitem')).toHaveLength(20)
  })

  it('labels recent testing calls as simulated until live results exist', () => {
    renderToday()
    const button = screen.getByRole('button', { name: /Recent calls in testing/ })
    expect(within(button).getByText('Simulated')).toBeInTheDocument()
    expect(within(button).getByText(/of 44 right/)).toBeInTheDocument()
    const scored = { ...data, scoreboard: { ...data.scoreboard, live_scored: 3 } }
    renderToday(scored)
    expect(screen.getAllByRole('button', { name: /Recent calls in testing/ })).toHaveLength(1)
  })

  it('expands a card on tap', async () => {
    renderToday()
    const titan = screen.getAllByRole('article')[0]
    const toggle = within(titan).getAllByRole('button')[0]
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(titan).getByText('Biggest factors')).toBeVisible()
    expect(within(titan).getByText(/51.5% chance it lags the index/)).toBeVisible()
  })

  it('filters by lean and keeps no-call stocks in their own section', async () => {
    renderToday()
    await userEvent.click(screen.getByRole('button', { name: 'Bullish · 2' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByText('No call on 15 stocks')).toBeInTheDocument()
  })

  it('shows a friendly state before the first live calls exist', () => {
    renderToday({ ...data, as_of: null, signals: [] })
    expect(screen.getByText('Our first calls are on their way')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})

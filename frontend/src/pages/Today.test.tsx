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

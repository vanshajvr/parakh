import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Today } from '../api/client'
import fixture from '../fixtures/today.json'
import { renderPage } from '../test/render'
import { TodayView } from './Today'

const data = fixture as Today

function renderToday(d: Today = data) {
  return renderPage(<TodayView data={d} />)
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

  it('shows the NIFTY 50 chart with its whole history as candles and the 20-day trend', async () => {
    renderToday()
    expect(screen.getByRole('heading', { name: 'NIFTY 50' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'All', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Candles', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20-day average', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close line', pressed: false })).toBeInTheDocument()
    expect(screen.getByText(/^Latest day:/).parentElement).toHaveTextContent('so the candle is')
  })

  it('lists the top movers across the NIFTY 50, with an honest note on what happens next', async () => {
    renderToday()
    const gainers = await screen.findByRole('list', { name: 'Gainers' })
    const rows = within(gainers).getAllByRole('listitem')
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveTextContent('JSWSTEEL')
    expect(within(gainers).getAllByText('No calls').length).toBeGreaterThan(0)
    expect(screen.getByText(/went on to lag the NIFTY 50 the next week 53% of the time/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See all in the screener →' })).toHaveAttribute('href', '/stocks?view=gainers&tf=1D')
  })

  it("ranks only Parakh's 20 in the rule's own view", async () => {
    renderToday()
    await userEvent.click(await screen.findByRole('button', { name: 'Vs the others' }))
    const list = screen.getByRole('list', { name: 'Vs the others' })
    expect(within(list).queryByText('No calls')).not.toBeInTheDocument()
    expect(screen.getByText(/only input to Parakh's calls/)).toBeInTheDocument()
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

  it('leads with the market until live calls exist, then with the calls', () => {
    const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    renderToday()
    const chart = screen.getByRole('heading', { name: 'NIFTY 50' })
    expect(before(screen.getByRole('region', { name: "Today's calls" }), chart)).toBe(true)
    cleanup()
    renderToday({ ...data, signals: [] })
    expect(before(screen.getByRole('heading', { name: 'NIFTY 50' }), screen.getByText('Our first calls are on their way'))).toBe(true)
  })

  it('sums up where Parakh stands in four key numbers', () => {
    renderToday()
    const strip = screen.getByRole('region', { name: 'Key numbers' })
    expect(within(strip).getByText('Day 1')).toBeInTheDocument()
    expect(within(strip).getByText("Today's calls").parentElement).toHaveTextContent('2 bullish · 3 bearish · 15 no call')
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

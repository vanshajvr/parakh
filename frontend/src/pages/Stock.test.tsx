import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { StockDetail } from '../api/client'
import titan from '../fixtures/stock-titan.json'
import ultracemco from '../fixtures/stock-ultracemco.json'
import { renderPage } from '../test/render'
import { StockView } from './Stock'

const renderStock = (d: unknown) => renderPage(<StockView data={d as StockDetail} />)

describe('Stock page', () => {
  it("states today's call as a chance of doing worse than the index", () => {
    renderStock(titan)
    expect(screen.getByRole('heading', { level: 1, name: 'Titan Company' })).toBeInTheDocument()
    expect(screen.getByText(/51.5% chance Titan Company does worse than a NIFTY 50 index fund/)).toBeInTheDocument()
  })

  it('keeps the below-coin-flip warning visible while the record is collapsed', async () => {
    renderStock(titan)
    const header = screen.getByRole('button', { name: /Our record on Titan Company/ })
    expect(header).toHaveTextContent('47.1% right in testing, below a coin flip')
    expect(header).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(header)
    expect(screen.getByText('19 of 55')).toBeVisible()
  })

  it('shows a neutral record line for stocks above a coin flip', () => {
    renderStock(ultracemco)
    const header = screen.getByRole('button', { name: /Our record on UltraTech Cement/ })
    expect(header).not.toHaveTextContent('below a coin flip')
    expect(header).toHaveTextContent(/58.2% right in testing/)
  })

  it('explains what a lean means on request', async () => {
    renderStock(titan)
    await userEvent.click(screen.getByRole('button', { name: 'What does bearish lean mean?' }))
    expect(screen.getByText(/The data suggests waiting/)).toBeVisible()
  })
})

import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderPage } from '../test/render'
import { InTheNews } from './News'

describe('InTheNews', () => {
  it('leads with the biggest mover and links each headline out', async () => {
    renderPage(<InTheNews />)
    await screen.findByRole('link', { name: 'AXISBANK' })
    const groups = screen.getAllByRole('link', { name: /^(AXISBANK|HCLTECH)$/ })
    // AXISBANK fell 4.2%, HCLTECH barely moved, so AXISBANK comes first despite older news.
    expect(groups.map((g) => g.textContent)).toEqual(['AXISBANK', 'HCLTECH'])
    const headline = screen.getByRole('link', { name: /AXISBANK headline/ })
    expect(headline).toHaveAttribute('target', '_blank')
    expect(headline).toHaveAttribute('rel', 'noopener noreferrer')
    // Two headlines per stock, then a link to the rest on the stock page.
    expect(screen.getByRole('link', { name: '+1 more' })).toHaveAttribute('href', '/stocks/HCLTECH#news')
    expect(within(screen.getByText(/already moved/).closest('p')!).getByRole('button', { name: 'Priced in' })).toBeInTheDocument()
  })
})

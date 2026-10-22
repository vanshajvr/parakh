import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderPage } from '../test/render'
import { Stocks } from './Stocks'

describe('Stocks screener', () => {
  it('lists all 50 members and opens on the view the Today card linked to', async () => {
    renderPage(<Stocks />, '/stocks?view=unusual')
    expect(await screen.findByText(/^Shares traded on the latest day compared with/)).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(50)
    expect(rows[0]).toHaveTextContent('ICICIBANK')
    expect(rows[0]).toHaveTextContent('2.5× usual')
  })

  it("filters to Parakh's 20 and by sector", async () => {
    renderPage(<Stocks />, '/stocks')
    await userEvent.click(await screen.findByRole('checkbox', { name: "Parakh's 20 only" }))
    expect(screen.getAllByRole('listitem')).toHaveLength(20)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sector' }), 'Information Technology')
    const names = screen.getAllByRole('listitem').map((li) => within(li).getAllByText(/./)[0].textContent)
    expect(names).toEqual(expect.arrayContaining(['TCS', 'INFY']))
    expect(names).toHaveLength(2)
  })
})

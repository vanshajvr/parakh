import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { renderPage } from '../test/render'
import { Practice } from './Practice'

afterEach(() => localStorage.clear())

async function startCrash() {
  renderPage(<Practice />, '/practice')
  await userEvent.click(await screen.findByRole('radio', { name: /Survive the crash/ }))
  await userEvent.click(screen.getByRole('button', { name: /^Start · Survive the crash/ }))
}

describe('Practice', () => {
  it('buys the index fund at the next open and keeps the game on this device', async () => {
    await startCrash()
    expect(screen.getAllByText('₹1,00,000').length).toBeGreaterThan(0) // you and the index fund start level
    const fund = screen.getAllByRole('listitem').find((li) => li.textContent?.startsWith('NIFTYBEES'))!
    await userEvent.click(within(fund).getByRole('button', { name: 'Buy' }))
    const sheet = screen.getByRole('dialog', { name: 'Buy NIFTYBEES' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'All cash' }))
    expect(within(sheet).getByText('Total charges')).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Place order' }))
    // Nothing fills until time moves on.
    expect(screen.getByText('Fills at the next open')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+1 week' }))
    expect(within(screen.getByRole('heading', { name: 'Your holdings' }).parentElement!).getByText('NIFTYBEES')).toBeInTheDocument()

    const saved = JSON.parse(localStorage.getItem('parakh.practice.v1')!)
    expect(saved.scenario).toBe('crash')
    expect(saved.game.orders).toHaveLength(1)
  })

  it('ends the period with you against the index fund', async () => {
    await startCrash()
    for (let i = 0; i < 13; i++) await userEvent.click(screen.getByRole('button', { name: '+1 month' }))
    expect(screen.getByRole('heading', { name: "Time's up" })).toBeInTheDocument()
    // With no trades, cash just sits there, so the index fund wins.
    expect(screen.getByText(/The index fund beat you by/)).toBeInTheDocument()
  })
})

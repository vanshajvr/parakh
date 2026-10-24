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

  it('stops in the March 2020 fall and acts on the answer', async () => {
    await startCrash()
    const fund = screen.getAllByRole('listitem').find((li) => li.textContent?.startsWith('NIFTYBEES'))!
    await userEvent.click(within(fund).getByRole('button', { name: 'Buy' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'All cash' }))
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    for (let i = 0; i < 4 && !screen.queryByRole('alertdialog'); i++) await userEvent.click(screen.getByRole('button', { name: '+1 month' }))
    const prompt = screen.getByRole('alertdialog')
    expect(within(prompt).getByRole('heading')).toHaveTextContent(/The NIFTY 50 just fell \d+\.\d% in two weeks/)
    // Time stands still until there's an answer.
    const date = screen.getByRole('progressbar').parentElement!.textContent
    await userEvent.click(screen.getByRole('button', { name: '+1 month' }))
    expect(screen.getByRole('progressbar').parentElement!.textContent).toBe(date)
    await userEvent.click(within(prompt).getByRole('button', { name: /Sell everything/ }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText(/^Sell \d+ NIFTYBEES$/)).toBeInTheDocument()
  })

  it('ends with a report card that names what happened after each choice', async () => {
    await startCrash()
    for (let i = 0; i < 40 && !screen.queryByRole('heading', { name: 'Your report card' }); i++) {
      const prompt = screen.queryByRole('alertdialog')
      await userEvent.click(prompt ? within(prompt).getByRole('button', { name: /^Hold/ }) : screen.getByRole('button', { name: '+1 month' }))
    }
    expect(screen.getByRole('heading', { name: 'Your report card' })).toBeInTheDocument()
    // With everything left in cash, the index fund wins, and the report says what cash cost.
    expect(screen.getAllByText(/The index fund beat you by/).length).toBeGreaterThan(0)
    expect(screen.getByText(/sat in cash, earning nothing/)).toBeInTheDocument()
    expect(screen.getAllByText(/and you held\. Over the next month the index fund went (up|down)/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: "Cash doesn't grow" })).toBeInTheDocument()
  })
})

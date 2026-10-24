import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Today } from '../api/client'
import fixture from '../fixtures/today.json'
import { renderPage } from '../test/render'
import { TodayWorkspace } from './TodayWorkspace'

const data = fixture as Today
const calls = data.signals.filter((s) => s.lean !== 'no_call')
const noCall = data.signals.filter((s) => s.lean === 'no_call')

describe('TodayWorkspace', () => {
  it('opens on the first call, and lists calls before no-calls', () => {
    renderPage(<TodayWorkspace data={data} />)
    expect(screen.getByRole('heading', { level: 2, name: calls[0].name })).toBeInTheDocument()
    const list = within(screen.getByRole('navigation', { name: "Today's calls" })).getAllByRole('button')
    expect(list.slice(0, calls.length).map((b) => b.textContent)).toEqual(calls.map((s) => expect.stringContaining(s.symbol)))
    expect(list[0]).toHaveAttribute('aria-current', 'true')
  })

  it('shows the stock picked in the list, and opens on one named in the link', async () => {
    renderPage(<TodayWorkspace data={data} />, `/?stock=${noCall[0].symbol}`)
    expect(screen.getByRole('heading', { level: 2, name: noCall[0].name })).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(calls[1].symbol) }))
    expect(screen.getByRole('heading', { level: 2, name: calls[1].name })).toBeInTheDocument()
  })
})

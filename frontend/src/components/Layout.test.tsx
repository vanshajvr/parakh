import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router'
import { I18nProvider } from '../i18n'
import { renderPage } from '../test/render'
import { Layout } from './Layout'

function renderAt(path: string) {
  return renderPage(
    <I18nProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<p>today</p>} />
          <Route path="record" element={<p>record</p>} />
        </Route>
      </Routes>
    </I18nProvider>,
    path,
  )
}

afterEach(() => localStorage.clear())

describe('language toggle', () => {
  it('switches to Hindi, remembers it and sets the page language', async () => {
    renderAt('/')
    await userEvent.click(screen.getByRole('button', { name: 'हिंदी' }))
    expect(screen.getAllByRole('link', { name: /आज/ }).length).toBeGreaterThan(0)
    expect(document.documentElement.lang).toBe('hi')
    expect(localStorage.getItem('parakh.lang')).toBe('hi')
    // Today is translated, so there is no English-only note.
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('says when a page is still English only', () => {
    localStorage.setItem('parakh.lang', 'hi')
    renderAt('/record')
    expect(screen.getByRole('note')).toHaveTextContent('सिर्फ़ English में')
  })
})

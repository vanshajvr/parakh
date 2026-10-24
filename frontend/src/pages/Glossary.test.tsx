import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { hi } from '../i18n/hi'
import { renderPage } from '../test/render'
import { Glossary } from './Glossary'

describe('Glossary', () => {
  it('lists every term and filters by search', async () => {
    renderPage(<Glossary />, '/glossary')
    const terms = () => [...document.querySelectorAll('dt')].map((t) => t.textContent)
    expect(terms()).toHaveLength(Object.keys(en.glossary.terms).length)
    await userEvent.type(screen.getByRole('searchbox'), 'every month')
    expect(terms()).toEqual(['SIP'])
  })

  it('has every term written out in both languages', () => {
    for (const [id, t] of Object.entries(hi.glossary.terms)) {
      expect([t.term, t.short, t.example].every(Boolean), id).toBe(true)
      expect(t.short, id).not.toBe(en.glossary.terms[id as keyof typeof en.glossary.terms].short)
    }
  })
})

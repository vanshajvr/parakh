import { describe, expect, it } from 'vitest'
import type { CallStats } from '../api/client'
import { confidenceVerdict } from './metrics'

const band = (hit_rate: number) => ({ hit_rate } as CallStats)

describe('confidenceVerdict', () => {
  it('only says the labels mean something when stronger calls actually did better', () => {
    expect(confidenceVerdict({ 'Stronger edge': band(0.52), 'Slight edge': band(0.51) })).toMatch(/^Yes/)
    expect(confidenceVerdict({ 'Stronger edge': band(0.512), 'Slight edge': band(0.51) })).toMatch(/^Not really/)
    expect(confidenceVerdict({ 'Stronger edge': band(0.509), 'Slight edge': band(0.518) })).toMatch(/^No:/)
  })
})

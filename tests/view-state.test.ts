import { describe, expect, it } from 'vitest'
import { parseViewHash, toViewHash } from '../src/navigation/view-state'

describe('LocalHub SPA view state', () => {
  it('supports the three approved views', () => {
    expect(parseViewHash('#home')).toBe('home')
    expect(parseViewHash('#explore')).toBe('explore')
    expect(parseViewHash('#community')).toBe('community')
  })

  it('falls back to home for unknown hashes', () => {
    expect(parseViewHash('')).toBe('home')
    expect(parseViewHash('#unknown')).toBe('home')
  })

  it('serializes views to stable hashes', () => {
    expect(toViewHash('home')).toBe('#home')
    expect(toViewHash('explore')).toBe('#explore')
    expect(toViewHash('community')).toBe('#community')
  })
})

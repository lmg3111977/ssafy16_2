import { describe, expect, it } from 'vitest'
import { isFreeFestival, searchFestivals } from '../netlify/functions/_shared/festival-search'

const fixedNow = new Date('2026-07-15T03:00:00.000Z')

describe('festival search', () => {
  it('finds an exact festival title', () => {
    const result = searchFestivals('\uBB38\uD559\uC8FC\uAC04 2026 \uC77C\uC815', { now: fixedNow })
    expect(result[0]?.title).toBe('\uBB38\uD559\uC8FC\uAC04 2026')
  })

  it('filters by month', () => {
    const result = searchFestivals('2026\uB144 7\uC6D4 \uCD95\uC81C', { now: fixedNow, limit: 10 })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((item) => {
      const start = item.eventstartdate ?? ''
      const end = item.eventenddate ?? ''
      return start.slice(0, 6) <= '202607' && end.slice(0, 6) >= '202607'
    })).toBe(true)
  })

  it('filters free events', () => {
    const result = searchFestivals('\uBB34\uB8CC \uCD95\uC81C \uC54C\uB824\uC918', { now: fixedNow, limit: 10 })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(isFreeFestival)).toBe(true)
  })

  it('filters ongoing events for today', () => {
    const result = searchFestivals('\uC624\uB298 \uC5F4\uB9AC\uB294 \uCD95\uC81C', { now: fixedNow, limit: 10 })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((item) => Boolean(item.eventstartdate && item.eventenddate && item.eventstartdate <= '20260715' && item.eventenddate >= '20260715'))).toBe(true)
  })

  it('filters by district', () => {
    const result = searchFestivals('\uC885\uB85C\uAD6C \uCD95\uC81C', { now: fixedNow, limit: 10 })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((item) => `${item.addr1} ${item.eventplace}`.includes('\uC885\uB85C\uAD6C'))).toBe(true)
  })

  it('returns no random result for an unknown title', () => {
    expect(searchFestivals('\uC874\uC7AC\uD558\uC9C0\uC54A\uB294\uD589\uC0ACXYZ987', { now: fixedNow })).toHaveLength(0)
  })
})

import { describe, expect, it } from 'vitest'
import { searchFestivals } from '../netlify/functions/_shared/festival-search'

const TODAY = '20260715'

describe('서울 축제 검색', () => {
  it('정확한 축제명으로 검색한다', () => {
    const results = searchFestivals('문학주간 2026 일정 알려줘', {
      today: TODAY,
      limit: 5,
    })

    expect(results[0]?.title).toBe('문학주간 2026')
    expect(results[0]?.startDate).toBe('2026-09-16')
  })

  it('오늘 진행 중인 행사만 찾는다', () => {
    const results = searchFestivals('오늘 진행 중인 축제 알려줘', {
      today: TODAY,
      limit: 5,
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((result) => result.status === 'ongoing')).toBe(true)
  })

  it('자치구와 무료 조건을 동시에 적용한다', () => {
    const results = searchFestivals('종로구 무료 축제 알려줘', {
      today: TODAY,
      limit: 8,
    })

    expect(results.length).toBeGreaterThan(0)
    expect(
      results.every(
        (result) =>
          `${result.address ?? ''} ${result.eventPlace ?? ''}`.includes('종로구') &&
          /무료|0원/.test(result.fee ?? ''),
      ),
    ).toBe(true)
  })

  it('특정 월과 겹치는 행사만 찾는다', () => {
    const results = searchFestivals('9월 축제 알려줘', {
      today: TODAY,
      limit: 8,
    })

    expect(results.length).toBeGreaterThan(0)
    expect(
      results.every((result) => {
        const start = result.startDate?.replaceAll('-', '') ?? ''
        const end = result.endDate?.replaceAll('-', '') || start
        return start <= '20260930' && end >= '20260901'
      }),
    ).toBe(true)
  })

  it('존재하지 않는 고유 검색어에는 결과를 반환하지 않는다', () => {
    const results = searchFestivals('존재하지않는축제이름12345 알려줘', {
      today: TODAY,
    })

    expect(results).toEqual([])
  })
})

describe('무료 행사 판별', () => {
  it('유아만 무료인 유료 행사를 전체 무료 행사로 분류하지 않는다', () => {
    const results = searchFestivals('국악공연 진연 무료 행사', {
      today: TODAY,
      limit: 8,
    })

    expect(results.some((result) => result.title === '국악공연 진연')).toBe(false)
  })

  it('입장료가 실제로 무료인 행사는 검색한다', () => {
    const results = searchFestivals('서울국제작가축제 무료', {
      today: TODAY,
      limit: 5,
    })

    expect(results[0]?.title).toBe('서울국제작가축제')
    expect(results[0]?.fee).toBe('무료')
  })
})

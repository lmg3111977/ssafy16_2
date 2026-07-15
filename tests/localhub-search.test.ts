import { describe, expect, it } from 'vitest'
import { searchLocalHub } from '../netlify/functions/_shared/localhub-search'
import {
  createFallbackAnswer,
  createProjectChatFallback,
} from '../netlify/functions/_shared/festival-answer'

const TODAY = '20260715'

describe('LocalHub 통합 검색', () => {
  it('숙박 데이터만 검색한다', () => {
    const results = searchLocalHub('호텔 추천', {
      sourceTypes: ['accommodation'],
      today: TODAY,
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((result) => result.type === 'accommodation')).toBe(true)
  })

  it('여행 코스 데이터만 검색한다', () => {
    const results = searchLocalHub('서울 여행 코스', {
      sourceTypes: ['course'],
      today: TODAY,
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((result) => result.type === 'course')).toBe(true)
  })

  it('여러 제공자를 검색할 때 한 종류가 결과를 독점하지 않는다', () => {
    const results = searchLocalHub('서울 추천', {
      sourceTypes: ['shopping', 'accommodation'],
      today: TODAY,
      limit: 5,
    })

    expect(new Set(results.map((result) => result.type))).toEqual(
      new Set(['shopping', 'accommodation']),
    )
    expect(results.filter((result) => result.type === 'shopping').length).toBeLessThanOrEqual(3)
  })

  it('공개 커뮤니티 글을 비밀번호 없이 근거로 변환한다', () => {
    const results = searchLocalHub('한강 산책 후기', {
      sourceTypes: ['community'],
      communityPosts: [
        {
          id: 'post-1',
          title: '한강 산책 후기',
          content: '저녁에 걸으니 좋았습니다.',
          createdAt: '2026-07-15T00:00:00.000Z',
        },
      ],
    })

    expect(results[0]).toMatchObject({
      contentId: 'post-1',
      type: 'community',
      title: '한강 산책 후기',
    })
  })

  it('대체 답변이 자료 유형을 구분한다', () => {
    const [source] = searchLocalHub('호텔 추천', {
      sourceTypes: ['accommodation'],
      today: TODAY,
      limit: 1,
    })

    expect(createFallbackAnswer([source])).toContain('숙박')
    expect(createProjectChatFallback()).toContain('서울 지역 정보')
  })
})

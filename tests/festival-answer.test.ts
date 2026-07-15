import { describe, expect, it } from 'vitest'
import { createFallbackAnswer } from '../netlify/functions/_shared/festival-answer'
import { searchFestivals } from '../netlify/functions/_shared/festival-search'

describe('검색 전용 챗봇 답변 형식', () => {
  it('여러 검색 결과를 빈 줄 없이 줄바꿈한다', () => {
    const sources = searchFestivals('9월 축제 알려줘', {
      today: '20260715',
      limit: 2,
    })

    expect(sources).toHaveLength(2)
    expect(createFallbackAnswer(sources)).not.toContain('\n\n')
  })
})

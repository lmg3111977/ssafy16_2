import { describe, expect, it } from 'vitest'
import { normalizeChatSuggestions } from '../src/chatbot/suggestions'

describe('추천 질문 클라이언트 정규화', () => {
  it('공백과 중복을 제거하고 최대 3개만 유지한다', () => {
    expect(normalizeChatSuggestions([
      ' 서울 호텔 추천해줘 ',
      '',
      '서울 호텔 추천해줘',
      '서울 여행 코스 추천해줘',
      '오늘 축제 알려줘',
      '서울 쇼핑 장소 알려줘',
    ])).toEqual([
      '서울 호텔 추천해줘',
      '서울 여행 코스 추천해줘',
      '오늘 축제 알려줘',
    ])
  })

  it('추천이 없으면 빈 배열을 반환한다', () => {
    expect(normalizeChatSuggestions(undefined)).toEqual([])
  })
})

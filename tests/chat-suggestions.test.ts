import { describe, expect, it } from 'vitest'
import { createChatSuggestions } from '../netlify/functions/_shared/chat-suggestions'

describe('답변 가능한 추천 질문', () => {
  it('미지원 질문에서 자치구를 보존하고 지원하지 않는 주제는 제거한다', () => {
    const suggestions = createChatSuggestions('강남구 음식점 추천해줘')

    expect(suggestions).toEqual([
      '강남구 관광지 알려줘',
      '강남구 쇼핑 장소 알려줘',
      '강남구 숙박 시설 알려줘',
    ])
    expect(suggestions).toHaveLength(3)
    expect(suggestions.every((question) => !question.includes('음식점'))).toBe(true)
  })

  it('활용 가능한 지역 조건이 없으면 안정적인 기본 질문을 반환한다', () => {
    expect(createChatSuggestions('주식 종목 추천해줘')).toEqual([
      '오늘 진행 중인 서울 축제 알려줘',
      '서울 여행 코스 추천해줘',
      '서울 호텔 추천해줘',
    ])
  })

  it('지원되는 날짜 조건은 축제 추천에 보존한다', () => {
    expect(createChatSuggestions('다음 달 음식점 알려줘')[0]).toBe(
      '다음 달 서울 축제 알려줘',
    )
  })
})

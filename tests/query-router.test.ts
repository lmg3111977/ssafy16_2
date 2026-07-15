import { describe, expect, it } from 'vitest'

import { routeChatQuestion } from '../netlify/functions/_shared/query-router'

describe('챗봇 질문 라우터', () => {
  it('축제 질문을 프로젝트 데이터 검색으로 분류한다', () => {
    expect(routeChatQuestion('9월에 열리는 축제 알려줘')).toEqual({
      kind: 'project-data',
      sourceTypes: ['festival'],
    })
  })

  it('숙박 질문은 숙박 공급자만 선택한다', () => {
    expect(routeChatQuestion('서울 호텔 추천해줘')).toEqual({
      kind: 'project-data',
      sourceTypes: ['accommodation'],
    })
  })

  it('여러 데이터 유형이 명시되면 해당 공급자를 모두 선택한다', () => {
    expect(routeChatQuestion('축제 근처 숙소와 쇼핑 장소 알려줘')).toEqual({
      kind: 'project-data',
      sourceTypes: ['festival', 'accommodation', 'shopping'],
    })
  })

  it('인사와 도움 요청은 프로젝트 관련 일상대화로 분류한다', () => {
    expect(routeChatQuestion('안녕, 오늘도 도와줄 수 있어?')).toEqual({
      kind: 'project-chat',
      sourceTypes: [],
    })
  })

  it('고위험 금융 요청은 지원 범위 밖으로 분류한다', () => {
    expect(routeChatQuestion('주식 종목 추천해줘')).toEqual({
      kind: 'out-of-scope',
      sourceTypes: [],
    })
  })

  it('서울 여행 추천처럼 유형이 모호한 질문은 전체 지역정보를 검색한다', () => {
    expect(routeChatQuestion('서울에서 어디를 가면 좋을까?')).toEqual({
      kind: 'project-data',
      sourceTypes: [
        'festival',
        'attraction',
        'culture',
        'leisure',
        'accommodation',
        'shopping',
        'course',
      ],
    })
  })

  it('고유 명칭과 일정 질문은 전체 프로젝트 데이터를 검색한다', () => {
    expect(routeChatQuestion('문학주간 2026 일정 알려줘').kind).toBe('project-data')
  })

  it('제공 데이터에 없는 음식점 질문은 지원 범위 밖으로 분류한다', () => {
    expect(routeChatQuestion('강남구 음식점 추천해줘')).toEqual({
      kind: 'out-of-scope',
      sourceTypes: [],
    })
  })
})

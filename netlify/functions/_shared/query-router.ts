import type { LocalHubSourceType } from '../../../shared/chat-contract'

export type ChatRoute =
  | { kind: 'project-data'; sourceTypes: LocalHubSourceType[] }
  | { kind: 'project-chat'; sourceTypes: [] }
  | { kind: 'out-of-scope'; sourceTypes: [] }

const ALL_STATIC_SOURCE_TYPES: LocalHubSourceType[] = [
  'festival',
  'attraction',
  'culture',
  'leisure',
  'accommodation',
  'shopping',
  'course',
]

const SOURCE_KEYWORDS: Array<{
  type: LocalHubSourceType
  keywords: readonly string[]
}> = [
  { type: 'festival', keywords: ['축제', '공연', '행사', '페스티벌'] },
  { type: 'attraction', keywords: ['관광지', '명소', '볼거리'] },
  { type: 'culture', keywords: ['문화시설', '박물관', '미술관', '전시관', '공연장'] },
  { type: 'leisure', keywords: ['레포츠', '스포츠', '체험', '액티비티'] },
  { type: 'accommodation', keywords: ['숙박', '숙소', '호텔', '모텔', '게스트하우스'] },
  { type: 'shopping', keywords: ['쇼핑', '시장', '백화점', '상점', '기념품'] },
  { type: 'course', keywords: ['여행코스', '여행 코스', '관광코스', '산책코스', '코스'] },
  { type: 'community', keywords: ['커뮤니티', '게시글', '게시판', '후기'] },
]

const PROJECT_CASUAL_PATTERNS = [
  /^(안녕|안녕하세요|반가워|반갑습니다)/,
  /(고마워|감사해|감사합니다|수고했어|잘 가|또 봐)/,
  /(넌 누구|너는 누구|무엇을 할 수|뭘 할 수|사용법|도와줄 수)/,
]

const OUT_OF_SCOPE_PATTERNS = [
  /(주식|종목|코인|투자).*(추천|매수|매도)/,
  /(진단|처방|약을 먹|의료 상담)/,
  /(법률 상담|소송 전략|고소장 작성)/,
  /(코드 짜|코딩해|번역해|수학 문제|숙제)/,
]

const PROJECT_DATA_PATTERNS = [
  /(서울|여행|관광|가볼|어디|추천|데이트|나들이|장소|지역)/,
]

export function routeChatQuestion(question: string): ChatRoute {
  const normalized = question.trim().toLocaleLowerCase('ko-KR')
  const sourceTypes = SOURCE_KEYWORDS
    .filter(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(({ type }) => type)

  if (sourceTypes.length > 0) {
    return { kind: 'project-data', sourceTypes }
  }

  if (OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { kind: 'out-of-scope', sourceTypes: [] }
  }

  if (PROJECT_CASUAL_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { kind: 'project-chat', sourceTypes: [] }
  }

  if (PROJECT_DATA_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      kind: 'project-data',
      sourceTypes: [...ALL_STATIC_SOURCE_TYPES],
    }
  }

  return { kind: 'out-of-scope', sourceTypes: [] }
}

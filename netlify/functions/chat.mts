import type { Config } from '@netlify/functions'
import OpenAI from 'openai'
import festivalJson from './data/seoul-festivals.json'
import type {
  FestivalItem,
  FestivalJson,
} from './_shared/festival-types'
import {
  buildSearchOnlyAnswer,
  getSeoulToday,
  searchFestivals,
  toFestivalSource,
  toPromptRecord,
} from './_shared/festival-search'

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

const SYSTEM_INSTRUCTIONS = [
  '당신은 LocalHub의 서울 축제 정보 안내 챗봇입니다.',
  '반드시 서버가 제공한 검색 결과만 근거로 답하세요.',
  '검색 결과에 없는 사실, 실시간 운영 여부, 혼잡도, 후기를 추측하지 마세요.',
  '날짜, 장소, 요금, 좌표를 임의로 바꾸거나 반올림하지 마세요.',
  '값이 null이거나 비어 있으면 제공된 정보가 없다고 말하세요.',
  '앞서 조회한 행사 결과가 제공되면 요금, 장소, 날짜 같은 후속 질문에 자연스럽게 답하세요.',
  '후보가 여러 개면 행사별로 구분해서 답하세요.',
  '답변은 간결하고 읽기 쉬운 한국어로 작성하세요.',
].join('\n')

const festivalData = festivalJson as FestivalJson
const festivalByContentId = new Map(
  festivalData.items.map((item) => [item.contentid, item]),
)

const FOLLOW_UP_TERMS = [
  '요금',
  '가격',
  '얼마',
  '무료야',
  '언제',
  '기간',
  '날짜',
  '몇시',
  '시간',
  '어디',
  '장소',
  '주소',
  '위치',
  '전화',
  '연락처',
  '연령',
  '나이',
  '프로그램',
  '내용',
  '주최',
  '그거',
  '그건',
  '그게',
  '그축제',
  '그행사',
  '이축제',
  '이행사',
  '거기',
  '그곳',
]

const PRONOUN_REFERENCES = [
  '그거',
  '그건',
  '그게',
  '그축제',
  '그행사',
  '이축제',
  '이행사',
  '거기',
  '그곳',
]

const TITLE_STOP_TOKENS = new Set([
  '서울',
  '서울시',
  '축제',
  '행사',
  '공연',
])

interface ChatRequestBody {
  question?: unknown
  context?: {
    contentIds?: unknown
  }
}

function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  })
}

function normalizeQuestion(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim()
  return normalized || null
}

function normalizeContextIds(body: unknown): string[] {
  if (typeof body !== 'object' || body === null || !('context' in body)) {
    return []
  }

  const context = (body as ChatRequestBody).context
  if (!context || !Array.isArray(context.contentIds)) return []

  return [...new Set(
    context.contentIds
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => /^\d{1,32}$/.test(value)),
  )].slice(0, 5)
}

function compact(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function isLikelyFollowUp(question: string): boolean {
  const normalized = compact(question)
  return FOLLOW_UP_TERMS.some((term) => normalized.includes(compact(term)))
}

function hasPronounReference(question: string): boolean {
  const normalized = compact(question)
  return PRONOUN_REFERENCES.some((term) => normalized.includes(compact(term)))
}

function hasNewSearchScope(question: string): boolean {
  return /(?:20\d{2}\s*년|\d{1,2}\s*월|[가-힣]{1,8}구|오늘|현재|지금|이번\s*달|주말|무료|공짜|0\s*원|진행\s*중|예정|앞으로|다가오는|종료|지난)/u.test(question)
}

function titleTokens(title: string): string[] {
  return title
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !/^20\d{2}$/.test(token))
    .filter((token) => !TITLE_STOP_TOKENS.has(token))
}

function questionMentionsMatchedTitle(
  question: string,
  matches: readonly FestivalItem[],
): boolean {
  const normalizedQuestion = compact(question)

  return matches.some((item) => {
    const normalizedTitle = compact(item.title)
    if (normalizedTitle.length >= 3 && normalizedQuestion.includes(normalizedTitle)) {
      return true
    }

    return titleTokens(item.title)
      .some((token) => normalizedQuestion.includes(compact(token)))
  })
}

function getContextMatches(contentIds: readonly string[]): FestivalItem[] {
  return contentIds
    .map((contentId) => festivalByContentId.get(contentId))
    .filter((item): item is FestivalItem => Boolean(item))
}

function isTruthyEnvironmentValue(value: string | undefined): boolean {
  return /^(?:1|true|yes|on)$/i.test(value?.trim() ?? '')
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: JSON_HEADERS })
  }

  if (request.method !== 'POST') {
    return json(
      { error: '허용되지 않는 요청 방식입니다.' },
      405,
      { Allow: 'POST' },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: '요청 JSON 형식을 확인해 주세요.' }, 400)
  }

  const question = normalizeQuestion(
    typeof body === 'object' && body !== null && 'question' in body
      ? (body as ChatRequestBody).question
      : undefined,
  )

  if (!question) {
    return json({ error: '질문을 입력해 주세요.' }, 400)
  }

  if (question.length > 300) {
    return json({ error: '질문은 300자 이하로 입력해 주세요.' }, 400)
  }

  const now = getSeoulToday()
  const directMatches = searchFestivals(question, { now, limit: 5 })
  const contextIds = normalizeContextIds(body)
  const contextMatches = getContextMatches(contextIds)

  const contextUsed = Boolean(
    contextMatches.length > 0 &&
    isLikelyFollowUp(question) &&
    !questionMentionsMatchedTitle(question, directMatches) &&
    (hasPronounReference(question) || !hasNewSearchScope(question)),
  )

  const matches = contextUsed ? contextMatches : directMatches
  const sources = matches.map((item) => toFestivalSource(item, now))
  const fallbackReply = buildSearchOnlyAnswer(matches)

  if (matches.length === 0) {
    return json({
      reply: fallbackReply,
      sources: [],
      meta: {
        llmUsed: false,
        matchedCount: 0,
        model: null,
        contextUsed: false,
      },
    })
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini'
  const forceFallback = isTruthyEnvironmentValue(
    process.env.CHATBOT_FORCE_FALLBACK,
  )

  if (!apiKey || forceFallback) {
    const warning = forceFallback
      ? 'CHATBOT_FORCE_FALLBACK 설정으로 JSON 검색 답변을 사용했습니다.'
      : 'OPENAI_API_KEY가 설정되지 않아 JSON 검색 답변을 사용했습니다.'

    return json({
      reply: fallbackReply,
      sources,
      meta: {
        llmUsed: false,
        matchedCount: sources.length,
        model: null,
        contextUsed,
        warning,
      },
    })
  }

  try {
    const client = new OpenAI({
      apiKey,
      timeout: 20_000,
      maxRetries: 1,
    })

    const response = await client.responses.create({
      model,
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        '<user_question>',
        question,
        '</user_question>',
        '<festival_search_results>',
        JSON.stringify(matches.map(toPromptRecord), null, 2),
        '</festival_search_results>',
      ].join('\n'),
      reasoning: /^(?:gpt-5|o\d)/i.test(model)
        ? { effort: 'low' as const }
        : undefined,
      max_output_tokens: 1600,
      store: false,
    })

    const reply = response.output_text?.trim() ?? ''

    if (!reply) {
      console.error('OpenAI response contained no text.', {
        status: response.status,
        incompleteDetails: response.incomplete_details,
        usage: response.usage,
        output: response.output,
      })

      const reason = response.incomplete_details?.reason
      if (reason === 'max_output_tokens') {
        throw new Error('OpenAI output token limit was reached before text was produced.')
      }

      throw new Error('OpenAI response was empty.')
    }

    return json({
      reply,
      sources,
      meta: {
        llmUsed: true,
        matchedCount: sources.length,
        model,
        contextUsed,
      },
    })
  } catch (error) {
    console.error('OpenAI request failed:', error)

    return json({
      reply: fallbackReply,
      sources,
      meta: {
        llmUsed: false,
        matchedCount: sources.length,
        model: null,
        contextUsed,
        warning: 'LLM 호출에 실패하여 JSON 검색 결과로 답변했습니다.',
      },
    })
  }
}

export const config: Config = {
  path: '/api/chat',
  method: 'POST',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip'],
  },
}

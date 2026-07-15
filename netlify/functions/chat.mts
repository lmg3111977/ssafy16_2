import type { Config } from '@netlify/functions'
import OpenAI from 'openai'
import type {
  FestivalChatRequest,
  FestivalChatResponse,
  FestivalSource,
} from '../../shared/chat-contract'
import { createFallbackAnswer } from './_shared/festival-answer'
import { searchFestivals } from './_shared/festival-search'

const DEFAULT_MODEL = 'gpt-5.6-luna'
const MAX_QUESTION_LENGTH = 300

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

function isRequestBody(value: unknown): value is FestivalChatRequest {
  if (typeof value !== 'object' || value === null) return false
  return 'question' in value && typeof value.question === 'string'
}

function dataContext(sources: FestivalSource[]): string {
  return JSON.stringify(
    sources.map((source) => ({
      title: source.title,
      address: source.address,
      eventPlace: source.eventPlace,
      startDate: source.startDate,
      endDate: source.endDate,
      playTime: source.playTime,
      fee: source.fee,
      ageLimit: source.ageLimit,
      phone: source.phone,
      longitude: source.longitude,
      latitude: source.latitude,
      status: source.status,
      programExcerpt: source.programExcerpt,
    })),
    null,
    2,
  )
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'POST 요청만 허용됩니다.', code: 'METHOD_NOT_ALLOWED' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          Allow: 'POST',
        },
      },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return json(
      { error: '올바른 JSON 요청이 아닙니다.', code: 'INVALID_JSON' },
      400,
    )
  }

  if (!isRequestBody(body)) {
    return json(
      { error: 'question 문자열이 필요합니다.', code: 'INVALID_REQUEST' },
      400,
    )
  }

  const question = body.question.trim()
  if (!question) {
    return json(
      { error: '질문을 입력해 주세요.', code: 'EMPTY_QUESTION' },
      400,
    )
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return json(
      {
        error: `질문은 ${MAX_QUESTION_LENGTH}자 이하로 입력해 주세요.`,
        code: 'QUESTION_TOO_LONG',
      },
      400,
    )
  }

  const sources = searchFestivals(question, { limit: 5 })
  const generatedAt = new Date().toISOString()

  if (sources.length === 0) {
    const response: FestivalChatResponse = {
      reply: createFallbackAnswer([]),
      sources: [],
      meta: {
        mode: 'search',
        resultCount: 0,
        generatedAt,
      },
    }
    return json(response)
  }

  const forceFallback = process.env.CHATBOT_FORCE_FALLBACK === 'true'
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL

  if (!apiKey || forceFallback) {
    const response: FestivalChatResponse = {
      reply: createFallbackAnswer(sources),
      sources,
      meta: {
        mode: 'fallback',
        resultCount: sources.length,
        generatedAt,
      },
      warning: !apiKey
        ? 'OPENAI_API_KEY가 없어 검색 전용 답변으로 동작했습니다.'
        : undefined,
    }
    return json(response)
  }

  try {
    const openai = new OpenAI({ apiKey })
    const modelResponse = await openai.responses.create({
  model,
  store: false,

  // 간단한 관광 질의응답이므로 추론량을 낮춥니다.
  reasoning: {
    effort: 'low',
  },

  // 추론 토큰과 실제 답변 토큰을 모두 포함하는 제한입니다.
  max_output_tokens: 2000,
      instructions: [
        '당신은 서울 축제·공연·행사 상담 챗봇입니다.',
        '반드시 제공된 검색 결과만 근거로 한국어로 답하세요.',
        '검색 결과에 없는 사실, 평가, 후기, 실시간 상태를 추측하지 마세요.',
        '날짜, 주소, 전화번호, 요금, 좌표 숫자는 임의로 바꾸거나 반올림하지 마세요.',
        '정보가 null이면 해당 정보가 제공되지 않았다고 말하세요.',
        '후보가 여러 개면 번호 목록으로 구분하세요.',
        '답변은 상담 챗봇처럼 친절하되 8문장 이내로 간결하게 작성하세요.',
      ].join('\n'),
      input: [
        `사용자 질문:\n${question}`,
        `\n검색된 공공데이터:\n${dataContext(sources)}`,
      ].join('\n'),
    })

    const reply = modelResponse.output_text.trim()
    if (!reply) throw new Error('OpenAI response was empty')

    const response: FestivalChatResponse = {
      reply,
      sources,
      meta: {
        mode: 'llm',
        model,
        requestId: modelResponse._request_id ?? undefined,
        resultCount: sources.length,
        generatedAt,
      },
    }

    return json(response)
  } catch (error) {
    console.error(
      'OpenAI request failed:',
      error instanceof Error ? error.message : 'unknown error',
    )

    const response: FestivalChatResponse = {
      reply: createFallbackAnswer(sources),
      sources,
      meta: {
        mode: 'fallback',
        model,
        resultCount: sources.length,
        generatedAt,
      },
      warning:
        'LLM 호출에 실패하여 공공데이터 검색 결과만으로 답변했습니다.',
    }

    return json(response)
  }
}

export const config: Config = {
  path: '/api/chat',
  method: 'POST',
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip'],
  },
}

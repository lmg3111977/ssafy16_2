import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import handler from '../netlify/functions/chat.mts'
import type { FestivalChatResponse } from '../shared/chat-contract'

const previousApiKey = process.env.OPENAI_API_KEY
const previousFallback = process.env.CHATBOT_FORCE_FALLBACK

beforeEach(() => {
  delete process.env.OPENAI_API_KEY
  process.env.CHATBOT_FORCE_FALLBACK = 'true'
})

afterEach(() => {
  if (previousApiKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = previousApiKey

  if (previousFallback === undefined) delete process.env.CHATBOT_FORCE_FALLBACK
  else process.env.CHATBOT_FORCE_FALLBACK = previousFallback
})

describe('Netlify chat Function', () => {
  it('POST 이외의 메서드를 거부한다', async () => {
    const response = await handler(new Request('http://localhost/api/chat'))

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('POST')
  })

  it('question이 없으면 400을 반환한다', async () => {
    const response = await handler(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'INVALID_REQUEST',
    })
  })

  it('300자를 넘는 질문을 거부한다', async () => {
    const response = await handler(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: '가'.repeat(301) }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'QUESTION_TOO_LONG',
    })
  })

  it('API 키가 없어도 검증된 검색 답변으로 동작한다', async () => {
    const response = await handler(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: '문학주간 2026 일정 알려줘' }),
      }),
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as FestivalChatResponse
    expect(body.meta.mode).toBe('fallback')
    expect(body.sources[0]?.title).toBe('문학주간 2026')
    expect(body.reply).toContain('문학주간 2026')
  })
})

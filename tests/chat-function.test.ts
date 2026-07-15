import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import handler from '../netlify/functions/chat.mts'

const originalApiKey = process.env.OPENAI_API_KEY
const originalForceFallback = process.env.CHATBOT_FORCE_FALLBACK

function restoreEnvironment(
  name: 'OPENAI_API_KEY' | 'CHATBOT_FORCE_FALLBACK',
  value: string | undefined,
): void {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}

async function postChat(body: unknown): Promise<Response> {
  return handler(new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

beforeEach(() => {
  delete process.env.OPENAI_API_KEY
  process.env.CHATBOT_FORCE_FALLBACK = 'false'
})

afterEach(() => {
  restoreEnvironment('OPENAI_API_KEY', originalApiKey)
  restoreEnvironment('CHATBOT_FORCE_FALLBACK', originalForceFallback)
})

describe('chat function', () => {
  it('returns grounded search fallback without an API key', async () => {
    const response = await postChat({ question: '문학주간 2026 일정' })
    const payload = await response.json() as {
      reply: string
      sources: Array<{ title: string }>
      meta: { llmUsed: boolean; contextUsed: boolean }
    }

    expect(response.status).toBe(200)
    expect(payload.sources[0]?.title).toBe('문학주간 2026')
    expect(payload.meta.llmUsed).toBe(false)
    expect(payload.meta.contextUsed).toBe(false)
    expect(payload.reply.length).toBeGreaterThan(10)
  })

  it('uses the latest grounded festival for a follow-up fee question', async () => {
    const response = await postChat({
      question: '요금이 어떻게 돼?',
      context: { contentIds: ['2556687'] },
    })
    const payload = await response.json() as {
      reply: string
      sources: Array<{ title: string; fee: string | null }>
      meta: { contextUsed: boolean }
    }

    expect(response.status).toBe(200)
    expect(payload.meta.contextUsed).toBe(true)
    expect(payload.sources[0]?.title).toBe('문학주간 2026')
    expect(payload.sources[0]?.fee).toBe('무료')
    expect(payload.reply).toContain('무료')
  })

  it('prefers a newly named festival over the previous context', async () => {
    const response = await postChat({
      question: '서울국제작가축제 장소 알려줘',
      context: { contentIds: ['2556687'] },
    })
    const payload = await response.json() as {
      sources: Array<{ title: string }>
      meta: { contextUsed: boolean }
    }

    expect(response.status).toBe(200)
    expect(payload.meta.contextUsed).toBe(false)
    expect(payload.sources[0]?.title).toBe('서울국제작가축제')
  })

  it('ignores malformed context IDs without failing', async () => {
    const response = await postChat({
      question: '요금이 어떻게 돼?',
      context: { contentIds: ['not-an-id', 2556687, null] },
    })
    const payload = await response.json() as {
      sources: unknown[]
      meta: { contextUsed: boolean }
    }

    expect(response.status).toBe(200)
    expect(payload.meta.contextUsed).toBe(false)
    expect(payload.sources).toHaveLength(0)
  })

  it('honors the forced JSON fallback setting', async () => {
    process.env.OPENAI_API_KEY = 'test-key-that-must-not-be-used'
    process.env.CHATBOT_FORCE_FALLBACK = 'true'

    const response = await postChat({ question: '문학주간 2026 일정' })
    const payload = await response.json() as {
      meta: { llmUsed: boolean; warning?: string }
    }

    expect(response.status).toBe(200)
    expect(payload.meta.llmUsed).toBe(false)
    expect(payload.meta.warning).toContain('CHATBOT_FORCE_FALLBACK')
  })

  it('rejects non-POST requests', async () => {
    const response = await handler(new Request('http://localhost/api/chat'))
    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST')
  })

  it('rejects overly long questions', async () => {
    const response = await postChat({ question: 'a'.repeat(301) })
    expect(response.status).toBe(400)
  })
})

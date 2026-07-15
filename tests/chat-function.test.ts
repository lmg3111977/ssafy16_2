import { describe, expect, it } from 'vitest'
import handler from '../netlify/functions/chat.mts'

describe('chat function', () => {
  it('returns grounded search fallback without an API key', async () => {
    const previousKey = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
    const response = await handler(new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '\uBB38\uD559\uC8FC\uAC04 2026 \uC77C\uC815' }),
    }))
    const payload = await response.json() as { reply: string; sources: Array<{ title: string }>; meta: { llmUsed: boolean } }
    expect(response.status).toBe(200)
    expect(payload.sources[0]?.title).toBe('\uBB38\uD559\uC8FC\uAC04 2026')
    expect(payload.meta.llmUsed).toBe(false)
    expect(payload.reply.length).toBeGreaterThan(10)
    if (previousKey) process.env.OPENAI_API_KEY = previousKey
  })

  it('rejects non-POST requests', async () => {
    expect((await handler(new Request('http://localhost/api/chat'))).status).toBe(405)
  })

  it('rejects overly long questions', async () => {
    const response = await handler(new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'a'.repeat(301) }),
    }))
    expect(response.status).toBe(400)
  })
})

import type { Config } from '@netlify/functions'
import OpenAI from 'openai'
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
  '\uB2F9\uC2E0\uC740 LocalHub\uC758 \uC11C\uC6B8 \uCD95\uC81C \uC815\uBCF4 \uC548\uB0B4 \uCC57\uBD07\uC785\uB2C8\uB2E4.',
  '\uBC18\uB4DC\uC2DC \uC11C\uBC84\uAC00 \uC81C\uACF5\uD55C \uAC80\uC0C9 \uACB0\uACFC\uB9CC \uADFC\uAC70\uB85C \uB2F5\uD558\uC138\uC694.',
  '\uAC80\uC0C9 \uACB0\uACFC\uC5D0 \uC5C6\uB294 \uC0AC\uC2E4, \uC2E4\uC2DC\uAC04 \uC6B4\uC601 \uC5EC\uBD80, \uD63C\uC7A1\uB3C4, \uD6C4\uAE30\uB97C \uCD94\uCE21\uD558\uC9C0 \uB9C8\uC138\uC694.',
  '\uB0A0\uC9DC, \uC7A5\uC18C, \uC694\uAE08, \uC88C\uD45C\uB97C \uC784\uC758\uB85C \uBC14\uAFB8\uAC70\uB098 \uBC18\uC62C\uB9BC\uD558\uC9C0 \uB9C8\uC138\uC694.',
  '\uAC12\uC774 null\uC774\uAC70\uB098 \uBE44\uC5B4 \uC788\uC73C\uBA74 \uC81C\uACF5\uB41C \uC815\uBCF4\uAC00 \uC5C6\uB2E4\uACE0 \uB9D0\uD558\uC138\uC694.',
  '\uB2F5\uBCC0\uC740 \uAC04\uACB0\uD558\uACE0 \uC77D\uAE30 \uC26C\uC6B4 \uD55C\uAD6D\uC5B4\uB85C \uC791\uC131\uD558\uC138\uC694.',
].join('\n')

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function normalizeQuestion(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim()
  return normalized || null
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS })
  if (request.method !== 'POST') return json({ error: '\uD5C8\uC6A9\uB418\uC9C0 \uC54A\uB294 \uC694\uCCAD \uBC29\uC2DD\uC785\uB2C8\uB2E4.' }, 405)

  let body: unknown
  try { body = await request.json() } catch { return json({ error: '\uC694\uCCAD JSON \uD615\uC2DD\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.' }, 400) }

  const question = normalizeQuestion(
    typeof body === 'object' && body !== null && 'question' in body
      ? (body as { question?: unknown }).question
      : undefined,
  )
  if (!question) return json({ error: '\uC9C8\uBB38\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.' }, 400)
  if (question.length > 300) return json({ error: '\uC9C8\uBB38\uC740 300\uC790 \uC774\uD558\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.' }, 400)

  const now = getSeoulToday()
  const matches = searchFestivals(question, { now, limit: 5 })
  const sources = matches.map((item) => toFestivalSource(item, now))
  const fallbackReply = buildSearchOnlyAnswer(matches)

  if (matches.length === 0) return json({ reply: fallbackReply, sources: [], meta: { llmUsed: false, matchedCount: 0, model: null } })

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini'
  if (!apiKey) {
    return json({
      reply: fallbackReply,
      sources,
      meta: { llmUsed: false, matchedCount: sources.length, model: null, warning: 'OPENAI_API_KEY is not configured; search-only fallback was used.' },
    })
  }

  try {
    const client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 1 })
    const response = await client.responses.create({
      model,
      instructions: SYSTEM_INSTRUCTIONS,
      input: ['<user_question>', question, '</user_question>', '<festival_search_results>', JSON.stringify(matches.map(toPromptRecord), null, 2), '</festival_search_results>'].join('\n'),
      max_output_tokens: 500,
      store: false,
    })
    const reply = response.output_text?.trim()
    if (!reply) throw new Error('The model returned an empty response.')
    return json({ reply, sources, meta: { llmUsed: true, matchedCount: sources.length, model } })
  } catch (error) {
    console.error('OpenAI request failed:', error)
    return json({
      reply: fallbackReply,
      sources,
      meta: { llmUsed: false, matchedCount: sources.length, model: null, warning: 'The LLM request failed; search-only fallback was used.' },
    })
  }
}

export const config: Config = {
  path: '/api/chat',
  method: 'POST',
  rateLimit: { windowLimit: 12, windowSize: 60, aggregateBy: ['ip'] },
}

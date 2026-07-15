import { afterEach, describe, expect, it, vi } from 'vitest'
import { askFestivalChat } from '../src/chatbot/api'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('챗봇 브라우저 API', () => {
  it('설정 시간이 지나면 REQUEST_TIMEOUT 오류를 반환한다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => {
      const signal = (init as RequestInit).signal
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })))

    const request = askFestivalChat('/api/chat', '질문', undefined, 10)
    const assertion = expect(request).rejects.toMatchObject({
      status: 408,
      code: 'REQUEST_TIMEOUT',
    })
    await vi.advanceTimersByTimeAsync(10)

    await assertion
  })

  it('질문과 제한된 문맥을 요청 본문에 넣는다', async () => {
    let sentBody = ''
    vi.stubGlobal('fetch', vi.fn((_url, init) => {
      sentBody = String((init as RequestInit).body)
      return Promise.resolve(Response.json({
        reply: '답변', sources: [],
        meta: { mode: 'llm', resultCount: 0, generatedAt: new Date().toISOString() },
      }))
    }))

    await askFestivalChat('/api/chat', '질문', {
      recentMessages: [{ role: 'user', content: '이전 질문' }],
    })

    expect(JSON.parse(sentBody)).toMatchObject({
      question: '질문',
      context: { recentMessages: [{ role: 'user', content: '이전 질문' }] },
    })
  })
})

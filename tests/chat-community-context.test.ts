import { describe, expect, it } from 'vitest'
import { readPublicCommunityContext } from '../src/chatbot/community-context'

class MemoryStorage {
  constructor(private readonly values: Record<string, string>) {}
  getItem(key: string): string | null { return this.values[key] ?? null }
}

describe('공개 커뮤니티 문맥', () => {
  it('비밀번호를 제외하고 길이를 제한한다', () => {
    const stored = Array.from({ length: 22 }, (_, index) => ({
      id: String(index),
      title: `제목 ${index}`,
      content: '가'.repeat(600),
      createdAt: '2026-07-15T00:00:00.000Z',
      password: 'secret',
    }))
    const storage = new MemoryStorage({ posts: JSON.stringify(stored) })

    const result = readPublicCommunityContext('posts', storage)

    expect(result).toHaveLength(20)
    expect(result[0]).not.toHaveProperty('password')
    expect(result[0]?.content).toHaveLength(500)
  })

  it('손상된 저장 데이터에는 빈 배열을 반환한다', () => {
    expect(readPublicCommunityContext('posts', new MemoryStorage({ posts: '{' }))).toEqual([])
  })
})

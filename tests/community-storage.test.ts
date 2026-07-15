import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createCommunityPost,
  deleteCommunityPost,
  fetchCommunityPosts,
  updateCommunityPost,
} from '../src/community/api'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value))
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  clear(): void {
    this.values.clear()
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  get length(): number {
    return this.values.size
  }
}

const STORAGE_KEY = 'localhub-community-posts'

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage())
  vi.stubGlobal('fetch', async () => {
    throw new Error('예상하지 않은 네트워크 요청이 발생했습니다.')
  })
})

describe('브라우저 커뮤니티 저장소', () => {
  it('빈 저장소에서는 서버 요청 없이 빈 게시글 목록을 반환한다', async () => {
    await expect(fetchCommunityPosts(STORAGE_KEY)).resolves.toEqual([])
  })

  it('손상된 저장 데이터는 게시글로 불러오지 않는다', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([null, { title: '불완전한 글' }]))

    await expect(fetchCommunityPosts(STORAGE_KEY)).resolves.toEqual([])
  })

  it('게시글을 등록하고 다시 불러온다', async () => {
    const created = await createCommunityPost(STORAGE_KEY, {
      title: ' 서울 축제 후기 ',
      content: '즐거웠어요.',
      password: '1234',
    })
    const posts = await fetchCommunityPosts(STORAGE_KEY)

    expect(created.title).toBe('서울 축제 후기')
    expect(posts).toHaveLength(1)
    expect(posts[0]?.id).toBe(created.id)
    expect(created).not.toHaveProperty('password')
  })

  it('작성 비밀번호가 일치할 때 게시글을 수정한다', async () => {
    const created = await createCommunityPost(STORAGE_KEY, {
      title: '수정 전',
      content: '내용',
      password: '1234',
    })

    const updated = await updateCommunityPost(STORAGE_KEY, created.id, {
      title: '수정 후',
      content: '바뀐 내용',
      password: '1234',
    })

    expect(updated.title).toBe('수정 후')
    expect((await fetchCommunityPosts(STORAGE_KEY))[0]?.content).toBe('바뀐 내용')
  })

  it('작성 비밀번호로 게시글을 삭제한다', async () => {
    const created = await createCommunityPost(STORAGE_KEY, {
      title: '삭제할 글',
      content: '내용',
      password: '1234',
    })

    await deleteCommunityPost(STORAGE_KEY, created.id, { password: '1234' })

    await expect(fetchCommunityPosts(STORAGE_KEY)).resolves.toEqual([])
  })

  it('비밀번호가 다르면 게시글 수정과 삭제를 거부한다', async () => {
    const created = await createCommunityPost(STORAGE_KEY, {
      title: '보호된 글',
      content: '내용',
      password: '1234',
    })

    await expect(
      updateCommunityPost(STORAGE_KEY, created.id, {
        title: '수정 시도',
        content: '내용',
        password: 'wrong',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PASSWORD' })
    await expect(
      deleteCommunityPost(STORAGE_KEY, created.id, { password: 'wrong' }),
    ).rejects.toMatchObject({ code: 'INVALID_PASSWORD' })
  })
})

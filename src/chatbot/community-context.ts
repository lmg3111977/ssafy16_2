import type { ChatContext } from '../../shared/chat-contract'

interface ReadableStorage {
  getItem(key: string): string | null
}

export function readPublicCommunityContext(
  storageKey: string,
  storage: ReadableStorage | undefined = typeof localStorage === 'undefined'
    ? undefined
    : localStorage,
): NonNullable<ChatContext['communityPosts']> {
  if (!storage) return []

  try {
    const raw = storage.getItem(storageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const posts: NonNullable<ChatContext['communityPosts']> = []
    for (const value of parsed.slice(0, 20)) {
      if (
        typeof value !== 'object' || value === null ||
        !('id' in value) || typeof value.id !== 'string' ||
        !('title' in value) || typeof value.title !== 'string' ||
        !('content' in value) || typeof value.content !== 'string'
      ) continue

      const createdAt = 'createdAt' in value && typeof value.createdAt === 'string'
        ? value.createdAt
        : ''
      posts.push({
        id: value.id.slice(0, 100),
        title: value.title.slice(0, 100),
        content: value.content.slice(0, 500),
        createdAt: createdAt.slice(0, 40),
      })
    }
    return posts
  } catch {
    return []
  }
}

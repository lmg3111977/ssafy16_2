import type {
  CommunityCreateRequest,
  CommunityDeleteRequest,
  CommunityPost,
  CommunityUpdateRequest,
} from '../../shared/community-contract'

export class CommunityApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'CommunityApiError'
    this.status = status
    this.code = code
  }
}

interface StoredCommunityPost extends CommunityPost {
  password: string
}

function isStoredCommunityPost(value: unknown): value is StoredCommunityPost {
  if (typeof value !== 'object' || value === null) return false

  const post = value as Record<string, unknown>
  return (
    typeof post.id === 'string' &&
    typeof post.title === 'string' &&
    typeof post.content === 'string' &&
    typeof post.createdAt === 'string' &&
    typeof post.updatedAt === 'string' &&
    typeof post.password === 'string'
  )
}

function readStoredPosts(storageKey: string): StoredCommunityPost[] {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return []

  try {
    const value = JSON.parse(raw) as unknown
    return Array.isArray(value) ? value.filter(isStoredCommunityPost) : []
  } catch {
    return []
  }
}

function writeStoredPosts(storageKey: string, posts: StoredCommunityPost[]): void {
  localStorage.setItem(storageKey, JSON.stringify(posts))
}

function toPublicPost({ password: _password, ...post }: StoredCommunityPost): CommunityPost {
  return post
}

export async function fetchCommunityPosts(storageKey: string): Promise<CommunityPost[]> {
  return readStoredPosts(storageKey).map(toPublicPost)
}

export async function createCommunityPost(
  storageKey: string,
  body: CommunityCreateRequest,
): Promise<CommunityPost> {
  const now = new Date().toISOString()
  const post: StoredCommunityPost = {
    id: crypto.randomUUID(),
    title: body.title.trim(),
    content: body.content.trim(),
    createdAt: now,
    updatedAt: now,
    password: body.password,
  }

  writeStoredPosts(storageKey, [post, ...readStoredPosts(storageKey)])
  return toPublicPost(post)
}

export async function updateCommunityPost(
  storageKey: string,
  id: string,
  body: CommunityUpdateRequest,
): Promise<CommunityPost> {
  const posts = readStoredPosts(storageKey)
  const index = posts.findIndex((post) => post.id === id)
  if (index === -1) {
    throw new CommunityApiError('해당 게시글을 찾을 수 없습니다.', 404, 'NOT_FOUND')
  }

  const existing = posts[index]
  if (existing.password !== body.password) {
    throw new CommunityApiError('비밀번호가 일치하지 않습니다.', 403, 'INVALID_PASSWORD')
  }

  const updated: StoredCommunityPost = {
    ...existing,
    title: body.title.trim(),
    content: body.content.trim(),
    updatedAt: new Date().toISOString(),
  }
  posts[index] = updated
  writeStoredPosts(storageKey, posts)
  return toPublicPost(updated)
}

export async function deleteCommunityPost(
  storageKey: string,
  id: string,
  body: CommunityDeleteRequest,
): Promise<void> {
  const posts = readStoredPosts(storageKey)
  const index = posts.findIndex((post) => post.id === id)
  if (index === -1) {
    throw new CommunityApiError('해당 게시글을 찾을 수 없습니다.', 404, 'NOT_FOUND')
  }

  if (posts[index].password !== body.password) {
    throw new CommunityApiError('비밀번호가 일치하지 않습니다.', 403, 'INVALID_PASSWORD')
  }

  posts.splice(index, 1)
  writeStoredPosts(storageKey, posts)
}

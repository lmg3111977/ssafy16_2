export type ChatMode = 'llm' | 'fallback' | 'search'

export type LocalHubSourceType =
  | 'festival'
  | 'attraction'
  | 'culture'
  | 'leisure'
  | 'accommodation'
  | 'shopping'
  | 'course'
  | 'community'

export interface LocalHubSource {
  contentId: string
  type: LocalHubSourceType
  title: string
  summary: string | null
  address: string | null
  eventPlace: string | null
  startDate: string | null
  endDate: string | null
  playTime: string | null
  fee: string | null
  ageLimit: string | null
  phone: string | null
  imageUrl: string | null
  longitude: number | null
  latitude: number | null
  status: 'ongoing' | 'upcoming' | 'ended' | 'unknown'
  programExcerpt: string | null
}

export type FestivalSource = LocalHubSource

export interface ChatContext {
  recentMessages?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  sourceIds?: string[]
  communityPosts?: Array<{
    id: string
    title: string
    content: string
    createdAt: string
  }>
}

export interface FestivalChatRequest {
  question: string
  context?: ChatContext
}

export interface FestivalChatResponse {
  reply: string
  sources: LocalHubSource[]
  meta: {
    mode: ChatMode
    model?: string
    requestId?: string
    resultCount: number
    generatedAt: string
  }
  warning?: string
}

export interface FestivalChatErrorBody {
  error?: string
  code?: string
}

export type ChatMode = 'llm' | 'fallback' | 'search'

export interface FestivalSource {
  contentId: string
  title: string
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

export interface FestivalChatRequest {
  question: string
}

export interface FestivalChatResponse {
  reply: string
  sources: FestivalSource[]
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

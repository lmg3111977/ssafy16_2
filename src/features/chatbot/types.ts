export type ChatRole = 'assistant' | 'user'
export type ChatMode = 'llm' | 'search'

export interface FestivalSource {
  contentId: string
  title: string
  address: string | null
  eventPlace: string | null
  startDate: string | null
  endDate: string | null
  playtime: string | null
  fee: string | null
  ageLimit: string | null
  phone: string | null
  longitude: number | null
  latitude: number | null
  status: 'ongoing' | 'upcoming' | 'ended' | 'unknown'
}

export interface ChatResponseMeta {
  llmUsed: boolean
  matchedCount: number
  model: string | null
  warning?: string
}

export interface ChatApiResponse {
  reply: string
  sources: FestivalSource[]
  meta: ChatResponseMeta
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  sources?: FestivalSource[]
  mode?: ChatMode
  warning?: string
  isError?: boolean
}
